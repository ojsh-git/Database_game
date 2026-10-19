require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

const ADMIN_USER_ID = 1;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// In-memory tokens expire after 2 hours and are invalidated on restart.
const adminSessions = new Map();
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function cleanExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) {
      adminSessions.delete(token);
    }
  }
}

function requireAdmin(req, res, next) {
  cleanExpiredSessions();

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const session = adminSessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    return res.status(401).json({
      error: "Admin login required. Please sign in again."
    });
  }

  req.adminUserId = session.userId;
  next();
}

function comparePasswords(provided, expected) {
  const providedBuffer = Buffer.from(String(provided));
  const expectedBuffer = Buffer.from(String(expected));

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function mapStatusToDatabase(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "open" || normalized === "registration_open") {
    return "registration_open";
  }

  if (normalized === "upcoming") {
    return "upcoming";
  }

  if (normalized === "ongoing") {
    return "ongoing";
  }

  if (normalized === "completed") {
    return "completed";
  }

  if (normalized === "cancelled") {
    return "cancelled";
  }

  return null;
}
// ===== PLAYER ACCOUNTS + SESSIONS =====
const USER_SESSION_DAYS = 7;

// scrypt is built into Node, so no new package is needed.
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (error, derived) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derived.toString("hex")}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise(resolve => {
    const parts = String(stored || "").split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return resolve(false);
    const [, salt, hashHex] = parts;
    const expected = Buffer.from(hashHex, "hex");
    crypto.scrypt(password, salt, expected.length, (error, derived) => {
      if (error || derived.length !== expected.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derived, expected));
    });
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createUserSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.execute("DELETE FROM user_sessions WHERE expires_at <= NOW()");
  await pool.execute(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${USER_SESSION_DAYS} DAY))`,
    [hashToken(token), userId]
  );
  return token;
}

function publicUser(row) {
  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    memberSince: row.created_at
  };
}

// Player token comes in the X-User-Token header (Authorization = admin).
async function requireUser(req, res, next) {
  const token = String(req.headers["x-user-token"] || "");
  if (!token) {
    return res.status(401).json({ error: "Please log in to continue." });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.username, u.email, u.role, u.created_at
       FROM user_sessions s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW()
       LIMIT 1`,
      [hashToken(token)]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
    req.user = rows[0];
    req.userTokenHash = hashToken(token);
    next();
  } catch (error) {
    console.error("Session check error:", error.code, error.message);
    res.status(500).json({ error: "Could not verify your session." });
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", backend: "running" });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name, 1 AS connection_ok"
    );

    res.json({
      status: "ok",
      backend: "running",
      database: "connected",
      databaseName: rows[0].database_name
    });
  } catch (error) {
    console.error("MySQL diagnostic:", error.code, error.message);

    res.status(500).json({
      error: "Database connection failed",
      code: error.code || "UNKNOWN_ERROR"
    });
  }
});

