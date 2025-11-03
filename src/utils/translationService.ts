import { TextChunk } from './textExtraction';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
}

export interface TranslationConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  maxRetries?: number;
  chunkDelay?: number; // Delay between chunks in milliseconds
}

/**
 * Translation service class for handling AI-powered translation
 */
export class TranslationService {
  private config: TranslationConfig;

  constructor(config: TranslationConfig) {
    this.config = {
      maxRetries: 3,
      chunkDelay: 1000,
      ...config
    };
  }

  /**
   * Translate a single text chunk
   */
  async translateChunk(chunk: TextChunk): Promise<TranslationResult> {
    const retries = this.config.maxRetries || 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.callTranslationAPI(chunk.content);

        // Add delay between chunks to respect rate limits
        if (this.config.chunkDelay && this.config.chunkDelay > 0) {
          await this.delay(this.config.chunkDelay);
        }

        return {
          originalText: chunk.content,
          translatedText: result.translatedText,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: 'en',
          confidence: result.confidence
        };
      } catch (error) {
        console.error(`Translation attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          throw new Error(`Translation failed after ${retries} attempts: ${error}`);
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Translation failed');
  }

  /**
   * Translate multiple chunks with progress tracking
   */
  async translateChunks(
    chunks: TextChunk[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    let completed = 0;

    for (const chunk of chunks) {
      try {
        const result = await this.translateChunk(chunk);
        results.push(result);
        completed++;

        if (onProgress) {
          onProgress(completed, chunks.length);
        }
      } catch (error) {
        console.error(`Failed to translate chunk ${completed + 1}:`, error);
        // For now, we'll skip failed chunks and continue
        // In production, you might want to handle this differently
        completed++;
        if (onProgress) {
          onProgress(completed, chunks.length);
        }
      }
    }

    return results;
  }

  /**
   * Call the actual translation API using Google Gemini
   */
  private async callTranslationAPI(text: string): Promise<{
    translatedText: string;
    sourceLanguage: string;
    confidence?: number;
  }> {
    return await this.callGemini(text);
  }

  /**
   * Example implementation for OpenAI GPT
   */
  private async callOpenAI(text: string): Promise<{
    translatedText: string;
    sourceLanguage: string;
    confidence?: number;
  }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the following text to English. Only return the translated text, nothing else.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No translation received from OpenAI');
    }

    return {
      translatedText,
      sourceLanguage: 'auto',
      confidence: 0.9
    };
  }

  /**
   * Implementation for Google Gemini API
   */
  private async callGemini(text: string): Promise<{
    translatedText: string;
    sourceLanguage: string;
    confidence?: number;
  }> {
    try {
      // Dynamic import to avoid SSR issues
      const { GoogleGenAI } = await import('@google/genai');

      const genAI = new GoogleGenAI({
        apiKey: this.config.apiKey
      });

      const prompt = `Translate the following text to English. Preserve the document structure and formatting using markdown:
- Use # for main headings, ## for subheadings, ### for smaller headings
- Use **bold** for important text and emphasis
- Use *italic* for secondary emphasis
- Use - for bullet lists
- Use 1. 2. 3. for numbered lists
- Maintain paragraph breaks

If the text is already in English, return it with proper markdown formatting as-is. Return ONLY the translated/formatted text, no commentary.

${text}`;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      const translatedText = response.text?.trim();

      if (!translatedText) {
        throw new Error('No translation received from Gemini API');
      }

      // Simple language detection based on the original text
      const sourceLanguage = this.detectLanguage(text);

      return {
        translatedText,
        sourceLanguage,
        confidence: 0.95
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simple language detection based on common patterns
   */
  private detectLanguage(text: string): string {
    const sample = text.substring(0, 1000).toLowerCase();

    // Spanish indicators
    if (sample.includes('el ') || sample.includes('la ') || sample.includes('es ') || sample.includes('muy ')) {
      return 'es';
    }

    // French indicators
    if (sample.includes('le ') || sample.includes('la ') || sample.includes('et ') || sample.includes('est ')) {
      return 'fr';
    }

    // German indicators
    if (sample.includes('der ') || sample.includes('die ') || sample.includes('und ') || sample.includes('ist ')) {
      return 'de';
    }

    // Chinese indicators
    if (/[\u4e00-\u9fff]/.test(sample)) {
      return 'zh';
    }

    // Default to English
    return 'en';
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a translation service instance with configuration
 */
export function createTranslationService(apiKey: string, options?: Partial<TranslationConfig>): TranslationService {
  return new TranslationService({
    apiKey,
    ...options
  });
}

/**
 * Combine translated chunks back into full text
 */
export function combineTranslations(results: TranslationResult[]): string {
  return results
    .map(result => result.translatedText)
    .join('\n\n');
}

/**
 * Get supported languages (placeholder)
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'pl', name: 'Polish' },
    { code: 'cs', name: 'Czech' },
    { code: 'tr', name: 'Turkish' },
    { code: 'el', name: 'Greek' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'fa', name: 'Persian' },
    { code: 'ur', name: 'Urdu' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'or', name: 'Odia' },
    { code: 'si', name: 'Sinhala' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' }
  ];
}

