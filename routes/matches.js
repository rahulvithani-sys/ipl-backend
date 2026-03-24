const express = require("express");
const router = express.Router();
const pool = require("../db");

// ✅ ADD MATCH (Admin)
router.post("/add", async (req, res) => {
  try {
    const { match_number, team1, team2, start_time, phase } = req.body;

    const result = await pool.query(
      `INSERT INTO matches(match_number,team1,team2,start_time,phase)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [match_number, team1, team2, start_time, phase]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.send("Error adding match");
  }
});

router.get("/pending", async (req, res) => {

  const result = await pool.query(
    `SELECT *
     FROM matches
     WHERE winner IS NULL
       AND status = 'pending'
     ORDER BY start_time`
  );

  res.json(result.rows);
});

router.get("/completed", async (req, res) => {

  const result = await pool.query(
    `SELECT *
     FROM matches
     WHERE status = 'completed'
     ORDER BY start_time DESC`
  );

  res.json(result.rows);
});

router.get("/upcoming", async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT *
       FROM matches
       WHERE start_time > NOW()
       ORDER BY start_time
       LIMIT 5`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.send("Error fetching matches");
  }
});



// ✅ GET NEXT MATCH (User dashboard)
router.get("/next", async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT *
       FROM matches
       WHERE start_time > NOW()
       ORDER BY start_time
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.send("Error fetching match");
  }
});

module.exports = router;