const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/:user_id", async (req, res) => {

  const { user_id } = req.params;

  try {

    const result = await pool.query(
      `SELECT 
        m.team1,
        m.team2,
        m.winner,
        p.team_selected,
        p.is_default,
        m.start_time
       FROM picks p
       JOIN matches m ON p.match_id = m.id
       WHERE p.user_id = $1
       AND m.winner IS NOT NULL
       ORDER BY m.start_time DESC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }

});

module.exports = router;