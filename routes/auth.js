const express = require("express");
const router = express.Router();
const pool = require("../db");


// ================= REGISTER =================
router.post("/register", async (req, res) => {

  const { mobile, name, password } = req.body;

  try {

    // check existing
    const existing = await pool.query(
      "SELECT * FROM users WHERE mobile=$1",
      [mobile]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await pool.query(
      `INSERT INTO users(mobile,name,password,balance)
       VALUES($1,$2,$3,1000)
       RETURNING *`,
      [mobile, name, password]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering" });
  }

});


// ================= LOGIN =================
router.post("/login", async (req, res) => {

  const { mobile, password } = req.body;

  try {

    const user = await pool.query(
      `SELECT * FROM users 
       WHERE mobile=$1 AND password=$2`,
      [mobile, password]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json(user.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error" });
  }

});

module.exports = router;