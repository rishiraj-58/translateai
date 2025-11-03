import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { checkDatabaseConnection } from '@/utils/initDb';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed. Please ensure PostgreSQL is running.' },
        { status: 503 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const targetLanguage = searchParams.get('targetLanguage');

    // Build query
    let queryText = `
      SELECT 
        id,
        original_file_name,
        SUBSTRING(translated_text, 1, 500) as translated_preview,
        source_language,
        target_language,
        file_type,
        file_size,
        page_count,
        high_fidelity,
        created_at,
        updated_at
      FROM translations
    `;

    const queryParams: any[] = [];
    
    if (targetLanguage) {
      queryText += ' WHERE target_language = $1';
      queryParams.push(targetLanguage);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);

    // Execute query
    const result = await query(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM translations';
    const countParams: any[] = [];
    
    if (targetLanguage) {
      countQuery += ' WHERE target_language = $1';
      countParams.push(targetLanguage);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      translations: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch translations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

