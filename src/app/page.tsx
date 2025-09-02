'use client';

import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TranslationProgress } from '@/components/TranslationProgress';
import { DownloadSection } from '@/components/DownloadSection';
import { ErrorBoundary, useErrorHandler, safeAsync } from '@/components/ErrorBoundary';
import { Languages, FileText, Download, AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [translationResults, setTranslationResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleError = useErrorHandler();

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
  }, []);

  // Test extraction function to download raw text
  const handleTestExtraction = useCallback(async () => {
    if (!uploadedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsTranslating(true);
    setCurrentStep('Extracting text for testing...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('/api/test-extraction', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Provide detailed error information including debug data
        const errorMessage = errorData.error || 'Failed to extract text';
        if (errorData.debug) {
          console.log('PDF Extraction Debug Info:', errorData.debug);
          console.log('Suggestions:', errorData.suggestions);
        }
        throw new Error(`${errorMessage}${errorData.suggestions ? '\n\nSuggestions:\n' + errorData.suggestions.join('\n') : ''}`);
      }

      // Get the extracted text
      const extractedText = await response.text();

      // Create a downloadable text file
      const blob = new Blob([extractedText], { type: 'text/plain; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${uploadedFile.name.replace(/\.[^/.]+$/, '')}_extracted.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setCurrentStep('Text extraction test completed! Check your downloads.');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test text extraction';
      setCurrentStep('Text extraction test failed');
      setError(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  }, [uploadedFile]);

  const handleStartTranslation = useCallback(async () => {
    if (!uploadedFile) return;

    setIsTranslating(true);
    setTranslationProgress(0);
    setCurrentStep('Preparing document for AI processing...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // Step 1: Send document to Gemini AI for processing
      setTranslationProgress(10);
      setCurrentStep('Sending to Gemini AI...');

      const response = await fetch('/api/ai-translate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document with AI');
      }

      const result = await response.json();

      if (!result.translatedContent || result.translatedContent.trim().length === 0) {
        throw new Error('AI could not extract or translate text from the document');
      }

      // Update progress and show processing method
      setTranslationProgress(50);
      if (result.processingMethod === 'streaming-chunked-ai') {
        setCurrentStep(`🚀 Processing large document: ${result.processedPages}/${result.totalPages} pages completed (${result.successfulChunks}/${result.chunksProcessed} chunks successful)`);
      } else {
        setCurrentStep('🤖 AI is analyzing and translating your document...');
      }

      // Step 2: Prepare document for download
      setTranslationProgress(80);
      setCurrentStep('Preparing download file...');

      const documentReconstruction = await import('@/utils/documentReconstruction');
      const { createDocumentReconstructor } = documentReconstruction;

      const translationResults = [{
        originalText: result.processingMethod === 'chunked-ai'
          ? `Large document processed in ${result.chunksProcessed} chunks`
          : 'Document processed by AI',
        translatedText: result.translatedContent,
        sourceLanguage: 'auto', // AI detects language automatically
        targetLanguage: 'en',
        confidence: 0.95
      }];

      const reconstructor = createDocumentReconstructor(translationResults, {
        title: uploadedFile.name.replace(/\.[^/.]+$/, '') + ' (AI Translated)',
        subject: result.processingMethod === 'chunked-ai'
          ? `AI-Translated Large Document (${result.totalPages} pages)`
          : 'AI-Translated Document',
        creator: 'TranslateAI with Gemini AI'
      });

      setTranslationProgress(100);

      // Show completion message based on processing method
      if (result.processingMethod === 'streaming-chunked-ai') {
        setCurrentStep(`🎉 Large book translation completed! ${result.wordCount} words translated from ${result.totalPages} pages in ${result.chunksProcessed} chunks with ${result.successfulChunks} successful translations.`);
      } else {
        setCurrentStep(`✅ Translation completed successfully! ${result.wordCount} words translated.`);
      }

      setTranslatedContent(result.translatedContent);
      setTranslationResults(translationResults);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process document with AI';
      console.error('AI Translation failed:', error);
      setCurrentStep('Translation failed');
      setError(errorMessage);
      handleError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsTranslating(false);
    }
  }, [uploadedFile, handleError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Languages className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TranslateAI</h1>
                <p className="text-sm text-gray-600">Gemini AI-Powered Document Translation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl font-bold gradient-text mb-4">
            AI-Powered Document Translation
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Upload your PDF, Word, or image document and let Gemini AI extract and translate it to English.
            Supports complete books up to 200MB, Malayalam, Hindi, Arabic, and 100+ other languages with advanced OCR.
            Large documents are automatically processed in chunks - no manual splitting required!
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-700">AI-Powered Translation</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-700">Auto-Chunking</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-gray-700">200MB Books</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* File Upload Section */}
          {!uploadedFile && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <FileUpload onFileUpload={handleFileUpload} onTestExtraction={handleTestExtraction} />
            </div>
          )}

          {/* File Info & Translation Controls */}
          {uploadedFile && !isTranslating && !translatedContent && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{uploadedFile.name}</h3>
                    <p className="text-sm text-gray-600">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Change file
                </button>
              </div>

              <div className="text-center space-y-3">
                <button
                  onClick={handleStartTranslation}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Languages className="h-5 w-5 mr-2" />
                  Start Translation
                </button>
                <button
                  onClick={handleTestExtraction}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
                  title="Test text extraction without translation"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Test Extraction (.txt)
                </button>
              </div>
            </div>
          )}

          {/* Translation Progress */}
          {isTranslating && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <TranslationProgress
                progress={translationProgress}
                currentStep={currentStep}
              />
            </div>
          )}

          {/* Error Display */}
          {error && !isTranslating && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-100">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Translation Failed
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleStartTranslation}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus-ring"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      setUploadedFile(null);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors focus-ring"
                  >
                    Upload Different File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download Section */}
          {translatedContent && !error && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Download className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Translation Complete!
                </h3>
                <p className="text-gray-600">
                  Your document has been successfully translated to English.
                </p>
              </div>

              <DownloadSection
                translatedContent={translatedContent}
                translationResults={translationResults}
                originalFileName={uploadedFile?.name}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 TranslateAI. Powered by advanced AI translation technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
