import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(path.join(dbDir, 'scout.db'));

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      organization TEXT,
      role TEXT DEFAULT 'Scout'
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      football_api_provider TEXT DEFAULT 'api-football',
      football_api_key TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      competition TEXT,
      date TEXT,
      venue TEXT,
      kickoff TEXT,
      weather TEXT,
      pitch TEXT,
      home_team TEXT,
      home_score INTEGER,
      away_team TEXT,
      away_score INTEGER,
      scout_name TEXT,
      focus TEXT,
      general_notes TEXT,
      home_manager TEXT,
      away_manager TEXT,
      formation_home TEXT DEFAULT '4-3-3',
      formation_away TEXT DEFAULT '4-3-3',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      team_side TEXT NOT NULL, -- 'home' or 'away'
      shirt_number INTEGER,
      name TEXT,
      subbed TEXT,
      goal TEXT,
      rating REAL,
      position_x REAL,
      position_y REAL,
      FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS player_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      overview TEXT,
      strengths TEXT,
      areas_to_improve TEXT,
      pace INTEGER,
      strength INTEGER,
      stamina INTEGER,
      agility INTEGER,
      decision_making INTEGER,
      composure INTEGER,
      work_rate INTEGER,
      positioning INTEGER,
      recommendation_verdict TEXT,
      potential_level TEXT,
      FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec('ALTER TABLE reports ADD COLUMN formation_home TEXT DEFAULT "4-3-3"');
    db.exec('ALTER TABLE reports ADD COLUMN formation_away TEXT DEFAULT "4-3-3"');
  } catch (e) {
    // Columns might already exist
  }

  // Seed demo user if not exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    const insertUser = db.prepare('INSERT INTO users (email, password, name, organization, role) VALUES (?, ?, ?, ?, ?)');
    const info = insertUser.run('demo@scout.com', hash, 'Demo Scout', 'PFSA', 'Admin');
    const userId = info.lastInsertRowid;

    // Seed a report
    const insertReport = db.prepare(`
      INSERT INTO reports (
        user_id, competition, date, venue, kickoff, weather, pitch,
        home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const reportInfo = insertReport.run(
      userId, 'Premier League', '2023-10-24', 'Old Trafford', '15:00', 'Rainy', 'Good',
      'Man Utd', 2, 'Arsenal', 1, 'Demo Scout', 'Focus on Arsenal midfield transition', 'High intensity match.', 'Erik ten Hag', 'Mikel Arteta'
    );
    const reportId = reportInfo.lastInsertRowid;

    // Seed players
    const insertPlayer = db.prepare(`
      INSERT INTO players (report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Home Team (4-2-3-1 approx)
    insertPlayer.run(reportId, 'home', 1, 'A. Onana', '', '', 7, 50, 90);
    insertPlayer.run(reportId, 'home', 20, 'D. Dalot', '', '', 7.5, 85, 75);
    insertPlayer.run(reportId, 'home', 19, 'R. Varane', '', '', 7, 65, 80);
    insertPlayer.run(reportId, 'home', 6, 'L. Martinez', '', '', 8, 35, 80);
    insertPlayer.run(reportId, 'home', 23, 'L. Shaw', '75', '', 6.5, 15, 75);
    insertPlayer.run(reportId, 'home', 18, 'Casemiro', '', '', 7.5, 35, 60);
    insertPlayer.run(reportId, 'home', 37, 'K. Mainoo', '80', '', 8, 65, 60);
    insertPlayer.run(reportId, 'home', 8, 'B. Fernandes', '', '45', 8.5, 50, 40);
    insertPlayer.run(reportId, 'home', 10, 'M. Rashford', '', '', 7, 15, 30);
    insertPlayer.run(reportId, 'home', 21, 'Antony', '60', '', 6, 85, 30);
    insertPlayer.run(reportId, 'home', 11, 'R. Hojlund', '', '78', 8, 50, 15);

    // Away Team (4-3-3 approx)
    const sakaInfo = insertPlayer.run(reportId, 'away', 7, 'B. Saka', '', '12', 8.5, 85, 30);
    insertPlayer.run(reportId, 'away', 1, 'A. Ramsdale', '', '', 6.5, 50, 90);
    insertPlayer.run(reportId, 'away', 4, 'B. White', '', '', 7, 85, 75);
    insertPlayer.run(reportId, 'away', 2, 'W. Saliba', '', '', 7.5, 65, 80);
    insertPlayer.run(reportId, 'away', 6, 'Gabriel', '', '', 7, 35, 80);
    insertPlayer.run(reportId, 'away', 35, 'O. Zinchenko', '70', '', 6.5, 15, 75);
    insertPlayer.run(reportId, 'away', 41, 'D. Rice', '', '', 8, 50, 60);
    insertPlayer.run(reportId, 'away', 8, 'M. Odegaard', '', '', 7.5, 70, 45);
    insertPlayer.run(reportId, 'away', 29, 'K. Havertz', '65', '', 6, 30, 45);
    insertPlayer.run(reportId, 'away', 11, 'G. Martinelli', '', '', 7, 15, 30);
    insertPlayer.run(reportId, 'away', 9, 'G. Jesus', '80', '', 7, 50, 15);

    // Seed Player Review
    const insertReview = db.prepare(`
      INSERT INTO player_reviews (
        report_id, player_id, overview, strengths, areas_to_improve,
        pace, strength, stamina, agility, decision_making, composure, work_rate, positioning,
        recommendation_verdict, potential_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertReview.run(
      reportId, sakaInfo.lastInsertRowid,
      'Excellent performance on the right wing. Constant threat.',
      '1v1 dribbling, crossing, cutting inside.',
      'Sometimes holds onto the ball too long.',
      5, 3, 4, 5, 4, 4, 5, 4,
      'Sign immediately', 'Elite'
    );
  }
}
