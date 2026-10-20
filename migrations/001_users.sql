
--
-- user system
--

CREATE TABLE IF NOT EXISTS users (
	-- ids
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    -- details
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role INT NOT NULL DEFAULT 0, -- 0=subscriber, 1=user, 6340=admin
    -- timestamps
    created_at INT NOT NULL,
    accessed_at INT,
    updated_at INT,
    deleted_at INT
);

--
-- user session validation
--

CREATE TABLE IF NOT EXISTS sessions (
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    user_id BLOB NOT NULL REFERENCES users(id),
    ip_addr TEXT,
    created_at INT NOT NULL,
    expires_at INT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
