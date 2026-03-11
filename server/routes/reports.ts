import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from './auth.js';

const router = Router();

router.use(authenticate);

// Get all reports for user
router.get('/', (req: any, res) => {
  const reports = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(reports);
});

// Get single report with all details
router.get('/:id', (req: any, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!report) return res.status(404).json({ error: 'Not found' });

  const players = db.prepare('SELECT * FROM players WHERE report_id = ?').all(req.params.id);
  const reviews = db.prepare('SELECT * FROM player_reviews WHERE report_id = ?').all(req.params.id);

  res.json({ ...report, players, reviews });
});

// Create new report
router.post('/', (req: any, res) => {
  const {
    competition, date, venue, kickoff, weather, pitch,
    home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager,
    formation_home, formation_away, players, reviews
  } = req.body;

  const insert = db.prepare(`
    INSERT INTO reports (
      user_id, competition, date, venue, kickoff, weather, pitch,
      home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager,
      formation_home, formation_away
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let reportId: number;

  db.transaction(() => {
    const info = insert.run(
      req.user.id, competition, date, venue, kickoff, weather, pitch,
      home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager,
      formation_home || '4-3-3', formation_away || '4-3-3'
    );
    reportId = info.lastInsertRowid as number;

    const insertPlayer = db.prepare(`
      INSERT INTO players (report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const playerIdMap = new Map();

    if (players && players.length > 0) {
      for (const p of players) {
        const pInfo = insertPlayer.run(reportId, p.team_side, p.shirt_number, p.name, p.subbed, p.goal, p.rating, p.position_x, p.position_y);
        playerIdMap.set(p.id, pInfo.lastInsertRowid);
      }
    }

    const insertReview = db.prepare(`
      INSERT INTO player_reviews (
        report_id, player_id, overview, strengths, areas_to_improve,
        pace, strength, stamina, agility, decision_making, composure, work_rate, positioning,
        recommendation_verdict, potential_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (reviews && reviews.length > 0) {
      for (const r of reviews) {
        const newPlayerId = playerIdMap.get(r.player_id) || r.player_id;
        insertReview.run(
          reportId, newPlayerId, r.overview, r.strengths, r.areas_to_improve,
          r.pace, r.strength, r.stamina, r.agility, r.decision_making, r.composure, r.work_rate, r.positioning,
          r.recommendation_verdict, r.potential_level
        );
      }
    }
  })();

  res.json({ id: reportId! });
});

// Update report (Full save)
router.put('/:id', (req: any, res) => {
  const {
    competition, date, venue, kickoff, weather, pitch,
    home_team, home_score, away_team, away_score, scout_name, focus, general_notes, home_manager, away_manager,
    formation_home, formation_away, players, reviews
  } = req.body;

  const reportId = req.params.id;

  // Verify ownership
  const report = db.prepare('SELECT id FROM reports WHERE id = ? AND user_id = ?').get(reportId, req.user.id);
  if (!report) return res.status(404).json({ error: 'Not found' });

  const updateReport = db.prepare(`
    UPDATE reports SET
      competition = ?, date = ?, venue = ?, kickoff = ?, weather = ?, pitch = ?,
      home_team = ?, home_score = ?, away_team = ?, away_score = ?, scout_name = ?, focus = ?, general_notes = ?,
      home_manager = ?, away_manager = ?, formation_home = ?, formation_away = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  db.transaction(() => {
    updateReport.run(
      competition, date, venue, kickoff, weather, pitch,
      home_team, home_score, away_team, away_score, scout_name, focus, general_notes,
      home_manager, away_manager, formation_home || '4-3-3', formation_away || '4-3-3', reportId
    );

    // Naive approach: delete all players and reviews and re-insert
    db.prepare('DELETE FROM players WHERE report_id = ?').run(reportId);
    db.prepare('DELETE FROM player_reviews WHERE report_id = ?').run(reportId);

    const insertPlayer = db.prepare(`
      INSERT INTO players (report_id, team_side, shirt_number, name, subbed, goal, rating, position_x, position_y)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const playerIdMap = new Map(); // Map old client IDs to new DB IDs

    if (players && players.length > 0) {
      for (const p of players) {
        const info = insertPlayer.run(reportId, p.team_side, p.shirt_number, p.name, p.subbed, p.goal, p.rating, p.position_x, p.position_y);
        playerIdMap.set(p.id, info.lastInsertRowid);
      }
    }

    const insertReview = db.prepare(`
      INSERT INTO player_reviews (
        report_id, player_id, overview, strengths, areas_to_improve,
        pace, strength, stamina, agility, decision_making, composure, work_rate, positioning,
        recommendation_verdict, potential_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (reviews && reviews.length > 0) {
      for (const r of reviews) {
        const newPlayerId = playerIdMap.get(r.player_id) || r.player_id; // Use new ID if it was just created, else try existing
        insertReview.run(
          reportId, newPlayerId, r.overview, r.strengths, r.areas_to_improve,
          r.pace, r.strength, r.stamina, r.agility, r.decision_making, r.composure, r.work_rate, r.positioning,
          r.recommendation_verdict, r.potential_level
        );
      }
    }
  })();

  res.json({ success: true });
});

export default router;
