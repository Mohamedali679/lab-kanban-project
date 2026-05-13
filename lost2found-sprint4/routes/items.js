const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const db      = require('../db/connection');

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    cb(ok ? null : new Error('Images only'), ok);
  }
});

// Matching algorithm (same logic as index.js)
function matchScore(a, b) {
  let score = 0;
  if (a.category_id && b.category_id && a.category_id === b.category_id) score += 0.4;
  const aLoc = (a.location || '').toLowerCase().split(/\W+/);
  const bLoc = (b.location || '').toLowerCase().split(/\W+/);
  const locOverlap = aLoc.filter(w => w.length > 3 && bLoc.includes(w)).length;
  score += Math.min(locOverlap * 0.1, 0.3);
  const daysDiff = Math.abs(new Date(a.date_occurred) - new Date(b.date_occurred)) / 86400000;
  if (daysDiff <= 1) score += 0.2;
  else if (daysDiff <= 3) score += 0.12;
  else if (daysDiff <= 7) score += 0.05;
  const stop = new Set(['the','a','an','in','on','at','to','for','of','and','my','i','it','was']);
  const aW = (a.title+' '+a.description).toLowerCase().split(/\W+/).filter(w=>w.length>3&&!stop.has(w));
  const bW = (b.title+' '+b.description).toLowerCase().split(/\W+/).filter(w=>w.length>3&&!stop.has(w));
  score += Math.min(aW.filter(w=>bW.includes(w)).length * 0.05, 0.1);
  return Math.min(score, 1);
}

// Auth middleware
const auth = (req, res, next) => {
  if (!req.session.user) { req.session.flash = 'Please log in first.'; return res.redirect('/users/login'); }
  next();
};

// ── GET /items ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, category, q, sort } = req.query;
    let query = `
      SELECT i.*, u.name AS user_name, c.name AS category_name, c.icon AS category_icon
      FROM items i JOIN users u ON i.user_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.status = 'active'
    `;
    const params = [];
    if (type && ['lost','found'].includes(type)) { query += ' AND i.type = ?'; params.push(type); }
    if (category) { query += ' AND i.category_id = ?'; params.push(category); }
    if (q) {
      query += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const orderMap = { newest:'i.created_at DESC', oldest:'i.created_at ASC', reward:'i.reward_points DESC' };
    query += ' ORDER BY ' + (orderMap[sort] || 'i.created_at DESC');

    const [items]      = await db.query(query, params);
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.render('items/index', { title: 'Browse Items', items, categories, filters: { type, category, q, sort } });
  } catch (err) {
    console.error(err);
    res.render('items/index', { title: 'Browse Items', items: [], categories: [], filters: {} });
  }
});

// ── GET /items/new/post ─────────────────────────────────────────────────────
router.get('/new/post', auth, async (req, res) => {
  const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
  const [tags]       = await db.query('SELECT * FROM tags ORDER BY name');
  res.render('items/new', { title: 'Post Item', categories, tags, error: req.query.error });
});

// ── POST /items/new/post ────────────────────────────────────────────────────
router.post('/new/post', auth, upload.single('image'), async (req, res) => {
  const { type, title, description, category_id, location, date_occurred, reward_points, tags } = req.body;
  if (!type || !title || !description || !category_id || !location || !date_occurred) {
    return res.redirect('/items/new/post?error=1');
  }
  try {
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    const reward   = parseInt(reward_points) || 0;
    const [result] = await db.query(
      'INSERT INTO items (user_id, type, title, description, category_id, location, date_occurred, image_url, reward_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.session.user.id, type, title, description, category_id, location, date_occurred, imageUrl, reward]
    );
    // Award 5 points for posting
    await db.query('UPDATE users SET points = points + 5 WHERE id = ?', [req.session.user.id]);

    // Insert tags
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      for (const tagId of tagList) {
        await db.query('INSERT IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)', [result.insertId, tagId]).catch(() => {});
      }
    }

    // Run matching algorithm against opposite-type items
    const opposite = type === 'lost' ? 'found' : 'lost';
    const [oppositeItems] = await db.query(`SELECT * FROM items WHERE type = ? AND status = 'active'`, [opposite]);
    const newItem = { ...req.body, id: result.insertId };
    for (const opp of oppositeItems) {
      const lostItem  = type === 'lost' ? newItem : opp;
      const foundItem = type === 'found' ? newItem : opp;
      const sc = matchScore(lostItem, foundItem);
      if (sc >= 0.3) {
        await db.query('INSERT IGNORE INTO matches (lost_item_id, found_item_id, score) VALUES (?, ?, ?)',
          [lostItem.id, foundItem.id, sc]).catch(() => {});
        // Notify the other user
        const notifyUser = opp.user_id;
        await db.query('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
          [notifyUser, 'match', `A new potential match found for your ${opposite} item!`, '/items/' + opp.id]).catch(() => {});
      }
    }

    req.session.flash = 'Item posted successfully! +5 points earned.';
    res.redirect('/items/' + result.insertId);
  } catch (err) {
    console.error(err);
    res.redirect('/items/new/post?error=1');
  }
});

