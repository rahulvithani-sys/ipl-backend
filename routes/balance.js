const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/:user_id", async (req, res) => {

  const { user_id } = req.params;

  try {

    const result = await pool.query(
      `SELECT balance FROM users WHERE id=$1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.json({ balance: 0 });
    }

    res.json({ balance: result.rows[0].balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ balance: 0 });
  }

});

module.exports = router;