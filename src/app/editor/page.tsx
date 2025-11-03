'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Download,
  FileText,
  File,
  Save,
  Bold,
  Italic,
  Underline,
  Type,
  ZoomIn,
  ZoomOut,
  Home,
  Globe,
  ChevronDown,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  Undo,
  Redo,
  Check
} from 'lucide-react';

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const translationId = searchParams.get('id');
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [translatedSegments, setTranslatedSegments] = useState<any[]>([]);
  const [originalFileName, setOriginalFileName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [hasLoadedContent, setHasLoadedContent] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' }
  ];

  // Load content
  useEffect(() => {
    const loadContent = async () => {
      if (translationId) {
        try {
          const response = await fetch(`/api/translations/${translationId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.translation) {
              setContent(data.translation.translated_text);
              setOriginalContent(data.translation.original_text || '');
              setOriginalFileName(data.translation.original_file_name);
              setSelectedLanguage(data.translation.target_language);
              setHasLoadedContent(true);
              return;
            }
          }
        } catch (error) {
          console.error('Failed to load from database:', error);
        }
      }

      const storedContent = localStorage.getItem('translatedContent');
      const storedSegments = localStorage.getItem('translatedSegments');
      const storedFileName = localStorage.getItem('originalFileName');
      const storedLanguage = localStorage.getItem('selectedLanguage');

      if (storedContent) {
        setContent(storedContent);
      }
      
      if (storedSegments) {
        try {
          const parsedSegments = JSON.parse(storedSegments);
          setTranslatedSegments(parsedSegments);
          const originalText = parsedSegments
            .map((seg: any) => seg.sourceText)
            .join('\n\n');
          setOriginalContent(originalText);
        } catch (error) {
          console.error('Failed to parse segments:', error);
        }
      }
      
      if (storedFileName) setOriginalFileName(storedFileName);
      if (storedLanguage) setSelectedLanguage(storedLanguage);

      setHasLoadedContent(true);
    };

    loadContent();
  }, [translationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-save to database
  const autoSaveToDatabase = useCallback(async (newContent: string) => {
    if (!translationId) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/translations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: translationId,
          translatedText: newContent
        })
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [translationId]);

  const handleBackToMain = () => {
    if (contentEditableRef.current) {
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.innerText;
      localStorage.setItem('translatedContent', textContent);
    } else {
      localStorage.setItem('translatedContent', content);
    }
    if (translatedSegments.length > 0) {
      localStorage.setItem('translatedSegments', JSON.stringify(translatedSegments));
    }
    localStorage.setItem('originalFileName', originalFileName);
    localStorage.setItem('selectedLanguage', selectedLanguage);
    router.push('/');
  };

  const handleContentChange = () => {
    if (!contentEditableRef.current) return;
    
    const newContent = contentEditableRef.current.innerText;
    setContent(newContent);
    localStorage.setItem('translatedContent', newContent);

    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const timeout = setTimeout(() => {
      autoSaveToDatabase(newContent);
    }, 2000);
    saveTimeoutRef.current = timeout;
  };

  const applyFormat = (format: 'bold' | 'italic' | 'underline') => {
    document.execCommand(format, false);
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  };

  const applyHeading = () => {
    document.execCommand('formatBlock', false, '<h2>');
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  };

  const handleUndo = () => {
    document.execCommand('undo', false);
  };

  const handleRedo = () => {
    document.execCommand('redo', false);
  };

  const handleDownload = useCallback(async (format: 'txt' | 'docx' | 'pdf') => {
    try {
      const fileName = originalFileName?.replace(/\.[^/.]+$/, '') || 'document';
      const timestamp = new Date().toISOString().split('T')[0];
      const downloadFileName = `${fileName}_edited_${timestamp}`;

      const textContent = contentEditableRef.current?.innerText || content;

      if (format === 'txt') {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${downloadFileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const documentReconstruction = await import('@/utils/documentReconstruction');
        const { createDocumentReconstructor, downloadBlob } = documentReconstruction;

        const translationResults = [{
          originalText: originalContent || 'Document content',
          translatedText: textContent,
          sourceLanguage: 'auto',
          targetLanguage: selectedLanguage,
          confidence: 0.95
        }];

        const reconstructor = createDocumentReconstructor(translationResults, {
          title: `${fileName} (Edited)`,
          subject: 'Edited Translated Document',
          creator: 'TranslateAI'
        });

        let blob: Blob;
        let extension: string;

        if (format === 'docx') {
          blob = await reconstructor.createWordDocument();
          extension = 'docx';
        } else {
          blob = await reconstructor.createPDFDocument();
          extension = 'pdf';
        }

        downloadBlob(blob, `${downloadFileName}.${extension}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    }
  }, [content, originalContent, originalFileName, selectedLanguage]);

  // Convert markdown to HTML for initial display
  const markdownToHtml = (markdown: string): string => {
    return markdown
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.startsWith('# ')) {
          return `<h1>${paragraph.slice(2)}</h1>`;
        } else if (paragraph.startsWith('## ')) {
          return `<h2>${paragraph.slice(3)}</h2>`;
        } else if (paragraph.startsWith('### ')) {
          return `<h3>${paragraph.slice(4)}</h3>`;
        } else {
          let html = paragraph
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/<u>(.+?)<\/u>/g, '<u>$1</u>');
          return `<p>${html}</p>`;
        }
      })
      .join('');
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;

  // Split content into A4 pages
  const WORDS_PER_PAGE = 500;
  const words = content.split(/\s+/);
  const pages: string[] = [];
  
  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    const pageWords = words.slice(i, i + WORDS_PER_PAGE);
    pages.push(pageWords.join(' '));
  }
  
  if (pages.length === 0) pages.push('');

  // Split original content
  const originalWords = originalContent.split(/\s+/);
  const originalPages: string[] = [];
  
  for (let i = 0; i < originalWords.length; i += WORDS_PER_PAGE) {
    const pageWords = originalWords.slice(i, i + WORDS_PER_PAGE);
    originalPages.push(pageWords.join(' '));
  }

  if (!hasLoadedContent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Editor</h3>
          <p className="text-gray-600">Preparing your document...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Content</h3>
          <p className="text-gray-600 mb-6">Please translate a document first.</p>
          <button
            onClick={handleBackToMain}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Go to Translator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Custom CSS */}
      <style jsx global>{`
        .editable-content {
          outline: none;
        }
        .editable-content h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 1.5em 0 0.5em 0;
          line-height: 1.2;
        }
        .editable-content h2 {
          font-size: 1.6em;
          font-weight: 600;
          margin: 1.2em 0 0.4em 0;
          line-height: 1.3;
        }
        .editable-content h3 {
          font-size: 1.3em;
          font-weight: 600;
          margin: 1em 0 0.3em 0;
          line-height: 1.4;
        }
        .editable-content p {
          margin-bottom: 1em;
          line-height: 1.6;
        }
        .editable-content strong {
          font-weight: 700;
        }
        .editable-content em {
          font-style: italic;
        }
        .editable-content u {
          text-decoration: underline;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToMain}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Home className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">
                {originalFileName?.replace(/\.[^/.]+$/, '') || 'Document'} (Edited)
              </span>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {supportedLanguages.find(l => l.code === selectedLanguage)?.name || 'English'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showLanguageDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        selectedLanguage === lang.code ? 'bg-blue-50 text-blue-600 font-medium' : ''
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              className="p-2 hover:bg-gray-100 rounded"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              className="p-2 hover:bg-gray-100 rounded"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Font Family */}
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
            </select>

            {/* Font Size */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Formatting */}
            <button
              onClick={() => applyFormat('bold')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('italic')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('underline')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>
            <button
              onClick={applyHeading}
              className="p-2 hover:bg-gray-100 rounded"
              title="Heading"
            >
              <Type className="h-4 w-4" />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* View Options */}
            {originalContent && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
              >
                {showOriginal ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                {showOriginal ? 'Hide' : 'Show'} Original
              </button>
            )}

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(prev => Math.max(75, prev - 10))}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Download */}
            <button
              onClick={() => handleDownload('txt')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              <FileText className="h-4 w-4 inline mr-1" />
              TXT
            </button>
            <button
              onClick={() => handleDownload('docx')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
            >
              <File className="h-4 w-4 inline mr-1" />
              DOCX
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              <Download className="h-4 w-4 inline mr-1" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div className="flex items-center gap-6">
            <span><strong>{wordCount}</strong> words</span>
            <span><strong>{charCount}</strong> characters</span>
            <span><strong>{pages.length}</strong> pages (A4)</span>
          </div>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <>
                <Save className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="text-blue-600 font-medium">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Ready</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <main className="p-8 overflow-auto" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex gap-6 ${!showOriginal || !originalContent ? 'justify-center' : ''}`}>
            {/* Original Text Panel */}
            {showOriginal && originalContent && (
              <div className="w-1/2">
                {originalPages.map((pageContent, pageIndex) => (
                  <div
                    key={`original-${pageIndex}`}
                    className="bg-gray-50 border border-gray-300 rounded-lg shadow-sm p-12 mb-8"
                    style={{
                      minHeight: '297mm',
                      width: '210mm',
                      maxWidth: '210mm'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-300">
                      <Languages className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-800 text-sm uppercase">Original - Page {pageIndex + 1}</h3>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap"
                      style={{ fontSize: `${fontSize}px`, fontFamily }}
                    >
                      {pageContent}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editable Translated Text */}
            <div className={`${showOriginal && originalContent ? 'w-1/2' : 'max-w-4xl mx-auto'}`}>
              <div
                className="bg-white border border-gray-300 rounded-lg shadow-lg p-12"
                style={{
                  minHeight: '297mm',
                  width: '210mm',
                  maxWidth: '210mm'
                }}
              >
                <div className="text-center text-gray-400 text-xs mb-6 pb-2 border-b border-gray-200 flex items-center justify-between">
                  <span>Translated Document</span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Editable
                  </span>
                </div>

                {/* ContentEditableDiv */}
                <div
                  ref={contentEditableRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  className="editable-content min-h-[240mm] focus:outline-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    lineHeight: 1.6
                  }}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
