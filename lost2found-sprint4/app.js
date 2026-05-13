require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'lost2found-s4-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Global user + flash message middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  req.session.flash = null;
  next();
});

const indexRouter    = require('./routes/index');
const itemsRouter    = require('./routes/items');
const usersRouter    = require('./routes/users');
const messagesRouter = require('./routes/messages');
const ratingsRouter  = require('./routes/ratings');

app.use('/',         indexRouter);
app.use('/items',    itemsRouter);
app.use('/users',    usersRouter);
app.use('/messages', messagesRouter);
app.use('/ratings',  ratingsRouter);

app.use((req, res) => res.status(404).render('404', { title: 'Not Found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🔍 lost2found [Sprint 4] running at http://localhost:${PORT}\n`);
});

module.exports = app;
