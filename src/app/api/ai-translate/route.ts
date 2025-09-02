import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

// Make sure to set your API key in your environment variables
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Constants for PDF processing
const MAX_RETRIES = 3; // Maximum retry attempts per chunk
const RETRY_DELAY_MS = 5000; // Delay between retry attempts (5 seconds)



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
    const targetLanguage = (formData.get('targetLanguage') as string) || 'en';
    const useHighFidelity = formData.get('highFidelity') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > 200 * 1024 * 1024) { // 200MB limit
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

    console.log(`AI Translation - Processing file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    // NEW APPROACH: Let Gemini handle the PDF directly
    const result = await processPDFWithGemini(file, targetLanguage, useHighFidelity);

    return NextResponse.json({
      ...result,
      originalFileName: file.name,
      targetLanguage,
      highFidelity: useHighFidelity
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process document with AI';

    return NextResponse.json(
      {
        error: `Processing failed: ${errorMessage}`,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// NEW APPROACH: Let Gemini handle PDF processing directly
async function processPDFWithGemini(file: File, targetLanguage: string, useHighFidelity: boolean) {
  console.log(`Processing PDF with Gemini directly (High-Fidelity: ${useHighFidelity})`);

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  console.log(`PDF loaded: ${totalPages} pages total`);

  // Determine chunk size based on file size
  let chunkSize = 50; // Default chunk size
  if (file.size > 50 * 1024 * 1024) { // Files larger than 50MB
    chunkSize = 25; // Smaller chunks for large files
  } else if (totalPages > 200) { // Very long documents
    chunkSize = 30; // Medium chunks for long documents
  }

  const totalChunks = Math.ceil(totalPages / chunkSize);
  console.log(`Processing in ${totalChunks} chunks of up to ${chunkSize} pages each`);

  let fullTranslatedText = '';
  const processedPages = 0;

  for (let i = 0; i < totalPages; i += chunkSize) {
    const chunkNumber = Math.floor(i / chunkSize) + 1;
    const startPage = i;
    const endPage = Math.min(i + chunkSize, totalPages);

    console.log(`\n--- Processing Chunk ${chunkNumber}/${totalChunks}: Pages ${startPage + 1} to ${endPage} ---`);

    // Create a new PDF document for the current chunk
    const subDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: endPage - startPage }, (_, k) => startPage + k);
    const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => subDoc.addPage(page));
    const chunkBuffer = Buffer.from(await subDoc.save());

    const filePart = bufferToGenerativePart(chunkBuffer, 'application/pdf');

    // Language mapping for prompts
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'ml': 'Malayalam',
      'te': 'Telugu'
    };

    const targetLanguageName = languageNames[targetLanguage] || 'English';

    // CRITICAL: Let Gemini handle text extraction and translation
    const prompt = useHighFidelity
      ? `You are an expert document translator and analyst. The attached PDF is a chunk of a larger book/document.

Your task is to:
1. Read and analyze the document structure, identifying headings, paragraphs, lists, and content organization.
2. Extract ALL text from the document, including complex scripts and fonts.
3. Translate the extracted text into ${targetLanguageName}, preserving the original structure and formatting.
4. Return the translated content in a structured format that maintains the document's hierarchy.

IMPORTANT: Return ONLY the translated ${targetLanguageName} text with proper structure. Do not include any commentary, explanations, or markdown formatting. Maintain paragraph breaks and document organization.`

      : `You are an expert document translator. The attached PDF document contains Malayalam text from a book.

Your task is to:
1. Read the document and accurately extract all Malayalam text.
2. Translate the extracted text into ${targetLanguageName}.
3. Return ONLY the final, translated ${targetLanguageName} text. Maintain paragraph breaks.
4. Do not include any commentary, apologies, or summaries.

Focus on accuracy and maintaining the document's literary quality. Translate everything to ${targetLanguageName}.`;

    let attempt = 0;
    let success = false;
    let translatedChunk = '';

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        console.log(`  Attempt ${attempt}/${MAX_RETRIES} for chunk ${chunkNumber}...`);

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

        const result = await model.generateContentStream([prompt, filePart]);

        console.log('  📝 Processing translation stream...');
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            process.stdout.write(chunkText); // Live output
            translatedChunk += chunkText;
          }
        }

        if (translatedChunk && translatedChunk.trim().length > 0) {
          // Add chunk separator for better organization
          if (fullTranslatedText.length > 0) {
            fullTranslatedText += '\n\n--- Page Break ---\n\n';
          }

          fullTranslatedText += translatedChunk.trim();
          success = true;
          console.log(`\n  ✅ Chunk ${chunkNumber}/${totalChunks} completed successfully!`);
          console.log(`  📊 Chunk stats: ${translatedChunk.length} characters`);
        } else {
          console.log(`  ⚠️  Chunk ${chunkNumber}/${totalChunks} returned empty content`);
          success = true; // Don't retry if we get empty content
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error on attempt ${attempt} for chunk ${chunkNumber}:`, errorMessage);

        if (attempt < MAX_RETRIES) {
          console.log(`  ⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
          await delay(RETRY_DELAY_MS);
        } else {
          console.log(`  💥 Failed chunk ${chunkNumber} after ${MAX_RETRIES} attempts. Moving to next chunk.`);
          success = true; // Continue with next chunk
        }
      }
    }

    // Add delay between chunks to respect rate limits
    if (i + chunkSize < totalPages && success) {
      console.log(`  😴 Waiting 2 seconds before next chunk...`);
      await delay(2000);
    }
  }

  if (!fullTranslatedText || fullTranslatedText.trim().length === 0) {
    throw new Error('Could not extract or translate text from any part of the document.');
  }

  // Calculate final stats
  const wordCount = fullTranslatedText.trim().split(/\s+/).length;
  const charCount = fullTranslatedText.length;

  console.log('\n🎉 PDF Translation Completed!');
  console.log(`📊 Final Stats:`);
  console.log(`   • Total words: ${wordCount}`);
  console.log(`   • Total characters: ${charCount}`);
  console.log(`   • Pages processed: ${totalPages}`);
  console.log(`   • Chunks processed: ${totalChunks}`);

  if (useHighFidelity) {
    // For high-fidelity mode, also create a DOCX file
    console.log('📄 Creating high-fidelity DOCX file...');
    const docxBuffer = await createHighFidelityDocx(fullTranslatedText);

    return {
      translatedContent: fullTranslatedText.trim(),
      wordCount,
      charCount,
      processingMethod: 'high-fidelity-ai',
      totalPages,
      docxBuffer: docxBuffer.toString('base64')
    };
  }

  return {
    translatedContent: fullTranslatedText.trim(),
    wordCount,
    charCount,
    processingMethod: 'direct-pdf-ai'
  };
}

// Create high-fidelity DOCX from translated text
async function createHighFidelityDocx(translatedText: string) {
  const sections = [];

  // Split text into paragraphs
  const paragraphs = translatedText.split('\n\n').filter(p => p.trim().length > 0);

  for (const paragraph of paragraphs) {
    if (paragraph.includes('--- Page Break ---')) {
      // Skip page break markers
      continue;
    }

    // Simple paragraph creation
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: paragraph.trim(),
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{
      children: sections,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// Utility function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
