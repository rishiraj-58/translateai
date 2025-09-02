import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback method to extract raw text from PDF structure
 */
function extractRawPDFText(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8', { fatal: false });

    // Try to decode as UTF-8 text
    let rawText = textDecoder.decode(uint8Array);

    // Clean up the text by removing PDF-specific markers
    rawText = rawText
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
      .replace(/\/[A-Za-z]+/g, ' ') // Remove PDF object references
      .replace(/\d+\s+\d+\s+obj/g, '') // Remove object markers
      .replace(/endobj/g, '') // Remove end object markers
      .replace(/stream[\s\S]*?endstream/g, '') // Remove stream content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Try to extract readable text between parentheses and brackets
    const textMatches = rawText.match(/\(([^)]+)\)/g);
    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (extractedText.length > 20) { // Only return if we have meaningful content
        return extractedText;
      }
    }

    return rawText.length > 50 ? rawText : '';

  } catch (error) {
    console.error('Raw text extraction failed:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);

    // Check PDF header
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 8));
    const header = String.fromCharCode(...uint8Array);
    console.log('File header:', header);

    if (!header.startsWith('%PDF-')) {
      return NextResponse.json({ error: 'Not a valid PDF file' }, { status: 400 });
    }

    // Try to parse PDF using pdf-parse (same as main application)
    try {
      const pdfParse = (await import('pdf-parse')).default;
      console.log('pdf-parse imported successfully');

      // Set timeout for parsing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF parsing timeout')), 30000);
      });

      const buffer = Buffer.from(arrayBuffer);
      const parsePromise = pdfParse(buffer);
      const data = await Promise.race([parsePromise, timeoutPromise]) as any;

      const fullText = (data.text || '').trim();
      const textLength = fullText.length;

      console.log('PDF parsed successfully:', {
        pages: data.numpages || 1,
        textLength: textLength
      });

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileSize: file.size,
        pages: data.numpages || 1,
        textLength: textLength,
        textPreview: fullText.substring(0, 300) || 'No text found',
      });
    } catch (parseError) {
      // Check if it's the known test file error - skip pdf-parse entirely if so
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      if (errorMessage.includes('test/data/') || errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
        console.log('pdf-parse has known test file issues, using raw text extraction...');
      } else {
        console.log('pdf-parse failed, using raw text extraction:', parseError);
      }

      // Use final fallback method
      const rawText = extractRawPDFText(arrayBuffer);
      const textLength = rawText.length;

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileSize: file.size,
        pages: 1,
        textLength: textLength,
        textPreview: rawText.substring(0, 300) || 'No text found',
        method: 'fallback'
      });
    }

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
