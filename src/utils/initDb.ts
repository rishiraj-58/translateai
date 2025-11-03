import { query } from './db';

/**
 * Initialize the database schema
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database schema...');

    // Create translations table
    await query(`
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
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_translations_created_at 
      ON translations(created_at DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_translations_target_language 
      ON translations(target_language)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_translations_file_name 
      ON translations(original_file_name)
    `);

    // Create update trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger
    await query(`
      DROP TRIGGER IF EXISTS update_translations_updated_at ON translations
    `);

    await query(`
      CREATE TRIGGER update_translations_updated_at 
        BEFORE UPDATE ON translations 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Check if database connection is working
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

