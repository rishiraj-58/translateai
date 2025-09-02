import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromDocument } from '@/utils/textExtraction';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File is too large (max 50MB)' }, { status: 400 });
    }

    // Validate file type
    const fileType = file.type.toLowerCase();
    if (!fileType.includes('pdf') && !fileType.includes('word') && !fileType.includes('document')) {
      return NextResponse.json({ error: 'Please upload a PDF or Word document' }, { status: 400 });
    }

    console.log('Test extraction - File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Extract text using our improved extraction method
    const extractedData = await extractTextFromDocument(file);

    if (!extractedData.content || extractedData.content.trim().length === 0) {
      // Provide more detailed debugging information
      const debugInfo = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        extractedData: {
          pageCount: extractedData.pageCount,
          wordCount: extractedData.wordCount,
          language: extractedData.language,
          contentLength: extractedData.content ? extractedData.content.length : 0,
          contentPreview: extractedData.content ? extractedData.content.substring(0, 200) : 'null'
        },
        possibleIssues: [
          'PDF contains only scanned images without embedded text',
          'PDF is password-protected',
          'PDF uses an unsupported encoding or font',
          'Text is embedded as images rather than selectable text',
          'PDF is corrupted or has formatting issues'
        ]
      };

      return NextResponse.json({
        error: 'No text content found in the document.',
        debug: debugInfo,
        suggestions: [
          'Try a different PDF file',
          'Use OCR software on scanned PDFs first',
          'Check if the PDF is password-protected',
          'Ensure the PDF contains selectable text (not just images)'
        ]
      }, { status: 400 });
    }

    // Return the raw extracted text as plain text
    const responseText = `EXTRACTED TEXT FROM: ${file.name}
FILE SIZE: ${(file.size / 1024 / 1024).toFixed(2)} MB
DETECTED LANGUAGE: ${extractedData.language || 'unknown'}
WORD COUNT: ${extractedData.wordCount}
PAGE COUNT: ${extractedData.pageCount || 'N/A'}

================================================================================

${extractedData.content}

================================================================================

EXTRACTION COMPLETED
Language: ${extractedData.language || 'unknown'}
Total Words: ${extractedData.wordCount}
Total Characters: ${extractedData.content.length}
`;

    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, '')}_extracted.txt"`,
      },
    });

  } catch (error) {
    console.error('Test extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during text extraction';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
