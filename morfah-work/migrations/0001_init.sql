CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  original_title TEXT,
  description TEXT NOT NULL DEFAULT '',
  year INTEGER,
  genre_json TEXT NOT NULL DEFAULT '[]',
  poster TEXT NOT NULL,
  backdrop TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT,
  telegram_url TEXT NOT NULL,
  youtube_url TEXT,
  facebook_url TEXT,
  telegram_message_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(series_id, number),
  UNIQUE(series_id, telegram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_series_title ON series(title);
CREATE INDEX IF NOT EXISTS idx_episode_series ON episodes(series_id, number);

INSERT OR IGNORE INTO series (id, title, description, year, genre_json, poster, backdrop, featured)
VALUES (
  'dark-boys-encore',
  'Dark Boys: Encore',
  'Morfah Studios-এর Dark Boys: Encore সিরিজ। ভিডিও Telegram-এ hosted এবং Watch চাপলে সরাসরি Telegram-এ playback হবে।',
  2026,
  '["Drama","Mystery"]',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1800&q=85',
  1
);

INSERT OR IGNORE INTO episodes (id, series_id, number, title, telegram_url, telegram_message_id)
VALUES (
  'dark-boys-encore-ep-01',
  'dark-boys-encore',
  1,
  'Dark Boys: Encore Episode - 01',
  'https://t.me/c/4427906462/3',
  3
);
