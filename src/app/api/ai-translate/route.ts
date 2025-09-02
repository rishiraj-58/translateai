import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';

// Make sure to set your API key in your environment variables
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Constants for chunking and retries
const CHUNK_SIZE_IN_PAGES = 75; // Default chunk size for PDF processing
const MAX_RETRIES = 3; // Maximum retry attempts per chunk
const RETRY_DELAY_MS = 5000; // Delay between retry attempts (5 seconds)

// Function to convert a File object to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File) {
  const base64EncodedData = Buffer.from(await file.arrayBuffer()).toString('base64');
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

// Function to convert buffer to Gemini format
function bufferToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (Increased for large books with chunking)
    if (file.size > 200 * 1024 * 1024) { // 200MB limit for very large books
      return NextResponse.json(
        { error: 'File size must be less than 200MB for AI processing' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Please upload a PDF, Word document, or image file (JPEG, PNG, WebP, GIF)' },
        { status: 400 }
      );
    }

    console.log('AI Translation - Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Check if this is a large document that needs chunking
    const needsChunking = file.size > 10 * 1024 * 1024 || file.type === 'application/pdf';

    if (needsChunking && file.type === 'application/pdf') {
      // Handle large PDFs with automated chunking
      return await processLargePDF(file);
    } else {
      // Handle smaller documents or images directly
      return await processDirect(file);
    }

  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process document with AI';

    // Provide helpful error messages
    let userFriendlyMessage = 'Failed to process the document. ';
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      userFriendlyMessage += 'API quota exceeded. Please try again later.';
    } else if (errorMessage.includes('size') || errorMessage.includes('large')) {
      userFriendlyMessage += 'File is too large for AI processing.';
    } else if (errorMessage.includes('token')) {
      userFriendlyMessage += 'Document is too large. It will be processed in chunks.';
    } else {
      userFriendlyMessage += 'Please check the file and try again.';
    }

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Process smaller documents directly
async function processDirect(file: File) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const filePart = await fileToGenerativePart(file);

  const prompt = `
    You are an expert multilingual translator specializing in literary and cultural works. Analyze the attached document and perform these tasks:

    DOCUMENT ANALYSIS & STRUCTURE:
    1. **Analyze Structure**: Identify if this is a book, article, or document. Look for:
       - Chapters, sections, or headings
       - Table of contents, page numbers, headers/footers
       - Multi-page layout and document organization

    TEXT EXTRACTION:
    2. **Extract ALL Text**: Extract every piece of readable text including:
       - Malayalam, Hindi, Arabic, Tamil, Telugu, Kannada, and other complex scripts
       - English and Latin-script languages
       - Text embedded in images (use OCR capabilities)
       - Headers, footers, footnotes, sidebars, and all content areas
       - Mathematical equations, tables, and special formatting (describe them clearly)

    TRANSLATION PROCESS:
    3. **Translate Intelligently**: For large documents/books:
       - Process from beginning to end, maintaining chapter/section flow
       - Preserve the author's tone, style, and literary nuances
       - Keep technical terms, proper names, and cultural references intact
       - Use clear separators for chapters: "--- Chapter X: Title ---"
       - Maintain paragraph breaks and document structure

    4. **Handle Complex Scripts**: Pay special attention to:
       - Malayalam character combinations and vowel signs
       - Cultural context and regional expressions
       - Idiomatic expressions and literary devices

    OUTPUT FORMAT:
    5. **Return Clean Translation**: Provide ONLY the translated English text:
       - No preambles, explanations, or meta-commentary
       - No "Here's the translation:" or similar phrases
       - Just the complete, well-formatted translated content
       - Preserve document structure and readability

    QUALITY ASSURANCE:
    6. **Quality Check**: If no meaningful text can be extracted, return an empty string.

    This document may be a large book or complex document. Process it as a complete work while maintaining its structural integrity and literary quality.
  `;

  console.log('Sending to Gemini API for processing...');

  const result = await model.generateContent([prompt, filePart]);
  const response = result.response;
  const translatedText = response.text();

  console.log('Gemini API processing completed successfully');

  if (!translatedText || translatedText.trim().length === 0) {
    return NextResponse.json({
      error: 'Could not extract or translate text from the document. The document might contain only images without readable text, or the content might be in an unsupported format.'
    }, { status: 400 });
  }

  // Calculate some basic stats
  const wordCount = translatedText.trim().split(/\s+/).length;
  const charCount = translatedText.length;

  console.log(`Translation completed: ${wordCount} words, ${charCount} characters`);

  return NextResponse.json({
    translatedContent: translatedText.trim(),
    wordCount,
    charCount,
    originalFileName: file.name,
    processingMethod: 'direct-ai'
  });
}

