import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid translation ID' },
        { status: 400 }
      );
    }

    // Fetch full translation
    const result = await query(
      `SELECT 
        id,
        original_file_name,
        original_text,
        translated_text,
        source_language,
        target_language,
        file_type,
        file_size,
        page_count,
        high_fidelity,
        created_at,
        updated_at
      FROM translations
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Translation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      translation: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching translation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch translation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid translation ID' },
        { status: 400 }
      );
    }

    // Delete translation
    const result = await query(
      'DELETE FROM translations WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Translation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Translation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting translation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete translation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

