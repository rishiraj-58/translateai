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
  ChevronDown,
  Languages
} from 'lucide-react';

export default function EditorPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [translatedSegments, setTranslatedSegments] = useState<any[]>([]);
  const [originalFileName, setOriginalFileName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [hasLoadedContent, setHasLoadedContent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Load content from localStorage on mount
  useEffect(() => {
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
        console.log('Loaded segments from localStorage:', parsedSegments.length);
      } catch (error) {
        console.error('Failed to parse stored segments:', error);
      }
    }
    if (storedFileName) {
      setOriginalFileName(storedFileName);
    }
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
    }

    // Mark that we've attempted to load content
    setHasLoadedContent(true);

    // If no content, don't redirect - show empty editor
    if (!storedContent) {
      console.log('Editor page: No content found, showing empty editor');
    }
  }, [router]);

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

  const handleBackToMain = () => {
    // Save updated content and segments before navigating back
    if (hasSegments) {
      localStorage.setItem('translatedSegments', JSON.stringify(translatedSegments));
      // Update the combined content as well
      const combinedContent = translatedSegments
        .map(segment => segment.translatedText || segment.sourceText)
        .join('\n\n');
      localStorage.setItem('translatedContent', combinedContent);
    } else {
      localStorage.setItem('translatedContent', content);
    }
    localStorage.setItem('originalFileName', originalFileName);
    localStorage.setItem('selectedLanguage', selectedLanguage);
    router.push('/');
  };

  const handleDownload = useCallback(async (format: 'txt' | 'docx' | 'pdf') => {
    try {
      const fileName = originalFileName?.replace(/\.[^/.]+$/, '') || 'translated-document';
      const timestamp = new Date().toISOString().split('T')[0];
      const downloadFileName = `${fileName}_translated_${timestamp}`;

      // Get the content to download (either from segments or direct content)
      const downloadContent = hasSegments
        ? translatedSegments.map(segment => segment.translatedText || segment.sourceText).join('\n\n')
        : content;

      if (format === 'txt') {
        // For text files, ensure proper UTF-8 encoding
        const blob = new Blob([downloadContent], { type: 'text/plain;charset=utf-8' });
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

        // Create translation results based on segments or content
        const translationResults = hasSegments
          ? translatedSegments.map(segment => ({
              originalText: segment.sourceText,
              translatedText: segment.translatedText || segment.sourceText,
              sourceLanguage: segment.language || 'auto',
              targetLanguage: selectedLanguage,
              confidence: 0.95,
              segmentId: segment.id
            }))
          : [{
              originalText: 'Document content',
              translatedText: downloadContent,
              sourceLanguage: 'auto',
              targetLanguage: selectedLanguage,
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
  }, [content, originalFileName, selectedLanguage]);

  // Editor states
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [lineHeight, setLineHeight] = useState(1.5);
  const [zoom, setZoom] = useState(100);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(72, prev + delta)));
  }, []);

  const handleFormat = useCallback((format: 'bold' | 'italic' | 'underline') => {
    // For now, we'll toggle the format state and apply it to the entire textarea
    // In a more advanced implementation, we could use contentEditable or a rich text editor
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

  const handleSegmentUpdate = useCallback((segmentId: string, newTranslatedText: string) => {
    setTranslatedSegments(prevSegments =>
      prevSegments.map(segment =>
        segment.id === segmentId
          ? { ...segment, translatedText: newTranslatedText }
          : segment
      )
    );

    // Update the combined content as well
    const updatedSegments = translatedSegments.map(segment =>
      segment.id === segmentId
        ? { ...segment, translatedText: newTranslatedText }
        : segment
    );
    const combinedContent = updatedSegments
      .map(segment => segment.translatedText || segment.sourceText)
      .join('\n\n');
    setContent(combinedContent);
  }, [translatedSegments]);

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const pageCount = Math.ceil(wordCount / 250);

  // Split content into pages for display - improved page management
  const words = content.split(/\s+/);
  const wordsPerPage = 250;
  const pages: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(' '));
  }

  // Ensure we have at least one page
  if (pages.length === 0) {
    pages.push('');
  }

  // Handle page content changes
  const handlePageContentChange = useCallback((pageIndex: number, newPageContent: string) => {
    const newPages = [...pages];
    newPages[pageIndex] = newPageContent;
    const newContent = newPages.join('\n\n');
    setContent(newContent);
  }, [pages]);

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

  // If no content, show a message but still show the editor
  const showNoContentMessage = !content || content.trim().length === 0;
  const hasSegments = translatedSegments && translatedSegments.length > 0;

  // Segment Editor Component for side-by-side editing
  function SegmentEditor({
    segment,
    onUpdate,
    fontSize,
    fontFamily,
    isBold,
    isItalic,
    isUnderline,
    textAlign
  }: {
    segment: any;
    onUpdate: (segmentId: string, newText: string) => void;
    fontSize: number;
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    textAlign: 'left' | 'center' | 'right' | 'justify';
  }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(segment.translatedText || '');

    // Configure marked for better rendering
    useEffect(() => {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
    }, []);

    const handleEditClick = () => {
      setIsEditing(true);
      setEditText(segment.translatedText || '');
    };

    const handleSaveEdit = () => {
      onUpdate(segment.id, editText);
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setEditText(segment.translatedText || '');
      setIsEditing(false);
    };

    // Render Markdown content synchronously
    const renderMarkdownContent = (markdownText: string): string => {
      if (!markdownText) return '';
      try {
        // Simple synchronous markdown processing
        let html = markdownText;

        // Basic markdown processing (headers, bold, italic)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
        html = html.replace(/\n/gim, '<br>');

        return html;
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdownText; // Fallback to plain text
      }
    };

    return (
      <div className="segment-pair border border-gray-200 rounded-lg mb-6 overflow-hidden">
        {/* Segment Header */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Segment {segment.segmentNumber}</span>
            <span>{segment.wordCount} words</span>
          </div>
        </div>

        <div className="flex">
          {/* Source Text (Read-only) */}
          <div className="flex-1 p-4 border-r border-gray-200 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Languages className="h-4 w-4 mr-2" />
              Source Text
            </div>
            <div
              className="text-gray-800 leading-relaxed whitespace-pre-wrap"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                lineHeight: 1.5
              }}
            >
              {segment.sourceText}
            </div>
          </div>

          {/* Translated Text (Markdown Rendered or Editable) */}
          <div className="flex-1 p-4">
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Translated Text
              </div>
              {!isEditing && (
                <button
                  onClick={handleEditClick}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[120px] p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  style={{
                    fontFamily: 'monospace', // Use monospace for Markdown editing
                    lineHeight: 1.4
                  }}
                  placeholder="Edit Markdown-formatted text..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode - Rendered Markdown */
              <div
                className="min-h-[120px] p-3 border border-gray-200 rounded bg-white prose prose-sm max-w-none"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  textAlign: textAlign,
                  lineHeight: 1.5
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownContent(segment.translatedText || '')
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="h-5 w-5" />
                <span>Back to TranslateAI</span>
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">
                  {originalFileName?.replace(/\.[^/.]+$/, '') || 'Untitled Document'} (Translated)
                </span>
              </div>
            </div>

            {/* Language Selector */}
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
      </header>

      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => alert('Undo/Redo coming soon!')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-black opacity-50 cursor-not-allowed"
                title="Undo (Coming Soon)"
              >
                <Undo className="h-4 w-4" />
              </button>
              <button
                onClick={() => alert('Undo/Redo coming soon!')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-black opacity-50 cursor-not-allowed"
                title="Redo (Coming Soon)"
              >
                <Redo className="h-4 w-4" />
              </button>
              <div className="h-6 border-l border-gray-300 mx-2"></div>

              <button
                onClick={() => alert('Advanced editing features coming soon!')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-black opacity-50 cursor-not-allowed"
                title="Copy (Coming Soon)"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => alert('Advanced editing features coming soon!')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-black opacity-50 cursor-not-allowed"
                title="Paste (Coming Soon)"
              >
                <Clipboard className="h-4 w-4" />
              </button>
              <button
                onClick={() => alert('Advanced editing features coming soon!')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-black opacity-50 cursor-not-allowed"
                title="Cut (Coming Soon)"
              >
                <Scissors className="h-4 w-4" />
              </button>
              <div className="h-6 border-l border-gray-300 mx-2"></div>
            </div>

            {/* Font Controls */}
            <div className="flex items-center space-x-2">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleFontSizeChange(-2)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors text-black"
                  title="Decrease font size"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium min-w-[2.5rem] text-center border border-gray-300 rounded px-2 py-1 text-black">
                  {fontSize}
                </span>
                <button
                  onClick={() => handleFontSizeChange(2)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors text-black"
                  title="Increase font size"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Formatting */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleFormat('bold')}
                className={`p-2 rounded transition-colors ${isBold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleFormat('italic')}
                className={`p-2 rounded transition-colors ${isItalic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleFormat('underline')}
                className={`p-2 rounded transition-colors ${isUnderline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
              <div className="h-6 border-l border-gray-300 mx-2"></div>

              <button
                onClick={() => handleTextAlign('left')}
                className={`p-2 rounded transition-colors ${textAlign === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Align left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleTextAlign('center')}
                className={`p-2 rounded transition-colors ${textAlign === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Align center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleTextAlign('right')}
                className={`p-2 rounded transition-colors ${textAlign === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Align right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleTextAlign('justify')}
                className={`p-2 rounded transition-colors ${textAlign === 'justify' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-black'}`}
                title="Justify"
              >
                <AlignLeft className="h-4 w-4 transform rotate-180" />
              </button>
            </div>

            {/* Line Spacing & Zoom */}
            <div className="flex items-center space-x-2">
              <select
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
                title="Line spacing"
              >
                <option value={1.0}>1.0</option>
                <option value={1.15}>1.15</option>
                <option value={1.5}>1.5</option>
                <option value={2.0}>2.0</option>
              </select>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleZoom(-10)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors text-black"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium min-w-[3rem] text-center text-black">{zoom}%</span>
                <button
                  onClick={() => handleZoom(10)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors text-black"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Download Options */}
            <div className="flex items-center space-x-2">
              <div className="h-6 border-l border-gray-300 mx-2"></div>
              <button
                onClick={() => handleDownload('txt')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                title="Download as plain text"
              >
                <FileText className="h-4 w-4" />
                <span>Save as TXT</span>
              </button>
              <button
                onClick={() => handleDownload('docx')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                title="Download as Word document"
              >
                <File className="h-4 w-4" />
                <span>Save as DOCX</span>
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                title="Download as PDF document"
              >
                <Download className="h-4 w-4" />
                <span>Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-black">
        <div className="flex items-center space-x-6">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
          <span>Pages: {pageCount}</span>
          <span>Font: {fontFamily} {fontSize}pt</span>
          <span>Zoom: {zoom}%</span>
        </div>
        <div className="flex items-center space-x-4">
          <Save className="h-4 w-4 text-black" />
          <span>Auto-saved</span>
        </div>
      </div>

      {/* Document Content - Either Segments or Pages */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          {hasSegments ? (
            /* Segment-based Editor */
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Segment-based Editor
                </h2>
                <p className="text-gray-600">
                  Edit translations segment by segment for perfect alignment.
                  {translatedSegments.length} segments loaded.
                </p>
              </div>

              {translatedSegments.map((segment) => (
                <SegmentEditor
                  key={segment.id}
                  segment={segment}
                  onUpdate={handleSegmentUpdate}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  isBold={isBold}
                  isItalic={isItalic}
                  isUnderline={isUnderline}
                  textAlign={textAlign}
                />
              ))}
            </div>
          ) : pages.length > 0 ? pages.map((pageContent, index) => (
            <div
              key={index}
              className="bg-white shadow-lg mb-8 p-12 min-h-[11in] border border-gray-300"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                marginBottom: `${zoom / 100 * 2}rem`
              }}
            >
              <div className="mb-8 text-center text-black text-sm border-b border-gray-200 pb-4">
                Page {index + 1} of {pages.length}
              </div>

              <textarea
                ref={index === currentPageIndex ? editorRef : undefined}
                value={pageContent}
                onChange={(e) => {
                  handlePageContentChange(index, e.target.value);
                  setCurrentPageIndex(index);
                }}
                onKeyDown={(e) => {
                  // Let the textarea handle Enter naturally, no special handling needed
                  // The textarea will automatically insert newlines
                }}
                onSelect={(e) => {
                  setCurrentPageIndex(index);
                  const textarea = e.target as HTMLTextAreaElement;
                  setSelectionStart(textarea.selectionStart);
                  setSelectionEnd(textarea.selectionEnd);
                }}
                onFocus={() => {
                  setCurrentPageIndex(index);
                }}
                className="w-full min-h-[9in] p-6 resize-none focus:outline-none bg-transparent text-black leading-relaxed border border-gray-200 rounded"
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  textAlign: textAlign,
                  lineHeight: lineHeight,
                  fontFamily: fontFamily,
                  wordSpacing: '0.1em',
                  letterSpacing: '0.01em'
                }}
                placeholder={index === 0 ? "Start typing your document content..." : ""}
              />

              {index === pages.length - 1 && (
                <div className="mt-8 text-center text-black text-sm border-t border-gray-200 pt-4">
                  End of Document
                </div>
              )}
            </div>
          )) : (
            <div className="bg-white shadow-lg p-12 min-h-[11in] border border-gray-300 flex items-center justify-center">
              <div className="text-center text-black">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Content Available</h3>
                <p className="mb-4">Please translate a document first to edit it here.</p>
                <button
                  onClick={handleBackToMain}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Translator
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
