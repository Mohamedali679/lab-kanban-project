const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/users/login');
  next();
};

// ── GET /messages ─── Inbox ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    // Get all unique conversations for this user
    const [conversations] = await db.query(`
      SELECT
        IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS other_user_id,
        u.name AS other_name,
        MAX(m.created_at) AS last_at,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread,
        (SELECT content FROM messages m2
         WHERE (m2.sender_id = ? AND m2.receiver_id = IF(m.sender_id = ?, m.receiver_id, m.sender_id))
            OR (m2.receiver_id = ? AND m2.sender_id = IF(m.sender_id = ?, m.receiver_id, m.sender_id))
         ORDER BY m2.created_at DESC LIMIT 1) AS last_message
      FROM messages m
      JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id, u.name
      ORDER BY last_at DESC
    `, Array(9).fill(req.session.user.id));

    res.render('messages/inbox', { title: 'Messages', conversations });
  } catch (err) {
    console.error(err);
    res.render('messages/inbox', { title: 'Messages', conversations: [] });
  }
});

// ── GET /messages/:userId ── Conversation thread ────────────────────────────
router.get('/:userId', auth, async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId);
    const meId    = req.session.user.id;

    const [[otherUser]] = await db.query('SELECT id, name, email, student_id FROM users WHERE id = ?', [otherId]);
    if (!otherUser) return res.status(404).render('404', { title: 'User Not Found' });

    // Mark messages as read
    await db.query('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?', [otherId, meId]);

    const [thread] = await db.query(`
      SELECT m.*, u.name AS sender_name,
             i.title AS item_title, i.id AS item_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN items i ON m.item_id = i.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [meId, otherId, otherId, meId]);

    res.render('messages/thread', { title: `Chat with ${otherUser.name}`, otherUser, thread, meId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading messages');
  }
});

// ── POST /messages/send ── Send a message ───────────────────────────────────
router.post('/send', auth, async (req, res) => {
  const { receiver_id, content, item_id } = req.body;
  if (!content || !content.trim()) return res.redirect('/messages/' + receiver_id);
  try {
    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, item_id, content) VALUES (?, ?, ?, ?)',
      [req.session.user.id, receiver_id, item_id || null, content.trim()]
    );
    // Notify receiver
    await db.query('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [receiver_id, 'message', `${req.session.user.name} sent you a message.`, '/messages/' + req.session.user.id]
    );
    res.redirect('/messages/' + receiver_id);
  } catch (err) {
    console.error(err);
    res.redirect('/messages/' + receiver_id);
  }
});

module.exports = router;
