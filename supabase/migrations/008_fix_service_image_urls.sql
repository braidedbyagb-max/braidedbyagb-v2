-- Migration 008: Fix service image_url paths
-- The old PHP site stored relative paths like /uploads/services/filename.jpeg
-- Prefix them with the old domain so they load immediately on the new platform.
-- Once images are re-uploaded to Supabase Storage, update to new URLs via admin panel.

UPDATE services
SET image_url = 'https://braidedbyagb.co.uk' || image_url
WHERE image_url IS NOT NULL
  AND image_url LIKE '/uploads/%';
