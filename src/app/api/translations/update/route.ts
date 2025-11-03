import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { id, translatedText } = body;

    if (!id || !translatedText) {
      return NextResponse.json(
        { error: 'Missing required fields: id, translatedText' },
        { status: 400 }
      );
    }

    // Update translation in database
    const result = await query(
      `UPDATE translations 
       SET translated_text = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, updated_at`,
      [translatedText, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Translation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      updatedAt: result.rows[0].updated_at,
      message: 'Translation updated successfully'
    });

  } catch (error) {
    console.error('Error updating translation:', error);
    
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: error.message 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update translation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

