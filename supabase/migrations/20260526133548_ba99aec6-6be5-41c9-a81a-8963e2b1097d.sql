ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS content_richtext text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;