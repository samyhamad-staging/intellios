-- H3-4.1 Template Marketplace
CREATE TABLE IF NOT EXISTS templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  risk_tier    TEXT,
  abp_template JSONB NOT NULL,         -- partial ABP JSON used as template
  tags         JSONB NOT NULL DEFAULT '[]',
  source       TEXT NOT NULL DEFAULT 'built-in',  -- 'built-in' | 'community'
  rating       REAL,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  author       TEXT,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  user_email  TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_templates_enterprise ON templates(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_templates_source ON templates(source);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON template_ratings(template_id);
