-- lost2found Sprint 4 Schema
-- Roehampton University · Group: 5 Engineers
-- Advanced features: messaging, ratings, points, matching

CREATE DATABASE IF NOT EXISTS lost2found_db;
USE lost2found_db;

-- ─── USERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  student_id    VARCHAR(50),
  profile_bio   TEXT,
  avatar_url    VARCHAR(255),
  points        INT           DEFAULT 0,
  rating_total  INT           DEFAULT 0,
  rating_count  INT           DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─── CATEGORIES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  icon VARCHAR(10) NOT NULL
);

-- ─── ITEMS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  type           ENUM('lost','found') NOT NULL,
  title          VARCHAR(200)  NOT NULL,
  description    TEXT          NOT NULL,
  category_id    INT,
  location       VARCHAR(200)  NOT NULL,
  date_occurred  DATE          NOT NULL,
  image_url      VARCHAR(255),
  status         ENUM('active','resolved') DEFAULT 'active',
  reward_points  INT           DEFAULT 0,
  views          INT           DEFAULT 0,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ─── TAGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id INT,
  tag_id  INT,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

-- ─── MESSAGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT  NOT NULL,
  receiver_id INT  NOT NULL,
  item_id     INT,
  content     TEXT NOT NULL,
  is_read     BOOLEAN   DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (item_id)     REFERENCES items(id) ON DELETE SET NULL
);

-- ─── RATINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  rater_id    INT NOT NULL,
  rated_id    INT NOT NULL,
  item_id     INT,
  score       INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (rater_id, rated_id, item_id),
  FOREIGN KEY (rater_id) REFERENCES users(id),
  FOREIGN KEY (rated_id) REFERENCES users(id),
  FOREIGN KEY (item_id)  REFERENCES items(id) ON DELETE SET NULL
);

-- ─── NOTIFICATIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  type       VARCHAR(50) NOT NULL,
  message    TEXT NOT NULL,
  link       VARCHAR(255),
  is_read    BOOLEAN   DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── MATCHES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  lost_item_id INT NOT NULL,
  found_item_id INT NOT NULL,
  score        FLOAT NOT NULL,
  status       ENUM('pending','confirmed','rejected') DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_match (lost_item_id, found_item_id),
  FOREIGN KEY (lost_item_id)  REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────

INSERT IGNORE INTO categories (id, name, icon) VALUES
(1,  'Electronics',       '📱'),
(2,  'Bags & Wallets',    '👜'),
(3,  'Keys',              '🔑'),
(4,  'Clothing',          '🧥'),
(5,  'Jewellery',         '💍'),
(6,  'Student ID / Cards','🪪'),
(7,  'Books & Stationery','📚'),
(8,  'Sports & Gym',      '🏃'),
(9,  'Pets',              '🐾'),
(10, 'Other',             '📦');

INSERT IGNORE INTO tags (name) VALUES
('urgent'),('valuable'),('near-library'),('near-canteen'),
('near-dorms'),('small'),('large'),('black'),('blue'),('red'),
('roehampton'),('campus'),('electronics'),('clothing');

