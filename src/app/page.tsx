'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TranslationProgress } from '@/components/TranslationProgress';
import { DownloadSection } from '@/components/DownloadSection';
import { TranslationHistory } from '@/components/TranslationHistory';
import { ErrorBoundary, useErrorHandler, safeAsync } from '@/components/ErrorBoundary';
import { Languages, FileText, Download, AlertCircle, RefreshCw, ChevronDown, Globe, Save, History } from 'lucide-react';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translatedContent, setTranslatedContent] = useState<string>(''); // Keep for backward compatibility
  const [translatedSegments, setTranslatedSegments] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [translationResults, setTranslationResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [useHighFidelity, setUseHighFidelity] = useState(false);
  const [highFidelityResult, setHighFidelityResult] = useState<{docxBuffer?: string; highFidelity: boolean} | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedTranslationId, setSavedTranslationId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Supported languages in alphabetical order
  const supportedLanguages = [
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Albanian' },
    { code: 'am', name: 'Amharic' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hy', name: 'Armenian' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'eu', name: 'Basque' },
    { code: 'be', name: 'Belarusian' },
    { code: 'bn', name: 'Bengali' },
    { code: 'bs', name: 'Bosnian' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'ca', name: 'Catalan' },
    { code: 'ceb', name: 'Cebuano' },
    { code: 'ny', name: 'Chichewa' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'co', name: 'Corsican' },
    { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Estonian' },
    { code: 'tl', name: 'Filipino' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fr', name: 'French' },
    { code: 'fy', name: 'Frisian' },
    { code: 'gl', name: 'Galician' },
    { code: 'ka', name: 'Georgian' },
    { code: 'de', name: 'German' },
    { code: 'el', name: 'Greek' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ht', name: 'Haitian Creole' },
    { code: 'ha', name: 'Hausa' },
    { code: 'haw', name: 'Hawaiian' },
    { code: 'iw', name: 'Hebrew' },
    { code: 'hi', name: 'Hindi' },
    { code: 'hmn', name: 'Hmong' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'is', name: 'Icelandic' },
    { code: 'ig', name: 'Igbo' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ga', name: 'Irish' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'jw', name: 'Javanese' },
    { code: 'kn', name: 'Kannada' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'km', name: 'Khmer' },
    { code: 'ko', name: 'Korean' },
    { code: 'ku', name: 'Kurdish (Kurmanji)' },
    { code: 'ky', name: 'Kyrgyz' },
    { code: 'lo', name: 'Lao' },
    { code: 'la', name: 'Latin' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'lb', name: 'Luxembourgish' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'mg', name: 'Malagasy' },
    { code: 'ms', name: 'Malay' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'mt', name: 'Maltese' },
    { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' },
    { code: 'mn', name: 'Mongolian' },
    { code: 'my', name: 'Myanmar (Burmese)' },
    { code: 'ne', name: 'Nepali' },
    { code: 'no', name: 'Norwegian' },
    { code: 'or', name: 'Odia' },
    { code: 'ps', name: 'Pashto' },
    { code: 'fa', name: 'Persian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ro', name: 'Romanian' },
    { code: 'ru', name: 'Russian' },
    { code: 'sm', name: 'Samoan' },
    { code: 'gd', name: 'Scots Gaelic' },
    { code: 'sr', name: 'Serbian' },
    { code: 'st', name: 'Sesotho' },
    { code: 'sn', name: 'Shona' },
    { code: 'sd', name: 'Sindhi' },
    { code: 'si', name: 'Sinhala' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'so', name: 'Somali' },
    { code: 'es', name: 'Spanish' },
    { code: 'su', name: 'Sudanese' },
    { code: 'sw', name: 'Swahili' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tg', name: 'Tajik' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'th', name: 'Thai' },
    { code: 'tr', name: 'Turkish' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ug', name: 'Uyghur' },
    { code: 'uz', name: 'Uzbek' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'cy', name: 'Welsh' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'yi', name: 'Yiddish' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'zu', name: 'Zulu' }
  ];

  const handleError = useErrorHandler();

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    setShowLanguageDropdown(false); // Close dropdown when file is uploaded
  }, [setShowLanguageDropdown]);

  const handleSaveTranslation = useCallback(async () => {
    if (!translatedContent || !uploadedFile) {
      alert('No translation to save');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Extract original text from segments
      const originalText = translatedSegments.length > 0
        ? translatedSegments.map(seg => seg.sourceText).join('\n\n')
        : '';

      const response = await fetch('/api/translations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFileName: uploadedFile.name,
          originalText: originalText,
          translatedText: translatedContent,
          sourceLanguage: 'auto',
          targetLanguage: selectedLanguage,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          pageCount: translatedSegments.length || 1,
          highFidelity: useHighFidelity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save translation');
      }

      const data = await response.json();
      console.log('Translation saved:', data);
      
      // Store the translation ID
      if (data.translationId) {
        setSavedTranslationId(data.translationId);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving translation:', error);
      alert(
        error instanceof Error && error.message.includes('Database')
          ? 'Database connection failed. Please ensure PostgreSQL is running and configured.'
          : 'Failed to save translation. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [translatedContent, uploadedFile, selectedLanguage, translatedSegments, useHighFidelity]);

  const handleStartTranslation = useCallback(async () => {
    if (!uploadedFile) return;

    setIsTranslating(true);
    setTranslationProgress(0);
    setCurrentStep('Preparing document for AI processing...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('targetLanguage', selectedLanguage);
      formData.append('highFidelity', useHighFidelity.toString());

      // Step 1: Send document to Gemini AI for processing
      setTranslationProgress(5);
      const currentLangName = supportedLanguages.find(lang => lang.code === selectedLanguage)?.name || 'English';
      setCurrentStep(`Sending to Gemini AI for analysis (translating to ${currentLangName})...`);

      const response = await fetch('/api/ai-translate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document with AI');
      }

      const result = await response.json();

      // Handle new segment-based response format
      if (result.translatedSegments && result.translatedSegments.length > 0) {
        console.log('Received segment-based translation response');

        // Calculate progress based on segments
        const segmentsProgress = Math.min(result.translatedSegments.length / result.totalSegments * 80, 80);
        setTranslationProgress(20 + segmentsProgress);
        setCurrentStep(`🔄 Translating segments: ${result.translatedSegments.length}/${result.totalSegments} completed`);

        // Store the segments
        setTranslatedSegments(result.translatedSegments);

        // Create combined translated content for backward compatibility
        const combinedContent = result.translatedSegments
          .map((segment: any) => segment.translatedText || segment.sourceText)
          .join('\n\n');

        setTranslatedContent(combinedContent);

        // Create translation results for document reconstruction
        const translationResults = result.translatedSegments.map((segment: any) => ({
          originalText: segment.sourceText,
          translatedText: segment.translatedText || segment.sourceText,
          sourceLanguage: result.language || 'auto',
          targetLanguage: selectedLanguage,
          confidence: 0.95,
          segmentId: segment.id
        }));

        setTranslationResults(translationResults);

        // Prepare document for download
        setTranslationProgress(90);
        setCurrentStep('📄 Preparing translated document...');

        const documentReconstruction = await import('@/utils/documentReconstruction');
        const { createDocumentReconstructor } = documentReconstruction;

        const reconstructor = createDocumentReconstructor(translationResults, {
          title: uploadedFile.name.replace(/\.[^/.]+$/, '') + ' (AI Translated)',
          subject: `AI-Translated Document (${result.totalSegments} segments, ${result.totalWordCount} words)`,
          creator: 'TranslateAI with Gemini AI (Segment-based)'
        });

        setTranslationProgress(100);
        setCurrentStep(`🎉 Translation completed! ${result.totalWordCount} words translated across ${result.totalSegments} segments using ${result.highFidelity ? 'High-Fidelity' : 'Standard'} mode.`);

        // Store high-fidelity flag and result data for download handling
        setUseHighFidelity(result.highFidelity || false);
        if (result.highFidelity && result.docxBuffer) {
          setHighFidelityResult({
            docxBuffer: result.docxBuffer,
            highFidelity: true
          });
        }

      } else if (result.translatedContent && result.translatedContent.trim().length > 0) {
        // Handle legacy response format for backward compatibility
        console.log('Received legacy content-based translation response');

        // Calculate dynamic progress based on processing method and results
        let dynamicProgress = 50; // Default progress
        if (result.processingMethod === 'streaming-chunked-ai') {
          // Calculate progress based on pages processed vs total pages
          const pagesProgress = result.totalPages > 0 ? (result.processedPages / result.totalPages) * 60 : 60;
          dynamicProgress = 20 + pagesProgress; // Start at 20%, go up to 80%
          setCurrentStep(`🚀 Processing large document: ${result.processedPages}/${result.totalPages} pages completed (${result.successfulChunks}/${result.chunksProcessed} chunks successful)`);
        } else {
          // For smaller documents, show general progress
          dynamicProgress = 70;
          setCurrentStep('🤖 AI is analyzing and translating your document...');
        }

        setTranslationProgress(dynamicProgress);

        // Step 2: Prepare document for download
        setTranslationProgress(90);
        setCurrentStep('Preparing translated document...');

        const documentReconstruction = await import('@/utils/documentReconstruction');
        const { createDocumentReconstructor } = documentReconstruction;

        const translationResults = [{
          originalText: result.processingMethod === 'chunked-ai'
            ? `Large document processed in ${result.chunksProcessed} chunks`
            : 'Document processed by AI',
          translatedText: result.translatedContent,
          sourceLanguage: 'auto', // AI detects language automatically
          targetLanguage: selectedLanguage,
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
      } else {
        throw new Error('AI could not extract or translate text from the document');
      }

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

  // Show history view if requested
  if (showHistory) {
    return <TranslationHistory onClose={() => setShowHistory(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header - Always show for language selection */}
      <header className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Languages className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">TranslateAI</h1>
                  <p className="text-sm text-gray-600">Gemini AI-Powered Document Translation</p>
                </div>
              </div>

              {/* Processing Mode Selector */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="highFidelity"
                    checked={useHighFidelity}
                    onChange={(e) => setUseHighFidelity(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="highFidelity" className="text-sm text-gray-700 cursor-pointer">
                    High-Fidelity Mode
                  </label>
                </div>
                <div className="text-xs text-gray-500 max-w-48">
                  {useHighFidelity
                    ? 'Advanced AI analysis + DOCX reconstruction (slower, premium quality)'
                    : 'Fast Markdown translation (recommended for most documents)'}
                </div>
              </div>

              {/* Language Selector and History Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                  title="View Translation History"
                >
                  <History className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">History</span>
                </button>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Globe className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {supportedLanguages.find(lang => lang.code === selectedLanguage)?.name || 'English'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showLanguageDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                      {supportedLanguages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => {
                            setSelectedLanguage(language.code);
                            setShowLanguageDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                            selectedLanguage === language.code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {language.name}
                        </button>
                      ))}
                    </div>
                  )}
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
              Upload your PDF, Word, or image document and let Gemini AI extract and translate it to your chosen language.
              Choose from 100+ languages including Malayalam, Hindi, Arabic, Spanish, French, German, and more with advanced OCR.
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
              <FileUpload onFileUpload={handleFileUpload} />
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

              <div className="text-center">
                <button
                  onClick={handleStartTranslation}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                >
                  <Languages className="h-6 w-6 mr-3" />
                  Start Translation
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
                <p className="text-gray-600 mb-4">
                  Your document has been successfully translated to {supportedLanguages.find(lang => lang.code === selectedLanguage)?.name || 'English'}.
                </p>
                {saveSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    ✓ Translation saved to database successfully!
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={async () => {
                      // First, ensure the translation is saved to database
                      if (!savedTranslationId) {
                        await handleSaveTranslation();
                      }
                      
                      // Store content in localStorage as backup
                      localStorage.setItem('translatedContent', translatedContent);
                      localStorage.setItem('translatedSegments', JSON.stringify(translatedSegments));
                      localStorage.setItem('originalFileName', uploadedFile?.name || '');
                      localStorage.setItem('selectedLanguage', selectedLanguage);
                      
                      // Navigate to editor page with unique ID if available
                      if (savedTranslationId) {
                        window.location.href = `/editor?id=${savedTranslationId}`;
                      } else {
                        window.location.href = '/editor';
                      }
                    }}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Edit Document
                  </button>

                  <button
                    onClick={handleSaveTranslation}
                    disabled={isSaving}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? 'Saving...' : (savedTranslationId ? 'Saved ✓' : 'Save Translation')}
                  </button>
                </div>
              </div>

              <DownloadSection
                translatedContent={translatedContent}
                translationResults={translationResults}
                originalFileName={uploadedFile?.name}
                translatedSegments={translatedSegments}
                highFidelityResult={highFidelityResult}
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
