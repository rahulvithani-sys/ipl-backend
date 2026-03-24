const express = require("express");
const router = express.Router();
const pool = require("../db");
const assignDefaults = require("../controllers/defaultPicker");


// ==========================
// 🚫 ABANDON MATCH
// ==========================
router.post("/abandon", async (req, res) => {

  const { match_id } = req.body;

  try {

    await pool.query("BEGIN");

    const match = await pool.query(
      `SELECT * FROM matches WHERE id=$1`,
      [match_id]
    );

    if (match.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.send("Match not found");
    }

    if (match.rows[0].status === "completed") {
      await pool.query("ROLLBACK");
      return res.send("Already completed");
    }

    // refund all users
    const users = await pool.query(`SELECT id FROM users`);

    for (const u of users.rows) {

      await pool.query(
        `UPDATE users
         SET balance = balance + 60
         WHERE id=$1`,
        [u.id]
      );

      await pool.query(
        `INSERT INTO transactions(user_id,match_id,type,amount)
         VALUES($1,$2,'refund',60)`,
        [u.id, match_id]
      );
    }

    // update match
    await pool.query(
      `UPDATE matches 
       SET status='abandoned', is_locked=true
       WHERE id=$1`,
      [match_id]
    );

    await pool.query("COMMIT");

    res.send("Match abandoned & refunded");

  } catch (err) {

    await pool.query("ROLLBACK");
    console.error(err);
    res.send("Error processing abandoned match");

  }

});


// ==========================
// 🔁 ROLLBACK MATCH
// ==========================
router.post("/rollback", async (req, res) => {

  const { match_id } = req.body;

  try {

    await pool.query("BEGIN");

    const match = await pool.query(
      `SELECT * FROM matches WHERE id=$1`,
      [match_id]
    );

    if (match.rows.length === 0) {
  await pool.query("ROLLBACK");
  return res.status(404).json({
    success: false,
    message: "Match not found"
  });
}

if (match.rows[0].winner === null) {
  await pool.query("ROLLBACK");
  return res.status(400).json({
    success: false,
    message: "No result to rollback"
  });
}

    // 🔹 Reverse balances
    const txns = await pool.query(
      `SELECT * FROM transactions WHERE match_id=$1`,
      [match_id]
    );

    for (const txn of txns.rows) {
      await pool.query(
        `UPDATE users
         SET balance = balance - $1
         WHERE id=$2`,
        [txn.amount, txn.user_id]
      );
    }

    // 🔹 Delete transactions
    await pool.query(
      `DELETE FROM transactions WHERE match_id=$1`,
      [match_id]
    );

    // 🔹 Delete match points
    await pool.query(
      `DELETE FROM user_match_points WHERE match_id=$1`,
      [match_id]
    );

    // 🔹 Reverse pools
    const totalUsersRes = await pool.query(`SELECT COUNT(*) FROM users`);
    const totalUsers = parseInt(totalUsersRes.rows[0].count);

    await pool.query(
      `UPDATE phase_pools
       SET total_points = total_points - $1
       WHERE phase=$2`,
      [totalUsers * 5, match.rows[0].phase]
    );

    await pool.query(
      `UPDATE grand_pool
       SET total_points = total_points - $1`,
      [totalUsers * 5]
    );

    // 🔹 Reset match
    await pool.query(
      `UPDATE matches
       SET winner=NULL,
           status='pending',
           is_locked=false
       WHERE id=$1`,
      [match_id]
    );

    await pool.query("COMMIT");

    res.send("✅ Rollback successful");

  } catch (err) {

    await pool.query("ROLLBACK");
    console.error(err);
    res.send("Error in rollback");

  }

});


// ==========================
// 🏆 PROCESS RESULT
// ==========================
router.post("/process", async (req, res) => {

  const { match_id, winner } = req.body;

  try {

    await pool.query("BEGIN");

    // 🔹 Fetch match
    const matchRes = await pool.query(
      `SELECT * FROM matches WHERE id=$1`,
      [match_id]
    );

    if (matchRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.send("Match not found");
    }

    const match = matchRes.rows[0];

    // ❌ Duplicate check
    if (match.winner !== null) {
      await pool.query("ROLLBACK");
      return res.send("❌ Match already processed");
    }

    // 🔒 Lock check
    if (match.is_locked) {
      await pool.query("ROLLBACK");
      return res.send("🔒 Match is locked");
    }

    const phase = match.phase;

    // 🔹 Assign defaults
    await assignDefaults(match_id);

    // 🔹 Picks
    const picksRes = await pool.query(
      `SELECT * FROM picks WHERE match_id=$1`,
      [match_id]
    );

    const picks = picksRes.rows;

    // 🔹 All users
    const usersRes = await pool.query(`SELECT id FROM users`);
    const allUsers = usersRes.rows;

    // 🔹 Map picks
    const pickMap = {};
    picks.forEach(p => {
      pickMap[p.user_id] = p;
    });

    const matchPlayers = picks.length;
    const matchPot = matchPlayers * 50;

    const winners = picks.filter(
      p => p.team_selected === winner
    );

    const winAmount =
      winners.length > 0 ? matchPot / winners.length : 0;

    const totalUsers = allUsers.length;

    // 🔹 Process users
    for (const user of allUsers) {

      const userId = user.id;
      const userPick = pickMap[userId];

      let net = -60;

      if (userPick && userPick.team_selected === winner) {
        net = winAmount - 60;
      }

      const balanceRes = await pool.query(
        `UPDATE users
         SET balance = balance + $1
         WHERE id=$2
         RETURNING balance`,
        [net, userId]
      );

      const newBalance = balanceRes.rows[0].balance;

      await pool.query(
        `INSERT INTO user_match_points(user_id, match_id, points, balance_after)
         VALUES($1,$2,$3,$4)`,
        [userId, match_id, net, newBalance]
      );

      await pool.query(
        `INSERT INTO transactions(user_id,match_id,type,amount)
         VALUES($1,$2,'net',$3)`,
        [userId, match_id, net]
      );
    }

    // 🔹 Update pools
    await pool.query(
      `INSERT INTO phase_pools(phase, total_points)
       VALUES($1,$2)
       ON CONFLICT (phase)
       DO UPDATE SET total_points = phase_pools.total_points + $2`,
      [phase, totalUsers * 5]
    );

    await pool.query(
      `UPDATE grand_pool
       SET total_points = total_points + $1`,
      [totalUsers * 5]
    );

    // 🔹 Final update
    await pool.query(
      `UPDATE matches
       SET winner=$1,
           status='completed',
           is_locked=true
       WHERE id=$2`,
      [winner, match_id]
    );

    await pool.query("COMMIT");

    res.send("✅ Match processed successfully");

  } catch (err) {

    await pool.query("ROLLBACK");
    console.error(err);
    res.send("Error processing match");

  }

});

module.exports = router;