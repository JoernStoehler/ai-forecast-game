-- Initial schema for AI Forecast Game

CREATE TABLE IF NOT EXISTS games (
  snapshot TEXT PRIMARY KEY,     -- 6-char alphanumeric hash
  version INTEGER NOT NULL DEFAULT 1,
  preset TEXT NOT NULL,
  state JSON,                    -- NULL when status='reserved'
  status TEXT NOT NULL DEFAULT 'exists',  -- 'reserved', 'exists', 'failed'
  created_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  outcome TEXT  -- 'EXTINCTION' | 'UTOPIA' | NULL
);

CREATE INDEX IF NOT EXISTS idx_preset_outcome ON games(preset, outcome);
CREATE INDEX IF NOT EXISTS idx_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_status ON games(status);
