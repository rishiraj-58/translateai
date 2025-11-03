-- Translation AI Database Schema

-- Create the database (run this separately if needed)
-- CREATE DATABASE translateai;

-- Connect to the database
-- \c translateai;

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  original_file_name VARCHAR(255) NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language VARCHAR(10),
  target_language VARCHAR(10) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  page_count INTEGER,
  high_fidelity BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON translations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translations_target_language ON translations(target_language);
CREATE INDEX IF NOT EXISTS idx_translations_file_name ON translations(original_file_name);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_translations_updated_at 
    BEFORE UPDATE ON translations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for translation statistics
CREATE OR REPLACE VIEW translation_stats AS
SELECT 
    COUNT(*) as total_translations,
    SUM(file_size) as total_size_processed,
    SUM(page_count) as total_pages_translated,
    COUNT(DISTINCT target_language) as languages_used,
    DATE_TRUNC('day', created_at) as translation_date
FROM translations
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY translation_date DESC;

