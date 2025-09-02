import mammoth from 'mammoth';

export interface ExtractedText {
  content: string;
  pageCount?: number;
  wordCount: number;
  language?: string;
}

export interface TextChunk {
  content: string;
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedText> {
  try {
    // Validate file size
    if (file.size === 0) {
      throw new Error('PDF file is empty');
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('PDF file is too large (max 50MB)');
    }

    const arrayBuffer = await file.arrayBuffer();

    // Check if file starts with PDF header
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 8));
    const header = String.fromCharCode(...uint8Array);
    if (!header.startsWith('%PDF-')) {
      throw new Error('File does not appear to be a valid PDF');
    }

    // Try pdf-parse first (more reliable for text extraction)
    try {
      console.log('Attempting PDF parsing with pdf-parse...');
      const pdfParse = (await import('pdf-parse')).default;

      // Set a timeout for PDF parsing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF parsing timeout')), 30000);
      });

      const buffer = Buffer.from(arrayBuffer);
      const parsePromise = pdfParse(buffer);
      const data = await Promise.race([parsePromise, timeoutPromise]) as any;

      const content = (data.text || '').trim();

      if (content && content.length > 10) { // Ensure we have meaningful content
        const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;

        return {
          content,
          pageCount: data.numpages || 1,
          wordCount,
          language: detectLanguage(content)
        };
      }

      console.log('pdf-parse returned insufficient content, trying fallback...');
    } catch (pdfParseError) {
      // Check if it's the known test file error - skip pdf-parse entirely if so
      const errorMessage = pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError);
      if (errorMessage.includes('test/data/') || errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
        console.log('pdf-parse has known test file issues, using raw text extraction...');
      } else {
        console.log('pdf-parse failed, using raw text extraction:', pdfParseError);
      }
    }

    // Final fallback: Try to extract raw text from PDF structure
    console.log('Using final fallback: enhanced raw PDF text extraction...');
    const rawText = extractRawPDFText(arrayBuffer);

    console.log(`Raw text extraction result: ${rawText.length} characters`);
    if (rawText.length > 0) {
      console.log(`First 500 characters: "${rawText.substring(0, 500)}"`);
    }

    if (rawText && rawText.length > 10) {
      const wordCount = rawText.split(/\s+/).filter((word: string) => word.length > 0).length;

      return {
        content: rawText,
        pageCount: 1, // Can't determine page count with raw extraction
        wordCount,
        language: detectLanguage(rawText)
      };
    }

    // Provide detailed debugging information
    console.log('PDF extraction failed with detailed analysis:');
    console.log(`- File size: ${arrayBuffer.byteLength} bytes`);
    console.log(`- PDF header check: ${String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 8))).startsWith('%PDF-') ? 'Valid' : 'Invalid'}`);
    console.log('- Possible issues:');
    console.log('  * PDF contains only scanned images without embedded text');
    console.log('  * PDF is password-protected');
    console.log('  * PDF uses an unsupported encoding or font');
    console.log('  * Text is embedded as images rather than selectable text');
    console.log('  * PDF is corrupted or has formatting issues');

    throw new Error('No readable text content found in PDF. The document might contain only images, be password-protected, or use an unsupported format.');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}



/**
 * Enhanced fallback method to extract text from PDF structure
 */
