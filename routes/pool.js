const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT 
        (SELECT SUM(total_points) FROM phase_pools) as phase_pool,
        (SELECT SUM(total_points) FROM grand_pool) as grand_pool`
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({});
  }

});

module.exports = router;