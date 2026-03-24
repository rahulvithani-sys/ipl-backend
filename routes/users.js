const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/register", async (req, res) => {
  try {
    const { name, mobile } = req.body;

    const result = await pool.query(
      "INSERT INTO users(name,mobile,balance) VALUES($1,$2,1000) RETURNING *",
      [name, mobile]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.send("Error registering user");
  }
});

module.exports = router;