function extractRawPDFText(arrayBuffer: ArrayBuffer): string {
  try {
    console.log('Attempting enhanced raw PDF text extraction...');

    const uint8Array = new Uint8Array(arrayBuffer);

    // Try multiple encodings and approaches
    const encodings = ['utf-8', 'latin1', 'windows-1252', 'iso-8859-1'];
    let bestText = '';
    let maxLength = 0;

    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: false });
        const decoded = decoder.decode(uint8Array);

        if (decoded && decoded.length > maxLength) {
          bestText = decoded;
          maxLength = decoded.length;
        }
      } catch (e) {
        // Skip this encoding if it fails
        continue;
      }
    }

    if (!bestText) {
      throw new Error('Could not decode PDF content with any encoding');
    }

    console.log(`Decoded ${bestText.length} characters using best encoding`);

    // Clean up the text by removing PDF-specific markers but preserving text content
    let cleanedText = bestText
      .replace(/%PDF-\d+\.\d+/g, '') // Remove PDF header
      .replace(/%%EOF/g, '') // Remove PDF footer
      .replace(/xref[\s\S]*?trailer/g, '') // Remove xref table
      .replace(/startxref[\s\S]*$/g, ''); // Remove startxref section

    // Extract text from various PDF text formats
    const extractedTexts: string[] = [];

    // Method 1: Extract from BT/ET text blocks (most common)
    const textBlocks = cleanedText.match(/BT[\s\S]*?ET/g);
    if (textBlocks) {
      for (const block of textBlocks) {
        // Extract text between parentheses and handle Tj operators
        const tjMatches = block.match(/\(?([^\(\)]+)\)?\s*Tj/g);
        if (tjMatches) {
          for (const match of tjMatches) {
            const text = match.replace(/[\(\)]/g, '').replace(/\s*Tj$/, '').trim();
            if (text.length > 0) {
              extractedTexts.push(text);
            }
          }
        }

        // Also try simple parentheses extraction
        const parenMatches = block.match(/\(([^)]+)\)/g);
        if (parenMatches) {
          for (const match of parenMatches) {
            const text = match.slice(1, -1).trim();
            if (text.length > 0 && text.length < 1000) { // Avoid very long matches
              extractedTexts.push(text);
            }
          }
        }
      }
    }

    // Method 2: Extract from Tj operators throughout the document
    const tjOperators = cleanedText.match(/\(?([^\(\)]+)\)?\s*Tj/g);
    if (tjOperators) {
      for (const match of tjOperators) {
        const text = match.replace(/[\(\)]/g, '').replace(/\s*Tj$/, '').trim();
        if (text.length > 0 && text.length < 500) {
          extractedTexts.push(text);
        }
      }
    }

    // Method 3: Extract readable sequences between PDF commands
    const readableSequences = cleanedText.match(/[A-Za-z\u0D00-\u0D7F\u0900-\u097F\u0980-\u09FF]{3,}/g);
    if (readableSequences) {
      for (const seq of readableSequences) {
        if (seq.length > 3 && seq.length < 200) {
          extractedTexts.push(seq);
        }
      }
    }

    // Method 4: Look for Malayalam-specific patterns
    const malayalamPattern = /[\u0D00-\u0D7F\u0D80-\u0DFF]{2,}/g;
    const malayalamMatches = bestText.match(malayalamPattern);
    if (malayalamMatches) {
      extractedTexts.push(...malayalamMatches);
    }

    // Remove duplicates and clean up
    const uniqueTexts = [...new Set(extractedTexts)]
      .filter(text => text.trim().length > 0)
      .filter(text => !/^\d+$/.test(text)) // Remove pure numbers
      .filter(text => !/^\/[A-Za-z]+$/.test(text)) // Remove PDF commands
      .map(text => text.trim());

    if (uniqueTexts.length > 0) {
      const finalText = uniqueTexts.join(' ');
      console.log(`Successfully extracted ${uniqueTexts.length} text segments, total ${finalText.length} characters`);

      // Log first few extracted segments for debugging
      console.log('Sample extracted segments:', uniqueTexts.slice(0, 5));

      return finalText;
    }

    // Final fallback: Look for any readable content
    const anyReadable = cleanedText
      .replace(/[^\w\u0D00-\u0D7F\u0900-\u097F\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (anyReadable.length > 50) {
      console.log(`Found ${anyReadable.length} characters of readable content in fallback`);
      return anyReadable;
    }

    console.log('No readable text content found in PDF after all extraction attempts');
    return '';

  } catch (error) {
    console.error('Enhanced raw text extraction failed:', error);
    return '';
  }
}

/**
 * Extract text from Word document
 */
export async function extractTextFromWord(file: File): Promise<ExtractedText> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });

    const content = result.value;
    const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      content,
      wordCount,
      language: detectLanguage(content)
    };
  } catch (error) {
    console.error('Error extracting text from Word document:', error);
    throw new Error('Failed to extract text from Word document. The file might be corrupted.');
  }
}

/**
 * Extract text from any supported document type
 */
