const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ── Matching Algorithm ────────────────────────────────────────────────────────
// Scores a lost item vs a found item on: category match, location similarity,
// date proximity, keyword overlap. Returns 0-1 float.
function matchScore(lost, found) {
  let score = 0;

  // Category match (40 points)
  if (lost.category_id && found.category_id && lost.category_id === found.category_id) score += 0.4;

  // Location similarity (30 points) — simple keyword overlap
  const lLoc = (lost.location  || '').toLowerCase().split(/\W+/);
  const fLoc = (found.location || '').toLowerCase().split(/\W+/);
  const locOverlap = lLoc.filter(w => w.length > 3 && fLoc.includes(w)).length;
  score += Math.min(locOverlap * 0.1, 0.3);

  // Date proximity (20 points) — within 7 days
  const daysDiff = Math.abs(new Date(lost.date_occurred) - new Date(found.date_occurred)) / 86400000;
  if (daysDiff <= 1)  score += 0.2;
  else if (daysDiff <= 3)  score += 0.12;
  else if (daysDiff <= 7)  score += 0.05;

  // Title/description keyword overlap (10 points)
  const stopWords = new Set(['the','a','an','in','on','at','to','for','of','and','my','i','it','was']);
  const lWords = (lost.title  + ' ' + lost.description).toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
  const fWords = (found.title + ' ' + found.description).toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
  const kwOverlap = lWords.filter(w => fWords.includes(w)).length;
  score += Math.min(kwOverlap * 0.05, 0.1);

  return Math.min(score, 1);
}

router.get('/', async (req, res) => {
  try {
    const [recentItems] = await db.query(`
      SELECT i.*, u.name AS user_name, c.name AS category_name, c.icon AS category_icon
      FROM items i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.status = 'active'
      ORDER BY i.created_at DESC LIMIT 6
    `);

    const [stats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM items WHERE type='lost'  AND status='active')   AS lost_count,
        (SELECT COUNT(*) FROM items WHERE type='found' AND status='active')   AS found_count,
        (SELECT COUNT(*) FROM items WHERE status='resolved')                  AS resolved_count,
        (SELECT COUNT(*) FROM users)                                          AS user_count,
        (SELECT COUNT(*) FROM messages)                                       AS message_count
    `);

    // Top contributors (by points)
    const [topUsers] = await db.query(`
      SELECT id, name, points, rating_total, rating_count,
        ROUND(rating_total / NULLIF(rating_count,0), 1) AS avg_rating
      FROM users ORDER BY points DESC LIMIT 5
    `);

    // Recommendations: for logged-in user show matches for their lost items
    let recommendations = [];
    if (req.session.user) {
      const [lostItems]  = await db.query(`SELECT * FROM items WHERE user_id = ? AND type = 'lost'  AND status = 'active'`, [req.session.user.id]);
      const [foundItems] = await db.query(`SELECT * FROM items WHERE status = 'active' AND type = 'found'`);
      for (const lost of lostItems) {
        for (const found of foundItems) {
          const sc = matchScore(lost, found);
          if (sc >= 0.3) recommendations.push({ lost, found, score: Math.round(sc * 100) });
        }
      }
      recommendations.sort((a, b) => b.score - a.score);
      recommendations = recommendations.slice(0, 4);
    }

    // Unread message count for nav badge
    let unreadCount = 0;
    if (req.session.user) {
      const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM messages WHERE receiver_id = ? AND is_read = 0`, [req.session.user.id]);
      unreadCount = row.n;
    }

    res.render('index', {
      title: 'Home',
      recentItems,
      stats: stats[0],
      topUsers,
      recommendations,
      unreadCount,
      team: [
        { name: 'Uthman Vahora',    id: 'A00015026'   },
        { name: 'Ibrahim Al-kutubi',id: 'ALK22612424'  },
        { name: 'Mohamed Ali',      id: 'Z23614747'   },
        { name: 'Abdiaziz Ismail',  id: 'ISM23592710' },
        { name: 'Lyes Boudehane',   id: 'A00015772'   }
      ]
    });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'Home', recentItems: [], stats: {}, topUsers: [], recommendations: [], unreadCount: 0, team: [] });
  }
});

module.exports = router;