// Process large PDFs with automated chunking
async function processLargePDF(file: File) {
  console.log('Processing large PDF with automated chunking...');

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Load the PDF to check page count
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  // Determine chunk size based on file size and page count
  let chunkSize = 100; // Default chunk size

  // Adjust chunk size based on file characteristics
  if (file.size > 50 * 1024 * 1024) { // Files larger than 50MB
    chunkSize = 50; // Smaller chunks for very large files
  } else if (totalPages > 500) { // Very long documents
    chunkSize = 75; // Medium chunks for long documents
  } else if (totalPages < 50) { // Short documents
    chunkSize = 150; // Larger chunks for short documents
  }

  const totalChunks = Math.ceil(totalPages / chunkSize);

  console.log(`📄 PDF loaded: ${totalPages} pages total`);
  console.log(`📦 Will process in ${totalChunks} chunks of up to ${chunkSize} pages each`);
  console.log(`🔄 Features: Streaming responses + Automatic retries (${MAX_RETRIES} max per chunk)`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  let fullTranslatedText = '';
  let processedPages = 0;
  let successfulChunks = 0;

  // Process the PDF in chunks with streaming and retries
  for (let i = 0; i < totalPages; i += chunkSize) {
    const chunkNumber = Math.floor(i / chunkSize) + 1;
    const startPage = i;
    const endPage = Math.min(i + chunkSize, totalPages);

    console.log(`\n📋 --- Processing Chunk ${chunkNumber}/${totalChunks}: Pages ${startPage + 1} to ${endPage} ---`);

    // Create a new PDF document with the pages for the current chunk
    const subDoc = await PDFDocument.create();
    const pagesToCopy = Array.from({ length: endPage - startPage }, (_, k) => startPage + k);
    const copiedPages = await subDoc.copyPages(pdfDoc, pagesToCopy);
    copiedPages.forEach(page => subDoc.addPage(page));

    const chunkBuffer = Buffer.from(await subDoc.save());
    const filePart = bufferToGenerativePart(chunkBuffer, 'application/pdf');

    const prompt = `
      You are an expert literary translator specializing in Malayalam to English translation.

      This is CHUNK ${chunkNumber} of ${totalChunks} from a larger book/document.
      The attached PDF contains pages ${startPage + 1} to ${endPage} of the original document.

      Your task:
      1. Extract ALL text from these pages, including Malayalam and other complex scripts
      2. Translate the content to English while preserving:
         - Literary style and tone
         - Cultural context and nuances
         - Technical terms and proper names
         - Paragraph structure and formatting

      3. Return ONLY the translated English text for these pages
      4. Do not add any preambles, explanations, or chunk identifiers
      5. If this is a continuation of previous content, ensure smooth flow

      Focus on accuracy and maintaining the document's literary quality.
    `;

    // Streaming and Retry Logic
    let attempt = 0;
    let success = false;
    let translatedChunk = '';

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        console.log(`  🔄 Attempt ${attempt}/${MAX_RETRIES} for chunk ${chunkNumber}...`);

        // Use streaming for better reliability and real-time feedback
        const result = await model.generateContentStream([prompt, filePart]);

        // Process the stream in real-time
        console.log('  📝 Streaming translation...');
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            process.stdout.write(chunkText); // Show progress in real-time
            translatedChunk += chunkText;
          }
        }
        console.log('\n  ✅ Stream completed successfully');

        // Add the translated chunk to the full text
        if (translatedChunk && translatedChunk.trim().length > 0) {
          // Add chunk separator for better organization
          if (fullTranslatedText.length > 0) {
            fullTranslatedText += '\n\n' + '='.repeat(50) + '\n';
            fullTranslatedText += `Pages ${startPage + 1}-${endPage}\n`;
            fullTranslatedText += '='.repeat(50) + '\n\n';
          }

          fullTranslatedText += translatedChunk.trim();
          processedPages += (endPage - startPage);
          successfulChunks++;
          success = true;

          console.log(`  🎯 Chunk ${chunkNumber}/${totalChunks} completed successfully!`);
          console.log(`  📊 Chunk stats: ${translatedChunk.length} characters, ${endPage - startPage} pages`);
        } else {
          console.log(`  ⚠️  Chunk ${chunkNumber}/${totalChunks} returned empty content`);
          // Don't retry if we get empty content, just move to next chunk
          success = true;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error on attempt ${attempt} for chunk ${chunkNumber}:`, errorMessage);

        if (attempt < MAX_RETRIES) {
          console.log(`  ⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.log(`  💥 Failed chunk ${chunkNumber} after ${MAX_RETRIES} attempts. Moving to next chunk.`);
          // Continue with next chunk instead of failing completely
          success = true;
        }
      }
    }

    // Add a small delay between chunks to be respectful to the API
    if (i + chunkSize < totalPages && success) {
      console.log(`  😴 Waiting 2 seconds before next chunk...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!fullTranslatedText || fullTranslatedText.trim().length === 0) {
    return NextResponse.json({
      error: 'Could not extract or translate text from any part of the document.'
    }, { status: 400 });
  }

  // Calculate final stats
  const wordCount = fullTranslatedText.trim().split(/\s+/).length;
  const charCount = fullTranslatedText.length;

  console.log(`\n🎉 LARGE DOCUMENT TRANSLATION COMPLETED!`);
  console.log(`📊 FINAL STATS:`);
  console.log(`   • Total words: ${wordCount}`);
  console.log(`   • Total characters: ${charCount}`);
  console.log(`   • Pages processed: ${processedPages}/${totalPages}`);
  console.log(`   • Successful chunks: ${successfulChunks}/${totalChunks}`);
  console.log(`   • Processing method: Streaming with automatic retries`);

  return NextResponse.json({
    translatedContent: fullTranslatedText.trim(),
    wordCount,
    charCount,
    originalFileName: file.name,
    processingMethod: 'streaming-chunked-ai',
    totalPages: totalPages,
    processedPages: processedPages,
    chunksProcessed: totalChunks,
    successfulChunks: successfulChunks
  });
}