export async function extractTextFromDocument(file: File): Promise<ExtractedText> {
  const fileType = file.type.toLowerCase();

  if (fileType === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return extractTextFromWord(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Word document.');
  }
}

/**
 * Split text into manageable chunks for translation
 */
export function chunkText(text: string, maxChunkSize: number = 2000): TextChunk[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let startIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    if (potentialChunk.length > maxChunkSize && currentChunk) {
      // Create chunk with current content
      chunks.push({
        content: currentChunk,
        startIndex,
        endIndex: startIndex + currentChunk.length
      });

      // Start new chunk
      currentChunk = sentence;
      startIndex = startIndex + currentChunk.length + 1;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add remaining content
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      startIndex,
      endIndex: startIndex + currentChunk.length
    });
  }

  return chunks;
}

/**
 * Intelligent chunking for large documents
 * Considers paragraphs, sections, and maintains context
 */
export function intelligentChunkText(text: string, targetChunkSize: number = 2000): TextChunk[] {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let startIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (potentialChunk.length > targetChunkSize && currentChunk) {
      // If current chunk is getting too large, create a new chunk
      chunks.push({
        content: currentChunk,
        startIndex,
        endIndex: startIndex + currentChunk.length
      });

      currentChunk = paragraph;
      startIndex = startIndex + currentChunk.length + 2; // +2 for \n\n
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add remaining content
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      startIndex,
      endIndex: startIndex + currentChunk.length
    });
  }

  // If chunks are still too small, try to merge smaller ones
  return mergeSmallChunks(chunks, targetChunkSize * 0.7);
}

/**
 * Merge chunks that are smaller than the minimum size
 */
function mergeSmallChunks(chunks: TextChunk[], minChunkSize: number): TextChunk[] {
  const merged: TextChunk[] = [];
  let currentChunk: TextChunk | null = null;

  for (const chunk of chunks) {
    if (!currentChunk) {
      currentChunk = { ...chunk };
    } else if (currentChunk.content.length < minChunkSize) {
      // Merge with previous chunk
      currentChunk.content = `${currentChunk.content}\n\n${chunk.content}`;
      currentChunk.endIndex = chunk.endIndex;
    } else {
      merged.push(currentChunk);
      currentChunk = { ...chunk };
    }
  }

  if (currentChunk) {
    merged.push(currentChunk);
  }

  return merged;
}

/**
 * Advanced language detection based on common patterns and character sets
 * Supports major world languages including Malayalam, Hindi, Arabic, etc.
 */
