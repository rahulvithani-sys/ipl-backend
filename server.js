console.log("SERVER STARTING");

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
const userRoutes = require("./routes/users");
const matchRoutes = require("./routes/matches");
const pickRoutes = require("./routes/picks");
const balanceRoutes = require("./routes/balance");
const leaderboardRoutes = require("./routes/leaderboard");
const resultRoutes = require("./routes/results");
const defaultRoutes = require("./routes/defaults");
const historyRoutes = require("./routes/history");
const authRoutes = require("./routes/auth");

app.use("/auth", authRoutes);

app.use("/defaults", defaultRoutes);
app.use("/results", resultRoutes);
app.use("/history", historyRoutes);
app.use("/leaderboard", leaderboardRoutes);

app.use("/balance", balanceRoutes);

app.use("/picks", pickRoutes);
app.use("/matches", matchRoutes);

app.use("/pool", require("./routes/pool"));
app.use("/users", userRoutes);
app.get("/", (req, res) => {
   console.log("Base ROUTE HIT");  
  res.send("IPL Game API Running");
});

app.get("/hello", (req, res) => {
    console.log("HELLO ROUTE HIT");
  res.send("Hello Rahul");
});

app.get("/testdb", async (req, res) => {
  try {
    console.log("Test DB route hit");
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.send("Database error");
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});