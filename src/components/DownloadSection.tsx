'use client';

import { useState } from 'react';
import { Download, FileText, File } from 'lucide-react';
import { createDocumentReconstructor, downloadBlob, generateFilename } from '@/utils/documentReconstruction';
import { TranslationResult } from '@/utils/translationService';

interface DownloadSectionProps {
  translatedContent: string;
  translationResults?: TranslationResult[];
  originalFileName?: string;
  translatedSegments?: any[];
  highFidelityResult?: {
    docxBuffer?: string;
    highFidelity: boolean;
  };
}

export function DownloadSection({
  translatedContent,
  translationResults = [],
  originalFileName = 'document',
  translatedSegments = [],
  highFidelityResult
}: DownloadSectionProps) {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDownload = async (format: 'pdf' | 'docx' | 'txt' | 'html') => {
    setIsDownloading(format);

    try {
      let blob: Blob;
      let filename: string;

      // Handle high-fidelity DOCX download
      if (format === 'docx' && highFidelityResult?.docxBuffer) {
        blob = new Blob(
          [Uint8Array.from(atob(highFidelityResult.docxBuffer), c => c.charCodeAt(0))],
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        filename = generateFilename(originalFileName, 'docx');
        downloadBlob(blob, filename);
        setIsDownloading(null);
        return;
      }

      if (translationResults.length > 0) {
        // Use document reconstructor for proper formatting
        const reconstructor = createDocumentReconstructor(translationResults, {
          title: originalFileName.replace(/\.[^/.]+$/, '') + ' (Translated)',
          subject: 'Translated Document',
          creator: 'TranslateAI'
        });

        switch (format) {
          case 'pdf':
            blob = await reconstructor.createPDFDocument();
            filename = generateFilename(originalFileName, 'pdf');
            break;
          case 'docx':
            blob = await reconstructor.createWordDocument();
            filename = generateFilename(originalFileName, 'docx');
            break;
          case 'html':
            blob = await reconstructor.createHTMLFile();
            filename = generateFilename(originalFileName, 'html');
            break;
          default:
            blob = await reconstructor.createTextFile();
            filename = generateFilename(originalFileName, 'txt');
        }
      } else {
        // Fallback for simple text download
        blob = new Blob([translatedContent], {
          type: getMimeType(format)
        });
        filename = generateFilename(originalFileName, format);
      }

      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };

  const getMimeType = (format: string): string => {
    switch (format) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'html': return 'text/html';
      default: return 'text/plain';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <Download className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-600 mb-6">
          🎉 Your document has been successfully translated! Download in your preferred format:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PDF Download */}
        <button
          onClick={() => handleDownload('pdf')}
          disabled={isDownloading !== null}
          className="group flex flex-col items-center justify-center space-y-3 p-6 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
        >
          <div className="flex-shrink-0 p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
            {isDownloading === 'pdf' ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" />
            ) : (
              <FileText className="h-6 w-6 text-red-600" />
            )}
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
              PDF Format
            </div>
            <div className="text-xs text-gray-500 mt-1">Portable Document</div>
          </div>
        </button>

        {/* Word Download */}
        <button
          onClick={() => handleDownload('docx')}
          disabled={isDownloading !== null}
          className="group flex flex-col items-center justify-center space-y-3 p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
        >
          <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            {isDownloading === 'docx' ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            ) : (
              <File className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              Word Format
            </div>
            <div className="text-xs text-gray-500 mt-1">Microsoft Word</div>
          </div>
        </button>

        {/* HTML Download */}
        <button
          onClick={() => handleDownload('html')}
          disabled={isDownloading !== null}
          className="group flex flex-col items-center justify-center space-y-3 p-6 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
        >
          <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
            {isDownloading === 'html' ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
            ) : (
              <div className="h-6 w-6 bg-green-600 rounded text-white text-xs font-bold flex items-center justify-center">H</div>
            )}
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
              HTML Format
            </div>
            <div className="text-xs text-gray-500 mt-1">Web Format</div>
          </div>
        </button>

        {/* Text Download */}
        <button
          onClick={() => handleDownload('txt')}
          disabled={isDownloading !== null}
          className="group flex flex-col items-center justify-center space-y-3 p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
        >
          <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
            {isDownloading === 'txt' ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            ) : (
              <div className="h-6 w-6 bg-purple-600 rounded text-white text-xs font-bold flex items-center justify-center">T</div>
            )}
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
              Text Format
            </div>
            <div className="text-xs text-gray-500 mt-1">Plain Text</div>
          </div>
        </button>
      </div>

      {/* Preview Section */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
        <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
            {translatedContent.length > 500
              ? `${translatedContent.substring(0, 500)}...`
              : translatedContent
            }
          </pre>
        </div>
        {translatedContent.length > 500 && (
          <p className="text-xs text-gray-500 mt-2">
            Showing first 500 characters. Full document available in download.
          </p>
        )}
      </div>

      {/* Additional Options */}
      <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Translate Another Document
        </button>
      </div>
    </div>
  );
}
