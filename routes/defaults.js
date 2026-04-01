const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/set", async (req, res) => {

  const { user_id, teams } = req.body;

  try {

    //console.log("Teams received",teams);

    await pool.query("BEGIN");

    // 1️⃣ Validate length
    if (!teams || teams.length !== 10) {
      await pool.query("ROLLBACK");
      return res.send("Exactly 10 teams required");
    }

    // 2️⃣ Validate uniqueness
    const unique = new Set(teams);
    if (unique.size !== 10) {
      await pool.query("ROLLBACK");
      return res.send("Duplicate teams not allowed");
    }

    // 3️⃣ OPTIONAL: Phase lock check (can enable later)
    // const phaseCheck = await pool.query(
    //   `SELECT current_phase FROM game_state`
    // );
    // if (phaseCheck.rows[0].current_phase_locked) {
    //   await pool.query("ROLLBACK");
    //   return res.send("Defaults locked for this phase");
    // }

    // 4️⃣ Delete old defaults
    await pool.query(
      `DELETE FROM user_defaults WHERE user_id=$1`,
      [user_id]
    );

    // 5️⃣ Insert new defaults
    for (let i = 0; i < teams.length; i++) {

      await pool.query(
        `INSERT INTO user_defaults(user_id,position,team)
         VALUES($1,$2,$3)`,
        [user_id, i + 1, teams[i]]
      );

    }

    await pool.query("COMMIT");

    res.send("Defaults saved successfully");

  } catch (err) {

    await pool.query("ROLLBACK");

    console.error(err);
    res.send("Error saving defaults");

  }

});

// GET current defaults
router.get("/:userId", async (req, res) => {
const { userId } = req.params;

try {
const result = await pool.query(
"SELECT team FROM user_defaults WHERE user_id = $1 ORDER BY priority ASC",
[userId]
);

// if no defaults found → return empty array (IMPORTANT)
return res.json(result.rows.map(r => r.team));

} catch (err) {
console.error(err);
res.status(500).json({ error: "Failed to fetch defaults" });
}
});

module.exports = router;