const pool = require("../db");

const assignDefaults = async (match_id) => {

  try {

    // 1️⃣ Get match teams
    const matchRes = await pool.query(
      `SELECT team1, team2 FROM matches WHERE id=$1`,
      [match_id]
    );

    const { team1, team2 } = matchRes.rows[0];

    // 2️⃣ Get all users
    const usersRes = await pool.query(`SELECT id FROM users`);
    const users = usersRes.rows;

    for (const user of users) {

      const userId = user.id;

      // 3️⃣ Check if user already picked
      const existing = await pool.query(
        `SELECT id FROM picks
         WHERE user_id=$1 AND match_id=$2`,
        [userId, match_id]
      );

      if (existing.rows.length > 0) continue;

      // 4️⃣ Get user defaults (ordered)
      const defaultsRes = await pool.query(
        `SELECT team FROM user_defaults
         WHERE user_id=$1
         ORDER BY position ASC`,
        [userId]
      );

      const defaults = defaultsRes.rows.map(d => d.team);

      let selectedTeam = null;

      // 5️⃣ Pick first matching team
      for (let team of defaults) {

        if (team === team1 || team === team2) {
          selectedTeam = team;
          break;
        }
      }

      // fallback (should not happen ideally)
      if (!selectedTeam) {
        selectedTeam = team1;
      }

      // 6️⃣ Insert default pick
      await pool.query(
        `INSERT INTO picks(user_id,match_id,team_selected,is_default)
         VALUES($1,$2,$3,true)`,
        [userId, match_id, selectedTeam]
      );

    }

  } catch (err) {

    console.error("Default Picker Error:", err);

  }

};

module.exports = assignDefaults;