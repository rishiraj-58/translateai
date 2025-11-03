'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText, Trash2, Eye, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { marked } from 'marked';

interface Translation {
  id: number;
  original_file_name: string;
  translated_preview?: string;
  translated_text?: string;
  source_language: string;
  target_language: string;
  file_type: string;
  file_size: number;
  page_count: number;
  high_fidelity: boolean;
  created_at: string;
}

interface TranslationHistoryProps {
  onClose?: () => void;
}

export function TranslationHistory({ onClose }: TranslationHistoryProps) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [viewingTranslation, setViewingTranslation] = useState<Translation | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchTranslations();
  }, [page]);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/translations/list?limit=${ITEMS_PER_PAGE}&offset=${page * ITEMS_PER_PAGE}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch translations');
      }

      const data = await response.json();
      setTranslations(data.translations || []);
      setTotal(data.pagination?.total || 0);
      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      console.error('Error fetching translations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  const viewFullTranslation = async (id: number) => {
    try {
      const response = await fetch(`/api/translations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch translation');
      
      const data = await response.json();
      setViewingTranslation(data.translation);
    } catch (err) {
      console.error('Error fetching full translation:', err);
      alert('Failed to load translation details');
    }
  };

  const deleteTranslation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this translation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/translations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete translation');

      // Refresh the list
      fetchTranslations();
    } catch (err) {
      console.error('Error deleting translation:', err);
      alert('Failed to delete translation');
    }
  };

  const downloadTranslation = (translation: Translation) => {
    const content = translation.translated_text || translation.translated_preview || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${translation.original_file_name.replace(/\.[^/.]+$/, '')}_translated.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  if (loading && translations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading translations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {error.includes('Database') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-left">
                <p className="font-medium text-blue-900 mb-2">PostgreSQL Setup Required:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Install PostgreSQL on your system</li>
                  <li>Create a database named 'translateai'</li>
                  <li>Update .env.local with your database credentials</li>
                  <li>Restart the application</li>
                </ol>
              </div>
            )}
            <button
              onClick={fetchTranslations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // View full translation modal
  if (viewingTranslation) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{viewingTranslation.original_file_name}</h2>
                  <p className="text-blue-100">
                    Translated on {formatDate(viewingTranslation.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTranslation(null)}
                  className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {viewingTranslation.file_type}
                </span>
                <span>{formatFileSize(viewingTranslation.file_size)}</span>
                <span>{viewingTranslation.page_count} pages</span>
                <span className="uppercase font-medium">{viewingTranslation.target_language}</span>
              </div>

              {/* Translated text with markdown rendering */}
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: marked(viewingTranslation.translated_text || '') 
                }}
              />

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => downloadTranslation(viewingTranslation)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => setViewingTranslation(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Translation History</h1>
              <p className="text-gray-600">{total} saved translations</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Translator
              </button>
            )}
          </div>
        </div>

        {/* Translation List */}
        {translations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Translations Yet</h3>
            <p className="text-gray-600">
              Your saved translations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {translations.map((translation) => (
              <div
                key={translation.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {translation.original_file_name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {translation.translated_preview}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(translation.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {translation.file_type}
                      </span>
                      <span>{formatFileSize(translation.file_size)}</span>
                      <span className="uppercase font-medium">
                        {translation.target_language}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => viewFullTranslation(translation.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteTranslation(translation.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > ITEMS_PER_PAGE && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <span className="text-gray-600">
              Page {page + 1} of {Math.ceil(total / ITEMS_PER_PAGE)}
            </span>
            
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

