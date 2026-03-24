const { Pool } = require("pg");

const pool = new Pool({
 user: "postgres",
 host: "localhost",
 database: "ipl_game",
 password: "7893",
 port: 5432,
});

module.exports = pool;