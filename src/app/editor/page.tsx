'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
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
  ChevronLeft,
  ChevronRight,
  Globe,
  ChevronDown,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Code,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function EditorPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [translatedSegments, setTranslatedSegments] = useState<any[]>([]);
  const [originalFileName, setOriginalFileName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [hasLoadedContent, setHasLoadedContent] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [zoom, setZoom] = useState(100);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPreview, setShowPreview] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

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
    const storedContent = localStorage.getItem('translatedContent');
    const storedSegments = localStorage.getItem('translatedSegments');
    const storedFileName = localStorage.getItem('originalFileName');
    const storedLanguage = localStorage.getItem('selectedLanguage');

    if (storedContent) {
      setContent(storedContent);
      setHistory([storedContent]);
      setHistoryIndex(0);
    }
    if (storedSegments) {
      try {
        const parsedSegments = JSON.parse(storedSegments);
        setTranslatedSegments(parsedSegments);
      } catch (error) {
        console.error('Failed to parse segments:', error);
      }
    }
    if (storedFileName) setOriginalFileName(storedFileName);
    if (storedLanguage) setSelectedLanguage(storedLanguage);

    setHasLoadedContent(true);
  }, []);

  // Close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBackToMain = () => {
    localStorage.setItem('translatedContent', content);
    if (translatedSegments.length > 0) {
      localStorage.setItem('translatedSegments', JSON.stringify(translatedSegments));
    }
    localStorage.setItem('originalFileName', originalFileName);
    localStorage.setItem('selectedLanguage', selectedLanguage);
    router.push('/');
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };

  const applyFormat = (format: 'bold' | 'italic' | 'heading' | 'underline') => {
    if (!editorRef.current) return;

    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText) {
      alert('Please select text first');
      return;
    }

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'heading':
        formattedText = `## ${selectedText}`;
        break;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    handleContentChange(newContent);

    setTimeout(() => {
      editorRef.current?.focus();
      const newCursorPos = start + formattedText.length;
      editorRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleDownload = useCallback(async (format: 'txt' | 'docx' | 'pdf') => {
    try {
      const fileName = originalFileName?.replace(/\.[^/.]+$/, '') || 'document';
      const timestamp = new Date().toISOString().split('T')[0];
      const downloadFileName = `${fileName}_edited_${timestamp}`;

      if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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
          originalText: 'Document content',
          translatedText: content,
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
  }, [content, originalFileName, selectedLanguage]);

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;

  // Split content into A4-sized pages (approximately 500 words per page)
  const WORDS_PER_PAGE = 500;
  const words = content.split(/\s+/);
  const pages: string[] = [];
  
  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    const pageWords = words.slice(i, i + WORDS_PER_PAGE);
    pages.push(pageWords.join(' '));
  }
  
  if (pages.length === 0) pages.push('');

  const hasSegments = translatedSegments && translatedSegments.length > 0;

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

  if (!content && !hasSegments) {
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

            {/* Language Selector */}
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
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
                title="Decrease size"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                className="p-1.5 hover:bg-gray-100 rounded"
                title="Increase size"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Formatting */}
            <button
              onClick={() => applyFormat('bold')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bold (select text first)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('italic')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Italic (select text first)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('underline')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Underline (select text first)"
            >
              <Underline className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('heading')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Heading (select text first)"
            >
              <Type className="h-4 w-4" />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* View Options */}
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
            >
              {showOriginal ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              {showOriginal ? 'Hide' : 'Show'} Original
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
            >
              {showPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </button>

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
            <Save className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">Auto-saved</span>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <main className="p-8 overflow-auto" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex gap-6 ${!showOriginal ? 'justify-center' : ''}`}>
            {/* Original Text Panel */}
            {showOriginal && hasSegments && (
              <div className="w-1/2">
                <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6 mb-4">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <Languages className="h-5 w-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-800">Original Text</h2>
                  </div>
                  <div 
                    className="prose max-w-none text-gray-800 leading-relaxed"
                    style={{ fontSize: `${fontSize}px`, fontFamily }}
                  >
                    {translatedSegments.map((seg, idx) => (
                      <div key={seg.id} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                        <div className="text-xs text-gray-500 mb-2 font-semibold">Page {idx + 1}</div>
                        <div className="whitespace-pre-wrap">{seg.sourceText}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Translated Text Editor */}
            <div className={`${showOriginal && hasSegments ? 'w-1/2' : 'max-w-4xl mx-auto'}`}>
              {pages.map((pageContent, pageIndex) => (
                <div
                  key={pageIndex}
                  className="bg-white border border-gray-300 rounded-lg shadow-lg p-12 mb-8"
                  style={{
                    minHeight: '297mm', // A4 height
                    width: '210mm', // A4 width
                    maxWidth: '210mm'
                  }}
                >
                  {/* Page Number */}
                  <div className="text-center text-gray-400 text-xs mb-6 pb-2 border-b border-gray-200">
                    Page {pageIndex + 1} of {pages.length}
                  </div>

                  {/* Content */}
                  {showPreview ? (
                    /* Preview Mode */
                    <div
                      className="prose prose-sm lg:prose-base max-w-none"
                      style={{ fontSize: `${fontSize}px`, fontFamily }}
                      dangerouslySetInnerHTML={{ __html: marked.parse(pageContent) as string }}
                    />
                  ) : (
                    /* Edit Mode */
                    <textarea
                      ref={pageIndex === 0 ? editorRef : undefined}
                      value={pageContent}
                      onChange={(e) => {
                        const newPages = [...pages];
                        newPages[pageIndex] = e.target.value;
                        handleContentChange(newPages.join('\n\n'));
                      }}
                      className="w-full min-h-[240mm] resize-none focus:outline-none bg-transparent leading-relaxed"
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily,
                        lineHeight: 1.6
                      }}
                      placeholder={pageIndex === 0 ? "Start typing or paste your translated text..." : ""}
                    />
                  )}

                  {/* Page Footer */}
                  {pageIndex === pages.length - 1 && (
                    <div className="text-center text-gray-400 text-xs mt-6 pt-2 border-t border-gray-200">
                      End of Document
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