// Admin password login
app.post("/api/admin/login", async (req, res) => {
  try {
    if (!ADMIN_PASSWORD) {
      return res.status(500).json({
        error: "ADMIN_PASSWORD is not configured in backend/.env."
      });
    }

    const password = req.body?.password;

    if (typeof password !== "string" || !comparePasswords(
      password,
      ADMIN_PASSWORD
    )) {
      return res.status(401).json({
        error: "Incorrect admin password."
      });
    }

    const [admins] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'admin' LIMIT 1",
      [ADMIN_USER_ID]
    );

    if (admins.length === 0) {
      return res.status(403).json({
        error: "The configured admin account was not found."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    adminSessions.set(token, {
      userId: admins[0].user_id,
      expiresAt: Date.now() + SESSION_DURATION_MS
    });

    res.json({
      message: "Admin login successful.",
      token,
      expiresInSeconds: SESSION_DURATION_MS / 1000
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({ error: "Admin login failed." });
  }
});
// Create account → INSERT INTO users
app.post("/api/auth/signup", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "Username must be 3–30 characters." });
  }
  if (!/^[A-Za-z0-9 _.-]+$/.test(username)) {
    return res.status(400).json({ error: "Username can use letters, numbers, spaces, _ . and - only." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'player')`,
      [username, email, passwordHash]
    );
    const [rows] = await pool.execute(
      "SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?",
      [result.insertId]
    );
    const token = await createUserSession(result.insertId);
    res.status(201).json({ token, user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const field = /email/i.test(error.message) ? "email" : "username";
      return res.status(409).json({ error: `That ${field} is already taken.` });
    }
    console.error("Signup error:", error.code, error.message);
    res.status(500).json({ error: "Could not create the account." });
  }
});

// Login with username or email
app.post("/api/auth/login", async (req, res) => {
  const login = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!login || !password) {
    return res.status(400).json({ error: "Enter your username and password." });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT user_id, username, email, role, created_at, password_hash
       FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [login, login.toLowerCase()]
    );
    const valid = rows.length > 0 && await verifyPassword(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    const token = await createUserSession(rows[0].user_id);
    res.json({ token, user: publicUser(rows[0]) });
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    res.status(500).json({ error: "Login failed." });
  }
});

// Logout → delete the session row
app.post("/api/auth/logout", requireUser, async (req, res) => {
  try {
    await pool.execute("DELETE FROM user_sessions WHERE token_hash = ?", [req.userTokenHash]);
  } catch (error) {
    console.error("Logout error:", error.code, error.message);
  }
  res.json({ message: "Logged out." });
});

// Who is logged in?
app.get("/api/auth/me", requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Profile details + stats
app.get("/api/me/profile", requireUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [players] = await pool.execute(
      "SELECT gamer_tag, full_name, country FROM players WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const [statsRows] = await pool.execute(
      `SELECT
         COUNT(*) AS totalEntries,
         COUNT(DISTINCT e.tournament_id) AS tournamentsJoined,
         COALESCE(SUM(t.start_date >= CURDATE()), 0) AS upcomingEntries
       FROM tournament_entries e
       JOIN tournaments t ON t.tournament_id = e.tournament_id
       WHERE e.user_id = ?`,
      [userId]
    );
    const s = statsRows[0];
    res.json({
      user: publicUser(req.user),
      player: players[0] || null,
      stats: {
        totalEntries: Number(s.totalEntries) || 0,
        tournamentsJoined: Number(s.tournamentsJoined) || 0,
        upcomingEntries: Number(s.upcomingEntries) || 0
      }
    });
  } catch (error) {
    console.error("Profile error:", error.code, error.message);
    res.status(500).json({ error: "Could not load your profile." });
  }
});

// List tournaments and their real registration counts
app.get("/api/tournaments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.tournament_id AS id,
        t.name AS name,
        g.game_name AS game,
        t.prize_pool AS prize,
        t.max_participants AS slots,
        t.start_date AS date,
        t.status AS db_status,
        t.competitor_type AS competitor_type,
        t.format AS format,
        t.end_date AS end_date,
        (
          (SELECT COUNT(*) FROM registrations r
            WHERE r.tournament_id = t.tournament_id
              AND r.status IN ('registered', 'confirmed'))
          +
          (SELECT COUNT(*) FROM tournament_entries e
            WHERE e.tournament_id = t.tournament_id)
        ) AS registered
      FROM tournaments t
      JOIN games g ON g.game_id = t.game_id
      ORDER BY t.start_date ASC
      LIMIT 100
    `);

    res.json(rows);
  } catch (error) {
    console.error("Tournament query error:", error.message);
    res.status(500).json({ error: "Could not load tournaments." });
  }
});