function detectLanguage(text: string): string {
  const sample = text.substring(0, 2000).toLowerCase();

  // Unicode character set detection for non-Latin scripts
  if (/[\u0980-\u09ff]/.test(sample)) return 'bn'; // Bengali
  if (/[\u0a80-\u0aff]/.test(sample)) return 'gu'; // Gujarati
  if (/[\u0a00-\u0a7f]/.test(sample)) return 'pa'; // Punjabi (Gurmukhi)
  if (/[\u0b00-\u0b7f]/.test(sample)) return 'or'; // Odia
  if (/[\u0b80-\u0bff]/.test(sample)) return 'ta'; // Tamil
  if (/[\u0c00-\u0c7f]/.test(sample)) return 'te'; // Telugu
  if (/[\u0c80-\u0cff]/.test(sample)) return 'kn'; // Kannada
  if (/[\u0d00-\u0d7f]/.test(sample)) return 'ml'; // Malayalam
  if (/[\u0d80-\u0dff]/.test(sample)) return 'si'; // Sinhala

  // Devanagari script (Hindi, Sanskrit, Marathi, Nepali, etc.)
  if (/[\u0900-\u097f]/.test(sample)) {
    // More specific detection for Hindi
    if (sample.includes('है') || sample.includes('हैं') || sample.includes('था') || sample.includes('हो') ||
        sample.includes('किया') || sample.includes('करता') || sample.includes('भारत') || sample.includes('हिन्दी')) {
      return 'hi';
    }
    // Marathi indicators
    if (sample.includes('आहे') || sample.includes('आहेत') || sample.includes('होता') || sample.includes('महाराष्ट्र')) {
      return 'mr';
    }
    // Default to Hindi for Devanagari
    return 'hi';
  }

  // Arabic script languages
  if (/[\u0600-\u06ff]/.test(sample)) {
    // Persian/Farsi indicators
    if (sample.includes('است') || sample.includes('بود') || sample.includes('ایران')) {
      return 'fa';
    }
    // Urdu indicators
    if (sample.includes('ہے') || sample.includes('ہیں') || sample.includes('پاکستان')) {
      return 'ur';
    }
    // Default to Arabic
    return 'ar';
  }

  // Chinese, Japanese, Korean
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh'; // Chinese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'ja'; // Japanese
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko'; // Korean

  // Cyrillic script
  if (/[\u0400-\u04ff]/.test(sample)) {
    // Russian indicators
    if (sample.includes('это') || sample.includes('был') || sample.includes('россия')) {
      return 'ru';
    }
    return 'ru'; // Default Cyrillic to Russian
  }

  // Latin script languages - check word patterns
  // Spanish
  if (/\b(el|la|los|las|es|son|está|están|hace|mucho|pero|sí|no)\b/.test(sample) ||
      sample.includes('méxico') || sample.includes('españa') || sample.includes('américa latina')) {
    return 'es';
  }

  // French
  if (/\b(le|la|les|et|est|sont|dans|pour|avec|mais|c\'est|qu\'il)\b/.test(sample) ||
      sample.includes('france') || sample.includes('canada') || sample.includes('québec')) {
    return 'fr';
  }

  // German
  if (/\b(der|die|das|und|ist|sind|haben|hat|war|sein|mit|für|von|zu)\b/.test(sample) ||
      sample.includes('deutschland') || sample.includes('österreich') || sample.includes('schweiz')) {
    return 'de';
  }

  // Portuguese
  if (/\b(o|a|os|as|é|são|está|estão|para|com|mas|sim|não)\b/.test(sample) ||
      sample.includes('brasil') || sample.includes('portugal') || sample.includes('português')) {
    return 'pt';
  }

  // Italian
  if (/\b(il|la|i|gli|le|è|sono|ha|hanno|per|con|ma|sì|no)\b/.test(sample) ||
      sample.includes('italia') || sample.includes('roma') || sample.includes('milano')) {
    return 'it';
  }

  // Dutch
  if (/\b(de|het|en|is|zijn|heeft|voor|met|maar|ja|nee)\b/.test(sample) ||
      sample.includes('nederland') || sample.includes('belgië') || sample.includes('nederlands')) {
    return 'nl';
  }

  // Turkish
  if (/\b(bu|ve|bir|için|ile|ama|evet|hayır|çok|çok|vardır|var)\b/.test(sample) ||
      sample.includes('türkiye') || sample.includes('istanbul') || sample.includes('ankara')) {
    return 'tr';
  }

  // Swedish/Norwegian/Danish (Nordic)
  if (/\b(och|är|att|det|jag|har|med|för|men|ja|nej)\b/.test(sample) ||
      sample.includes('sverige') || sample.includes('norge') || sample.includes('danmark')) {
    return 'sv'; // Default to Swedish for Nordic languages
  }

  // Polish
  if (/\b(i|oraz|jest|są|ma|ale|tak|nie|bardzo|jestem)\b/.test(sample) ||
      sample.includes('polska') || sample.includes('warszawa') || sample.includes('kraków')) {
    return 'pl';
  }

  // Czech
  if (/\b(a|je|jsou|ale|tak|ne|velmi|velký|malý|dobrý)\b/.test(sample) ||
      sample.includes('česká') || sample.includes('praha') || sample.includes('brno')) {
    return 'cs';
  }

  // Greek
  if (/[\u0370-\u03ff]/.test(sample)) return 'el';

  // Thai
  if (/[\u0e00-\u0e7f]/.test(sample)) return 'th';

  // Vietnamese
  if (/[\u0102-\u1ef9]/.test(sample) && (sample.includes('ng') || sample.includes('nh') || sample.includes('th'))) {
    return 'vi';
  }

  // Default to English for Latin script
  return 'en';
}

/**
 * Estimate processing time based on document size
 */
export function estimateProcessingTime(wordCount: number, pageCount?: number): {
  estimatedMinutes: number;
  isLargeDocument: boolean;
} {
  // Rough estimation: ~1000 words per minute for AI translation
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 1000));

  // Consider large document if > 50,000 words or > 200 pages
  const isLargeDocument = wordCount > 50000 || (pageCount ? pageCount > 200 : false);

  return { estimatedMinutes, isLargeDocument };
}

