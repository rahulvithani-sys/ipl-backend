const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/:user_id", async (req, res) => {

  const { user_id } = req.params;

  try {

    const result = await pool.query(
      `SELECT * FROM picks WHERE user_id=$1`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json([]); // ✅ always return array
  }

});


router.post("/submit", async (req, res) => {

  const { user_id, match_id, team } = req.body;

  try {

    // get match start time
    const match = await pool.query(
      "SELECT start_time FROM matches WHERE id=$1",
      [match_id]
    );

    if (match.rows.length === 0) {
      return res.send("Match not found");
    }

    const startTime = new Date(match.rows[0].start_time);

    if (new Date() > startTime) {
      return res.send("Match already started. Pick locked.");
    }

    // check existing pick
    const existingPick = await pool.query(
      "SELECT id FROM picks WHERE user_id=$1 AND match_id=$2",
      [user_id, match_id]
    );

    if (existingPick.rows.length > 0) {

      // update existing pick
      const updated = await pool.query(
        `UPDATE picks
         SET team_selected=$1
         WHERE user_id=$2 AND match_id=$3
         RETURNING *`,
        [team, user_id, match_id]
      );

      return res.json(updated.rows[0]);

    } else {

      // insert new pick
      const result = await pool.query(
        `INSERT INTO picks(user_id,match_id,team_selected)
         VALUES($1,$2,$3)
         RETURNING *`,
        [user_id, match_id, team]
      );

      return res.json(result.rows[0]);
    }

  } catch (err) {

    console.error(err);
    res.send("Error submitting pick");

  }

});

module.exports = router;