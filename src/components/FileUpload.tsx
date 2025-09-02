'use client';

import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document (.pdf, .docx, .doc)');
      return false;
    }

    if (file.size > 200 * 1024 * 1024) { // 200MB limit
      setError('File size must be less than 200MB');
      return false;
    }

    setError('');
    return true;
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileUpload(file);
      }
    }
  }, [onFileUpload]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileUpload(file);
      }
    }
  }, [onFileUpload]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setError('');
  }, []);

  if (selectedFile) {
    return (
      <div className="text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-bounce-subtle">
          <FileText className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">File Selected Successfully!</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500 p-1 transition-colors rounded-full hover:bg-red-50 focus-ring"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
            ✅ Ready to translate! Click "Start Translation" to begin the process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div
        className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 hover-lift cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 animate-pulse-glow scale-105'
            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full transition-all duration-300 ${
            isDragOver ? 'bg-blue-100 scale-110' : 'bg-gray-100 hover:bg-blue-50'
          }`}>
            <Upload className={`h-8 w-8 transition-all duration-300 ${
              isDragOver ? 'text-blue-600 animate-bounce' : 'text-gray-400'
            }`} />
          </div>

          <div className="animate-fade-in-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragOver ? 'Drop your file here!' : 'Upload Your Document'}
            </h3>
            <p className={`text-gray-600 mb-4 transition-colors ${
              isDragOver ? 'text-blue-700' : ''
            }`}>
              {isDragOver
                ? 'Release to upload your document'
                : 'Drag and drop your PDF or Word document here, or click to browse'
              }
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                PDF (.pdf)
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Word (.docx)
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                Max 200MB
              </span>
            </div>
          </div>

          <label className="cursor-pointer animate-slide-in-left">
            <span className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg focus-ring">
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in-up">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
