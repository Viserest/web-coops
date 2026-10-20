
--
-- newsletter messages
--

CREATE TABLE IF NOT EXISTS messages (
    id BLOB PRIMARY KEY CHECK (length(id) = 16),
    -- counts
    views INT NOT NULL DEFAULT 0,
    sent INT NOT NULL DEFAULT 0,
    -- details
    subject TEXT NOT NULL,
    text TEXT NOT NULL,
    file_id TEXT,
    -- timestamps
    created_at INT NOT NULL,
    updated_at INT,
    deleted_at INT
);

--
-- newsletter links
-- * Links a message and user
--

CREATE TABLE IF NOT EXISTS links (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	user_id BLOB NOT NULL REFERENCES users(id),
	message_id BLOB NOT NULL REFERENCES messages(id),
	-- counts
	views INT NOT NULL DEFAULT 0,
	-- timestamps
	created_at INT NOT NULL,
	UNIQUE (user_id, message_id)
);
