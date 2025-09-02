import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromDocument } from '@/utils/textExtraction';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or Word document.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Extract text from the document
    const extractedText = await extractTextFromDocument(file);

    return NextResponse.json({
      content: extractedText.content,
      pageCount: extractedText.pageCount,
      wordCount: extractedText.wordCount,
      language: extractedText.language,
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from document';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
