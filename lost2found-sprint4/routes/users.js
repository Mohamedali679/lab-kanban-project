const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db/connection');

const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/users/login');
  next();
};

// ── GET /users ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.*,
        ROUND(u.rating_total / NULLIF(u.rating_count,0), 1) AS avg_rating,
        (SELECT COUNT(*) FROM items WHERE user_id=u.id AND type='lost')  AS lost_count,
        (SELECT COUNT(*) FROM items WHERE user_id=u.id AND type='found') AS found_count,
        (SELECT COUNT(*) FROM items WHERE user_id=u.id AND status='resolved') AS resolved_count
      FROM users u ORDER BY u.points DESC
    `);
    res.render('users/index', { title: 'Community Members', users });
  } catch (err) {
    console.error(err);
    res.render('users/index', { title: 'Community Members', users: [] });
  }
});

// ── GET /users/login ────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('users/login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.render('users/login', { title: 'Login', error: 'Invalid email or password.' });
    req.session.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('users/login', { title: 'Login', error: 'Something went wrong.' });
  }
});

// ── GET /users/register ─────────────────────────────────────────────────────
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('users/register', { title: 'Register', error: null });
});

router.post('/register', async (req, res) => {
  const { name, email, password, student_id } = req.body;
  if (!email.endsWith('@roehampton.ac.uk'))
    return res.render('users/register', { title: 'Register', error: 'You must use a Roehampton University email (@roehampton.ac.uk).' });
  if (!name || !password || password.length < 8)
    return res.render('users/register', { title: 'Register', error: 'Name and a password of at least 8 characters are required.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (name, email, password_hash, student_id) VALUES (?, ?, ?, ?)',
      [name, email, hash, student_id]);
    const [[u]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    req.session.user = { id: u.id, name: u.name, email: u.email };
    await db.query('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [u.id, 'welcome', 'Welcome to lost2found! Start by posting a lost or found item.', '/items/new/post']);
    res.redirect('/');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.render('users/register', { title: 'Register', error: 'That email is already registered.' });
    console.error(err);
    res.render('users/register', { title: 'Register', error: 'Something went wrong.' });
  }
});

// ── GET /users/logout ───────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── GET /users/notifications ────────────────────────────────────────────────
router.get('/notifications', auth, async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.session.user.id]
    );
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]);
    res.render('users/notifications', { title: 'Notifications', notifications });
  } catch (err) {
    console.error(err);
    res.render('users/notifications', { title: 'Notifications', notifications: [] });
  }
});

// ── GET /users/me ───────────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => res.redirect('/users/' + req.session.user.id));

// ── GET /users/:id ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [[u]] = await db.query(`
      SELECT u.*, ROUND(u.rating_total / NULLIF(u.rating_count,0), 1) AS avg_rating
      FROM users u WHERE u.id = ?
    `, [req.params.id]);
    if (!u) return res.status(404).render('404', { title: 'User Not Found' });

    const [items] = await db.query(`
      SELECT i.*, c.name AS category_name, c.icon AS category_icon
      FROM items i LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = ? ORDER BY i.created_at DESC
    `, [req.params.id]);

    const [userRatings] = await db.query(`
      SELECT r.*, u.name AS rater_name FROM ratings r
      JOIN users u ON r.rater_id = u.id
      WHERE r.rated_id = ? ORDER BY r.created_at DESC
    `, [req.params.id]);

    // Unread message count for nav
    let unreadCount = 0;
    if (req.session.user) {
      const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM messages WHERE receiver_id = ? AND is_read = 0`, [req.session.user.id]);
      unreadCount = row.n;
    }

    res.render('users/profile', { title: u.name, profileUser: u, items, userRatings, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading profile');
  }
});

module.exports = router;
