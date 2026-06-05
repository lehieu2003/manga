CREATE SCHEMA IF NOT EXISTS source;

CREATE TABLE IF NOT EXISTS source.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  country TEXT NOT NULL,
  device_preference TEXT NOT NULL,
  signup_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source.manga (
  id BIGSERIAL PRIMARY KEY,
  mangadex_id UUID NOT NULL UNIQUE,
  title TEXT NOT NULL,
  alt_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  status TEXT,
  year INTEGER,
  content_rating TEXT,
  original_language TEXT,
  publication_demographic TEXT,
  cover_url TEXT,
  popularity_rank INTEGER NOT NULL,
  mangadex_created_at TIMESTAMPTZ,
  mangadex_updated_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source.genres (
  id BIGSERIAL PRIMARY KEY,
  mangadex_tag_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  group_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source.manga_genres (
  manga_id BIGINT NOT NULL REFERENCES source.manga(id) ON DELETE CASCADE,
  genre_id BIGINT NOT NULL REFERENCES source.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (manga_id, genre_id)
);

CREATE TABLE IF NOT EXISTS source.chapters (
  id BIGSERIAL PRIMARY KEY,
  mangadex_id UUID NOT NULL UNIQUE,
  manga_id BIGINT NOT NULL REFERENCES source.manga(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  chapter_number TEXT,
  volume TEXT,
  translated_language TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  publish_at TIMESTAMPTZ,
  readable_at TIMESTAMPTZ,
  scanlation_group TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source.ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  run_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS manga_popularity_rank_idx ON source.manga(popularity_rank);
CREATE INDEX IF NOT EXISTS manga_status_idx ON source.manga(status);
CREATE INDEX IF NOT EXISTS chapters_manga_language_idx ON source.chapters(manga_id, translated_language);
CREATE INDEX IF NOT EXISTS chapters_publish_at_idx ON source.chapters(publish_at);
CREATE INDEX IF NOT EXISTS users_country_idx ON source.users(country);

