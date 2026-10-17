
CREATE TABLE IF NOT EXISTS users (
	-- ids
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    -- details
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_subscriber INT NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    role TEXT NOT NULL,
    -- timestamps
    created_at INT NOT NULL,
    accessed_at INT,
    updated_at INT,
    deleted_at INT,
);

CREATE TABLE IF NOT EXISTS sessions (
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    user_id BLOB NOT NULL REFERENCES users(id),
    ip_addr TEXT,
    created_at INT NOT NULL,
    expires_at INT NOT NULL,
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