// ── GET /items/:id ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    // Increment view count
    await db.query('UPDATE items SET views = views + 1 WHERE id = ?', [req.params.id]);

    const [rows] = await db.query(`
      SELECT i.*, u.name AS user_name, u.email AS user_email, u.student_id,
             u.points AS user_points, u.rating_total, u.rating_count,
             ROUND(u.rating_total / NULLIF(u.rating_count,0), 1) AS user_rating,
             c.name AS category_name, c.icon AS category_icon
      FROM items i JOIN users u ON i.user_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).render('404', { title: 'Not Found' });

    const [tags] = await db.query(`
      SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?
    `, [req.params.id]);

    // Get matches for this item
    const item = rows[0];
    let matches = [];
    if (item.type === 'lost') {
      const [m] = await db.query(`
        SELECT m.score, i.*, u.name AS user_name, c.name AS category_name, c.icon AS category_icon
        FROM matches m JOIN items i ON m.found_item_id = i.id
        JOIN users u ON i.user_id = u.id LEFT JOIN categories c ON i.category_id = c.id
        WHERE m.lost_item_id = ? AND m.status = 'pending' ORDER BY m.score DESC LIMIT 3
      `, [req.params.id]);
      matches = m;
    } else {
      const [m] = await db.query(`
        SELECT m.score, i.*, u.name AS user_name, c.name AS category_name, c.icon AS category_icon
        FROM matches m JOIN items i ON m.lost_item_id = i.id
        JOIN users u ON i.user_id = u.id LEFT JOIN categories c ON i.category_id = c.id
        WHERE m.found_item_id = ? AND m.status = 'pending' ORDER BY m.score DESC LIMIT 3
      `, [req.params.id]);
      matches = m;
    }

    // Has current user rated the item poster?
    let hasRated = false;
    if (req.session.user && req.session.user.id !== item.user_id) {
      const [[r]] = await db.query('SELECT id FROM ratings WHERE rater_id = ? AND rated_id = ? AND item_id = ?',
        [req.session.user.id, item.user_id, item.id]);
      hasRated = !!r;
    }

    res.render('items/detail', { title: item.title, item, tags, matches, hasRated, flash: res.locals.flash });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading item');
  }
});

// ── POST /items/:id/resolve ─────────────────────────────────────────────────
router.post('/:id/resolve', auth, async (req, res) => {
  const [[item]] = await db.query('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  if (!item) return res.redirect('/items/' + req.params.id);
  await db.query('UPDATE items SET status = "resolved" WHERE id = ?', [req.params.id]);
  // Award 20 points for resolving
  await db.query('UPDATE users SET points = points + 20 WHERE id = ?', [req.session.user.id]);
  req.session.flash = '✅ Item marked as resolved! +20 points earned.';
  res.redirect('/items/' + req.params.id);
});

// ── POST /items/:id/delete ──────────────────────────────────────────────────
router.post('/:id/delete', auth, async (req, res) => {
  await db.query('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  req.session.flash = 'Item deleted.';
  res.redirect('/items');
});

module.exports = router;
