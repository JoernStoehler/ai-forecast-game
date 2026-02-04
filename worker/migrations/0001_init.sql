-- Initial schema for AI Forecast Game

CREATE TABLE IF NOT EXISTS games (
  snapshot TEXT PRIMARY KEY,     -- 6-char alphanumeric hash
  version INTEGER NOT NULL DEFAULT 1,
  preset TEXT NOT NULL,
  state JSON NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  outcome TEXT  -- 'EXTINCTION' | 'UTOPIA' | NULL
);

CREATE INDEX IF NOT EXISTS idx_preset_outcome ON games(preset, outcome);
CREATE INDEX IF NOT EXISTS idx_created_at ON games(created_at);
