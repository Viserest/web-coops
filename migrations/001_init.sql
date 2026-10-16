CREATE TABLE IF NOT EXISTS subscriber (
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    created_at INT NOT NULL,
    deleted_at INT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    ip_addr TEXT
);

CREATE TABLE IF NOT EXISTS message (
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    created_at INT NOT NULL,
    updated_at INT,
    deleted_at INT,
    views INT NOT NULL DEFAULT 0,
    sent INT NOT NULL DEFAULT 0,
    subject TEXT NOT NULL,
    text TEXT NOT NULL,
    file_id TEXT
);

CREATE TABLE IF NOT EXISTS link (
  id BLOB PRIMARY KEY CHECK (length(id) = 16),
  created_at INT NOT NULL,
  views INT NOT NULL DEFAULT 0,
  subscriber_id BLOB NOT NULL REFERENCES subscriber(id),
  message_id BLOB NOT NULL REFERENCES message(id),
  UNIQUE (subscriber_id, message_id)
);
