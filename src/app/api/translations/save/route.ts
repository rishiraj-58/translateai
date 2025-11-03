import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { initializeDatabase } from '@/utils/initDb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      originalFileName,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      fileType,
      fileSize,
      pageCount,
      highFidelity
    } = body;

    // Validate required fields
    if (!originalFileName || !translatedText || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: originalFileName, translatedText, targetLanguage' },
        { status: 400 }
      );
    }

    // Ensure database schema exists
    try {
      await initializeDatabase();
    } catch (initError) {
      console.log('Database already initialized or initialization error:', initError);
    }

    // Save translation to database
    const result = await query(
      `INSERT INTO translations 
        (original_file_name, original_text, translated_text, source_language, 
         target_language, file_type, file_size, page_count, high_fidelity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at`,
      [
        originalFileName,
        originalText || '',
        translatedText,
        sourceLanguage || 'auto',
        targetLanguage,
        fileType || 'unknown',
        fileSize || 0,
        pageCount || 0,
        highFidelity || false
      ]
    );

    const savedTranslation = result.rows[0];

    return NextResponse.json({
      success: true,
      translationId: savedTranslation.id,
      createdAt: savedTranslation.created_at,
      message: 'Translation saved successfully'
    });

  } catch (error) {
    console.error('Error saving translation:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please ensure PostgreSQL is running.',
          details: error.message 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to save translation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

