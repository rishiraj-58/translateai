import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

// Make sure to set your API key in your environment variables
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (Gemini has limits, so we'll be conservative)
    if (file.size > 20 * 1024 * 1024) { // 20MB limit for Gemini
      return NextResponse.json(
        { error: 'File size must be less than 20MB for AI processing' },
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

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
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
      You are an expert multilingual translator. Analyze the attached document and perform these tasks:

      1. EXTRACT TEXT: Extract ALL readable text from the document, including:
         - Malayalam, Hindi, Arabic, Tamil, Telugu, Kannada, and other complex scripts
         - English and Latin-script languages
         - Any text embedded in images (use OCR capabilities)
         - Headers, footers, footnotes, and all content areas

      2. TRANSLATE: Translate the extracted text into natural, fluent English while:
         - Preserving the original meaning and context
         - Maintaining proper grammar and flow
         - Keeping technical terms and proper names in appropriate form
         - Handling cultural nuances correctly

      3. FORMAT: Return ONLY the translated English text as a continuous, well-formatted block.
         - No preambles, explanations, or meta-commentary
         - No "Here's the translation:" or similar phrases
         - Just the clean, translated content

      4. QUALITY CHECK: If no meaningful text can be extracted, return an empty string.

      Focus on accuracy and readability. The document may contain complex scripts like Malayalam - extract and translate them properly.
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
      processingMethod: 'ai-powered'
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process document with AI';

    // Provide helpful error messages
    let userFriendlyMessage = 'Failed to process the document. ';
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      userFriendlyMessage += 'API quota exceeded. Please try again later.';
    } else if (errorMessage.includes('size') || errorMessage.includes('large')) {
      userFriendlyMessage += 'File is too large for AI processing.';
    } else if (errorMessage.includes('format') || errorMessage.includes('type')) {
      userFriendlyMessage += 'Unsupported file format.';
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
