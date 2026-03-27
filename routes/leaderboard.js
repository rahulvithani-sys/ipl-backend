const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/phase/:phase", async (req, res) => {

  const { phase } = req.params;

  try {

    const result = await pool.query(
  `SELECT 
    u.id,
    u.name,
    ROUND(SUM(ump.points + 10), 2) as total_points
   FROM user_match_points ump
   JOIN users u ON u.id = ump.user_id
   JOIN matches m ON m.id = ump.match_id
   WHERE m.phase = $1
   GROUP BY u.id, u.name
   ORDER BY total_points DESC`,
  [phase]
);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }

});

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        ROUND(u.balance, 2) as balance,
        COALESCE(SUM(ump.points + 10), 0) as total_points,
        COUNT(*) FILTER (WHERE ump.points >= -10) AS wins
       FROM users u
       LEFT JOIN user_match_points ump 
         ON u.id = ump.user_id
       GROUP BY u.id, u.name, u.balance
       ORDER BY total_points DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }

});

module.exports = router;