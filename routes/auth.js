const express = require("express");
const router = express.Router();
const pool = require("../db");


// ================= REGISTER =================
router.post("/register", async (req, res) => {

const { mobile, name, password, defaults } = req.body;

try {

await pool.query("BEGIN");

// 🔹 Check existing user
const existing = await pool.query(
`SELECT * FROM users WHERE mobile=$1`,
[mobile]
);

if (existing.rows.length > 0) {
await pool.query("ROLLBACK");
return res.status(400).json({ message: "User already exists" });
}

// 🔹 Create user
const userRes = await pool.query(
`INSERT INTO users(mobile,name,password,balance)
VALUES($1,$2,$3,1500)
RETURNING id`,
[mobile, name, password]
);

const userId = userRes.rows[0].id;

// 🔹 INSERT DEFAULTS (FIX HERE)
if (defaults && defaults.length === 10) {

const unique = new Set(defaults);
if (unique.size !== 10) {
await pool.query("ROLLBACK");
return res.status(400).json({ message: "Defaults cannot repeat" });
}

for (let i = 0; i < defaults.length; i++) {
await pool.query(
`INSERT INTO user_defaults(user_id, team, position)
VALUES($1,$2,$3)`,
[userId, defaults[i], i + 1]
);
}
}

await pool.query("COMMIT");

res.json({ message: "User registered successfully" });

} catch (err) {

await pool.query("ROLLBACK");
console.error(err);

res.status(500).json({ message: "Registration failed" });
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