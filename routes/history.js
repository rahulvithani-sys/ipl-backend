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
        m.start_time,

        ump.points,

        CASE 
          WHEN ump.points >= -10 THEN 'WIN'
          ELSE 'LOSS'
        END AS result,

        (ump.points + 10) AS net_amount

       FROM picks p
       JOIN matches m ON p.match_id = m.id
       JOIN user_match_points ump 
         ON ump.match_id = m.id 
         AND ump.user_id = p.user_id

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