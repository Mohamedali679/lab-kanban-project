const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/users/login');
  next();
};

// ── POST /ratings/submit ────────────────────────────────────────────────────
router.post('/submit', auth, async (req, res) => {
  const { rated_id, item_id, score, comment } = req.body;
  const rater_id = req.session.user.id;

  if (parseInt(rated_id) === rater_id) {
    req.session.flash = 'You cannot rate yourself.';
    return res.redirect('/items/' + item_id);
  }
  const s = parseInt(score);
  if (!s || s < 1 || s > 5) {
    req.session.flash = 'Please select a rating between 1 and 5.';
    return res.redirect('/items/' + item_id);
  }
  try {
    await db.query(
      'INSERT IGNORE INTO ratings (rater_id, rated_id, item_id, score, comment) VALUES (?, ?, ?, ?, ?)',
      [rater_id, rated_id, item_id || null, s, comment || null]
    );
    // Update user's aggregate rating
    await db.query(`
      UPDATE users SET
        rating_total = (SELECT SUM(score) FROM ratings WHERE rated_id = ?),
        rating_count = (SELECT COUNT(*)  FROM ratings WHERE rated_id = ?)
      WHERE id = ?
    `, [rated_id, rated_id, rated_id]);

    // Award 2 points to rater for leaving a review
    await db.query('UPDATE users SET points = points + 2 WHERE id = ?', [rater_id]);
    // Award 5 points to person rated
    await db.query('UPDATE users SET points = points + 5 WHERE id = ?', [rated_id]);

    // Notify rated user
    await db.query('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [rated_id, 'rating', `${req.session.user.name} left you a ${s}-star rating!`, '/users/' + rated_id]
    );

    req.session.flash = `✅ Rating submitted! +2 points for you, +5 points for them.`;
    res.redirect('/items/' + (item_id || ''));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') req.session.flash = 'You have already rated this user for this item.';
    else { console.error(err); req.session.flash = 'Could not submit rating.'; }
    res.redirect('/items/' + (item_id || ''));
  }
});

module.exports = router;