// Create a tournament: requires a valid admin session
app.post("/api/tournaments", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      game,
      prize,
      slots,
      date,
      status,
      competitorType
    } = req.body || {};

    const tournamentType = String(competitorType || "").trim().toLowerCase();

    const tournamentName = String(name || "").trim();
    const gameName = String(game || "").trim();
    const prizePool = Number(prize);
    const maxParticipants = Number(slots);
    const startDate = String(date || "").trim();
    const databaseStatus = mapStatusToDatabase(status);

    if (!tournamentName || tournamentName.length > 150) {
      return res.status(400).json({
        error: "Tournament name must contain 1–150 characters."
      });
    }

    if (!gameName) {
      return res.status(400).json({ error: "Please select a game." });
    }

    if (!["solo", "duo", "squad"].includes(tournamentType)) {
      return res.status(400).json({ error: "Choose Solo, Duo or Squad." });
    }

    if (!Number.isFinite(prizePool) || prizePool < 0) {
      return res.status(400).json({
        error: "Prize pool must be zero or greater."
      });
      
    }

    if (
      !Number.isInteger(maxParticipants) ||
      maxParticipants < 2 ||
      maxParticipants > 5000
    ) {
      return res.status(400).json({
        error: "Slots must be a whole number between 2 and 5000."
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({
        error: "Please provide a valid tournament date."
      });
    }

    const parsedDate = new Date(`${startDate}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== startDate
    ) {
      return res.status(400).json({ error: "Invalid tournament date." });
    }

    if (!databaseStatus) {
      return res.status(400).json({
        error: "Choose Open or Upcoming. Full is determined by capacity."
      });
    }

    if (!["upcoming", "registration_open"].includes(databaseStatus)) {
      return res.status(400).json({
        error: "New tournaments must be Open or Upcoming."
      });
    }

    const [games] = await pool.execute(
      "SELECT game_id FROM games WHERE game_name = ? LIMIT 1",
      [gameName]
    );

    if (games.length === 0) {
      return res.status(400).json({
        error: `Game "${gameName}" is not in the games table.`
      });
    }

    const [admins] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'admin' LIMIT 1",
      [req.adminUserId]
    );

    if (admins.length === 0) {
      return res.status(403).json({ error: "Admin account is no longer valid." });
    }

    const [result] = await pool.execute(
      `INSERT INTO tournaments
        (game_id, created_by, name, format, competitor_type,
         max_participants, prize_pool, start_date, end_date, status)
       VALUES (?, ?, ?, 'single_elimination', ?, ?, ?, ?, ?, ?)`,
      [
        games[0].game_id,
        req.adminUserId,
        tournamentName,
        tournamentType,
        maxParticipants,
        prizePool,
        startDate,
        startDate,
        databaseStatus
      ]
    );

    res.status(201).json({
      message: "Tournament saved to MySQL.",
      id: result.insertId
    });
  } catch (error) {
    console.error("Tournament creation error:", error.code, error.message);

    res.status(500).json({
      error: "Could not save tournament to MySQL.",
      code: error.code || "UNKNOWN_ERROR"
    });
  }
});

// Register an existing player or team for a tournament
// app.post("/api/tournaments/:id/register", async (req, res) => {
//   const connection = await pool.getConnection();

//   try {
//     const tournamentId = Number(req.params.id);
//     const playerName = String(req.body?.playerName || "").trim();
//     const teamName = String(req.body?.teamName || "").trim();

//     if (!Number.isInteger(tournamentId) || tournamentId < 1) {
//       return res.status(400).json({ error: "Invalid tournament ID." });
//     }

//     if (!playerName) {
//       return res.status(400).json({
//         error: "Enter your player name or gamer tag."
//       });
//     }

//     await connection.beginTransaction();

//     const [tournaments] = await connection.execute(
//       `SELECT tournament_id, max_participants, status, competitor_type
//        FROM tournaments
//        WHERE tournament_id = ?
//        FOR UPDATE`,
//       [tournamentId]
//     );

//     if (tournaments.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ error: "Tournament not found." });
//     }

//     const tournament = tournaments[0];

//     if (tournament.status !== "registration_open") {
//       await connection.rollback();
//       return res.status(400).json({
//         error: "Registration is not open for this tournament."
//       });

//     }
//         if (tournament.competitor_type === "team" && !teamName) {
//       await connection.rollback();
//       return res.status(400).json({
//         error: "This is a team tournament. Enter your existing team name."
//       });
//     }

//     if (tournament.competitor_type !== "team" && teamName) {
//       await connection.rollback();
//       return res.status(400).json({
//         error: "This is a solo tournament. Leave the team name empty."
//       });
//     }

//     const [countRows] = await connection.execute(
//       `SELECT COUNT(*) AS total
//        FROM registrations
//        WHERE tournament_id = ?
//        AND status IN ('registered', 'confirmed')`,
//       [tournamentId]
//     );

//     if (Number(countRows[0].total) >= tournament.max_participants) {
//       await connection.rollback();
//       return res.status(400).json({
//         error: "This tournament has reached its registration limit."
//       });
//     }

//     let playerId = null;
//     let teamId = null;

//     if (teamName) {
//       const [teams] = await connection.execute(
//         "SELECT team_id FROM teams WHERE LOWER(team_name) = LOWER(?) LIMIT 2",
//         [teamName]
//       );

//       if (teams.length === 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           error: "Team not found. Enter an existing team name exactly."
//         });
//       }

//       teamId = teams[0].team_id;
//     } else {
//       const [players] = await connection.execute(
//         `SELECT player_id
//          FROM players
//          WHERE LOWER(gamer_tag) = LOWER(?)
//             OR LOWER(full_name) = LOWER(?)
//          LIMIT 2`,
//         [playerName, playerName]
//       );

//       if (players.length === 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           error: "Player not found. Use an existing gamer tag, such as ShadowX."
//         });
//       }

//       if (players.length > 1) {
//         await connection.rollback();
//         return res.status(409).json({
//           error: "That name matches multiple players. Please use your unique gamer tag."
//         });
//       }

//       playerId = players[0].player_id;
//     }

//     const [existing] = await connection.execute(
//       `SELECT registration_id
//        FROM registrations
//        WHERE tournament_id = ?
//          AND (
//            (? IS NOT NULL AND player_id = ?)
//            OR (? IS NOT NULL AND team_id = ?)
//          )
//          AND status IN ('registered', 'confirmed')
//        LIMIT 1`,
//       [tournamentId, playerId, playerId, teamId, teamId]
//     );

//     if (existing.length > 0) {
//       await connection.rollback();
//       return res.status(409).json({
//         error: "This player or team is already registered."
//       });
//     }

//     await connection.execute(
//       `INSERT INTO registrations
//         (tournament_id, player_id, team_id, status)
//        VALUES (?, ?, ?, 'registered')`,
//       [tournamentId, playerId, teamId]
//     );

//     await connection.commit();

//     res.status(201).json({
//       message: "Registration saved successfully.",
//       tournamentId,
//       registeredAs: teamId ? "team" : "player"
//     });
//     } catch (error) {
//     await connection.rollback().catch(() => {});
//     console.error("Registration error:", error.code, error.message);

//     if (res.headersSent) return;

//     // Messages raised by your DB triggers (SIGNAL) are user-facing rules.
//     if (error.code === "ER_SIGNAL_EXCEPTION") {
//       return res.status(400).json({ error: error.sqlMessage || error.message });
//     }

//     return res.status(500).json({
//       error: "Could not save registration to MySQL.",
//       code: error.code || "UNKNOWN_ERROR"
//     });
//   } finally {
//     connection.release();
//   }
// });
// Register anyone for any open tournament. Free-text names, unlimited entries.
app.post("/api/tournaments/:id/register", requireUser, async (req, res) => {
  const tournamentId = Number(req.params.id);
  const playerName = String(req.body?.playerName || "").trim();
  const teamName = String(req.body?.teamName || "").trim();
  const entryType = String(req.body?.entryType || "solo").trim().toLowerCase();

  if (!Number.isInteger(tournamentId) || tournamentId < 1) {
    return res.status(400).json({ error: "Invalid tournament ID." });
  }

  if (!playerName || playerName.length > 50) {
    return res.status(400).json({ error: "Enter a player name (1–50 characters)." });
  }

  if (teamName.length > 50) {
    return res.status(400).json({ error: "Team name must be 50 characters or fewer." });
  }

  if (!["solo", "duo", "squad"].includes(entryType)) {
    return res.status(400).json({ error: "Choose Solo, Duo or Squad." });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock the tournament row so two people can't take the last slot together.
    const [rows] = await connection.execute(
      `SELECT tournament_id, max_participants, status
       FROM tournaments
       WHERE tournament_id = ?
       FOR UPDATE`,
      [tournamentId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Tournament not found." });
    }

    const tournament = rows[0];

    if (tournament.status !== "registration_open") {
      await connection.rollback();
      return res.status(400).json({ error: "Registration is not open for this tournament." });
    }

    const [countRows] = await connection.execute(
      `SELECT
         (SELECT COUNT(*) FROM registrations
           WHERE tournament_id = ? AND status IN ('registered', 'confirmed'))
       + (SELECT COUNT(*) FROM tournament_entries
           WHERE tournament_id = ?) AS total`,
      [tournamentId, tournamentId]
    );

    if (Number(countRows[0].total) >= tournament.max_participants) {
      await connection.rollback();
      return res.status(400).json({ error: "This tournament is full." });
    }

    const [result] = await connection.execute(
      `INSERT INTO tournament_entries (tournament_id, user_id, player_name, team_name, entry_type)
       VALUES (?, ?, ?, ?, ?)`,
      [tournamentId, req.user.user_id, playerName, teamName || null, entryType]
    );

    await connection.commit();

    res.status(201).json({
      message: "Registration saved successfully.",
      id: result.insertId,
      tournamentId
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Registration error:", error.code, error.message);

    if (res.headersSent) return;

    return res.status(500).json({
      error: "Could not save registration to MySQL.",
      code: error.code || "UNKNOWN_ERROR"
    });
  } finally {
    if (connection) connection.release();
  }
});

// List saved registrations so the page can show them after a refresh.
app.get("/api/registrations", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        e.entry_id AS id,
        e.tournament_id AS tournamentId,
        t.name AS tournamentName,
        e.player_name AS playerName,
        COALESCE(e.team_name, 'Solo player') AS teamName,
        e.registered_at AS registeredAt
      FROM tournament_entries e
      JOIN tournaments t ON t.tournament_id = e.tournament_id
      ORDER BY e.registered_at DESC, e.entry_id DESC
      LIMIT 200
    `);

    res.json(rows);
  } catch (error) {
    console.error("Registrations list error:", error.code, error.message);
    res.status(500).json({ error: "Could not load registrations." });
  }
});
// List ONLY the logged-in player's registrations.
app.get("/api/my-registrations", requireUser, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        e.entry_id AS id,
        e.tournament_id AS tournamentId,
        t.name AS tournamentName,
        g.game_name AS game,
        t.start_date AS tournamentDate,
        e.player_name AS playerName,
        COALESCE(e.team_name, 'Solo player') AS teamName,
        e.entry_type AS entryType,
        e.registered_at AS registeredAt
      FROM tournament_entries e
      JOIN tournaments t ON t.tournament_id = e.tournament_id
      JOIN games g ON g.game_id = t.game_id
      WHERE e.user_id = ?
      ORDER BY e.registered_at DESC, e.entry_id DESC
      LIMIT 200`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("My registrations error:", error.code, error.message);
    res.status(500).json({ error: "Could not load registrations." });
  }
});
app.listen(PORT, () => {
  console.log(`GTMS backend running at http://localhost:${PORT}`);
});