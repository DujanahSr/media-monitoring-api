CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    source VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMPTZ,
    engagement INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentions_source ON mentions(source);

CREATE INDEX IF NOT EXISTS idx_mentions_published_at ON mentions(published_at);