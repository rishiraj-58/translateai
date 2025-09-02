'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Download,
  FileText,
  File,
  Save,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  ZoomIn,
  ZoomOut,
  Home,
  ChevronLeft,
  ChevronRight,
  Copy,
  Scissors,
  Clipboard,
  Undo,
  Redo,
  Search,
  Replace,
  Globe,
  ChevronDown
} from 'lucide-react';

interface DocumentEditorProps {
  content: string;
  originalFileName?: string;
  onContentChange?: (content: string) => void;
  onBack?: () => void;
  selectedLanguage?: string;
  supportedLanguages?: Array<{ code: string; name: string }>;
  onLanguageChange?: (language: string) => void;
}

export function DocumentEditor({ content, originalFileName, onContentChange, onBack, selectedLanguage = 'en', supportedLanguages = [], onLanguageChange }: DocumentEditorProps) {
  console.log('DocumentEditor called with:', {
    content: content?.substring(0, 100) + '...',
    contentLength: content?.length,
    originalFileName,
    selectedLanguage,
    supportedLanguagesCount: supportedLanguages.length
  });

  const [editedContent, setEditedContent] = useState(content);
  const [fontSize, setFontSize] = useState(12);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [lineHeight, setLineHeight] = useState(1.5);
  const [zoom, setZoom] = useState(100);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
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

  const handleContentChange = useCallback((newContent: string) => {
    setEditedContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  const handleDownload = useCallback(async (format: 'txt' | 'docx' | 'pdf') => {
    try {
      const fileName = originalFileName?.replace(/\.[^/.]+$/, '') || 'translated-document';
      const timestamp = new Date().toISOString().split('T')[0];
      const downloadFileName = `${fileName}_translated_${timestamp}`;

      if (format === 'txt') {
        // For text files, ensure proper UTF-8 encoding
        const blob = new Blob([editedContent], { type: 'text/plain;charset=utf-8' });
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
          translatedText: editedContent,
          sourceLanguage: 'auto',
          targetLanguage: 'en',
          confidence: 0.95
        }];

        const reconstructor = createDocumentReconstructor(translationResults, {
          title: `${fileName} (Edited)`,
          subject: 'Edited Translated Document',
          creator: 'TranslateAI Document Editor'
        });

        let blob: Blob;
        let extension: string;

        if (format === 'docx') {
          blob = await reconstructor.createWordDocument();
          extension = 'docx';
        } else if (format === 'pdf') {
          blob = await reconstructor.createPDFDocument();
          extension = 'pdf';
        } else {
          throw new Error(`Unsupported format: ${format}`);
        }

        // Use the download helper function for consistent encoding
        downloadBlob(blob, `${downloadFileName}.${extension}`);
      }
    } catch (error) {
      console.error(`Download failed for ${format}:`, error);
      alert(`Failed to download ${format.toUpperCase()} file. Please try again.`);
    }
  }, [editedContent, originalFileName]);

  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(72, prev + delta)));
  }, []);

  const handleFormat = useCallback((format: 'bold' | 'italic' | 'underline') => {
    switch (format) {
      case 'bold':
        setIsBold(!isBold);
        break;
      case 'italic':
        setIsItalic(!isItalic);
        break;
      case 'underline':
        setIsUnderline(!isUnderline);
        break;
    }
  }, [isBold, isItalic, isUnderline]);

  const handleTextAlign = useCallback((align: 'left' | 'center' | 'right' | 'justify') => {
    setTextAlign(align);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
  }, []);

  const wordCount = editedContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = editedContent.length;
  const pageCount = Math.ceil(wordCount / 250);

  // Split content into pages for display
  const words = editedContent.split(/\s+/);
  const wordsPerPage = 250;
  const pages: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(' '));
  }

  // Safety check - if no content, show a loading state
  if (!editedContent || editedContent.trim().length === 0) {
    console.log('DocumentEditor: No content available, showing loading state');
    return (
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Top Navbar */}
        <div className="bg-white border-b border-gray-300 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                <Home className="h-5 w-5" />
                <span>Back to TranslateAI</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-600 font-medium">⚠️ No content to edit</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
            <p className="text-gray-600 mb-4">There seems to be an issue with the translated content.</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Main Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TEMPORARY: Simple test render
  console.log('DocumentEditor: Rendering main component');
  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'lightblue', padding: '20px' }}>
      {/* Header with language selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
        <div>
          <h1 style={{ color: 'green', fontSize: '24px' }}>✅ DocumentEditor IS WORKING! ✅</h1>
          <p><strong>Content length:</strong> {editedContent.length} | <strong>Pages:</strong> {pages.length}</p>
          <p><strong>Original file:</strong> {originalFileName}</p>
        </div>

        {/* Language Selector */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🌐 {supportedLanguages.find(lang => lang.code === selectedLanguage)?.name || 'English'}
            <span style={{
              transition: 'transform 0.2s',
              transform: showLanguageDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>▼</span>
          </button>

          {showLanguageDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '256px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              maxHeight: '320px',
              overflowY: 'auto',
              zIndex: 50
            }}>
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    onLanguageChange?.(language.code);
                    setShowLanguageDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: selectedLanguage === language.code ? '#eff6ff' : 'transparent',
                    color: selectedLanguage === language.code ? '#2563eb' : '#374151',
                    fontWeight: selectedLanguage === language.code ? '500' : 'normal',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {language.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onBack}
        style={{ padding: '10px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '5px', marginTop: '20px' }}
      >
        Back to Main
      </button>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', border: '1px solid black' }}>
        <h2>Content Preview:</h2>
        <div style={{ maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {editedContent.substring(0, 500)}...
        </div>
      </div>
    </div>
  );
}