-- Passwords are all "password123"
INSERT IGNORE INTO users (id, name, email, password_hash, student_id, profile_bio, points) VALUES
(1, 'Daniel James',     'daniel.james@roehampton.ac.uk',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Z12345678',   'Computer Science student, Year 2. Lost things a lot!', 30),
(2, 'Sara Johnson',     'sara.johnson@roehampton.ac.uk',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'LIB001',      'Library assistant. I find things every day!', 85),
(3, 'Uthman Vahora',    'uthman.vahora@roehampton.ac.uk',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'A00015026',   'Software Engineering student & co-creator of lost2found.', 50),
(4, 'Ibrahim Al-kutubi','ibrahim.alkutubi@roehampton.ac.uk','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ALK22612424', 'Software Engineering student & co-creator of lost2found.', 45),
(5, 'Mohamed Ali',      'mohamed.ali@roehampton.ac.uk',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Z23614747',   'Software Engineering student & co-creator of lost2found.', 60),
(6, 'Abdiaziz Ismail',  'abdiaziz.ismail@roehampton.ac.uk', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ISM23592710', 'Software Engineering student & co-creator of lost2found.', 40),
(7, 'Lyes Boudehane',   'lyes.boudehane@roehampton.ac.uk',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'A00015772',   'Software Engineering student & co-creator of lost2found.', 55);

INSERT IGNORE INTO items (id, user_id, type, title, description, category_id, location, date_occurred, status, reward_points) VALUES
(1, 1, 'lost',  'Black iPhone 15 Pro',         'Lost my black iPhone 15 in a leather case near the main library. Has a cracked screen protector. Last seen 9am on the 3rd floor study area.',     1, 'Roehampton Library, 3rd Floor',     '2026-05-01', 'active',   20),
(2, 2, 'found', 'Blue Student ID Card',         'Found a student ID card near the canteen entrance. Name starts with A. Please contact me to verify and collect.',                                 6, 'University Canteen Entrance',       '2026-05-02', 'active',    0),
(3, 1, 'lost',  'House & Bike Keys',            'Lost a set of 3 keys on a red lanyard with a small rubber duck keyring. Possibly dropped between Sports Centre and Digby Stuart.',               3, 'Sports Centre / Digby Stuart',      '2026-04-30', 'active',   10),
(4, 2, 'found', 'North Face Black Backpack',    'Found a large black North Face rucksack left in Lecture Theatre 2. Contains what looks like a laptop and notebooks.',                            2, 'Whitelands College, LT2',           '2026-05-03', 'active',    0),
(5, 3, 'lost',  'AirPods Pro (White)',          'Lost my AirPods Pro white charging case in the library or the SU building. Has a small sticker of a green leaf on the case.',                   1, 'SU Building / Library',             '2026-05-01', 'active',   15),
(6, 4, 'found', 'Brown Leather Wallet',         'Found a brown leather wallet on a bench near the pond. Contains cards — handing to Security if not claimed today.',                              2, 'Roehampton Pond Area',              '2026-05-04', 'active',    0),
(7, 5, 'lost',  'Kindle Paperwhite',            'Left my Kindle on a seat in the library ground floor reading area. Grey case with a sticker of a planet on it.',                                 1, 'Library Ground Floor',              '2026-05-02', 'active',   15),
(8, 6, 'found', 'Set of 2 Keys on Blue Fob',   'Found keys on a blue fob near the Sports Centre car park. No label. Leaving at main reception if not claimed.',                                   3, 'Sports Centre Car Park',            '2026-05-03', 'active',    0),
(9, 7, 'lost',  'Grey Nike Hoodie (Size M)',    'Left my grey Nike hoodie in the SU bar area after an event. Has my initials LB written on the label inside.',                                    4, 'SU Bar / Common Room',              '2026-05-01', 'active',   10),
(10,2, 'found', 'Glasses in Hard Case',         'Found a pair of glasses in a blue hard case near the canteen. Left at library lost property desk.',                                               10,'University Canteen',              '2026-05-04', 'active',    0);

INSERT IGNORE INTO item_tags (item_id, tag_id) VALUES
(1,1),(1,8),(1,3),(2,4),(3,1),(3,12),(4,1),(4,7),(5,3),(5,6),(6,2),(7,3),(8,1),(9,11),(10,4);

-- Seed ratings
INSERT IGNORE INTO ratings (rater_id, rated_id, item_id, score, comment) VALUES
(1, 2, 2, 5, 'Sara was incredibly helpful and returned my ID card quickly. Highly recommend!'),
(3, 4, NULL, 4, 'Great teammate and very responsive on the app.'),
(2, 1, NULL, 5, 'Daniel posted clear details and was easy to contact.');

-- Update rating totals
UPDATE users SET rating_total = 9,  rating_count = 2 WHERE id = 2;
UPDATE users SET rating_total = 5,  rating_count = 1 WHERE id = 1;
UPDATE users SET rating_total = 4,  rating_count = 1 WHERE id = 4;

-- Seed messages
INSERT IGNORE INTO messages (sender_id, receiver_id, item_id, content) VALUES
(1, 2, 2,  'Hi Sara, I think the student ID you found might be mine. My name starts with A. Can I come collect it?'),
(2, 1, 2,  'Hi Daniel! Yes please come to the library desk. I will be here until 5pm today.'),
(3, 1, 1,  'Hey, I think I saw a black iPhone in the study area this morning. Is it still missing?'),
(1, 3, 1,  'Yes still missing! Can you describe it more — did it have a leather case?');

-- Seed notifications
INSERT IGNORE INTO notifications (user_id, type, message, link) VALUES
(1, 'match',   'A potential match found for your lost iPhone 15 Pro!', '/items/1'),
(1, 'message', 'Sara Johnson sent you a message about your Student ID.', '/messages/2'),
(2, 'message', 'Daniel James sent you a message about Student ID Card.', '/messages/1'),
(3, 'match',   'A potential match found for your AirPods Pro!', '/items/5');

-- Seed matches (matching algorithm results)
INSERT IGNORE INTO matches (lost_item_id, found_item_id, score) VALUES
(3, 8, 0.85),
(1, 4, 0.42);
