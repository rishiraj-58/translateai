'use client';

import { CheckCircle, Loader } from 'lucide-react';

interface TranslationProgressProps {
  progress: number;
  currentStep: string;
}

export function TranslationProgress({ progress, currentStep }: TranslationProgressProps) {
  const steps = [
    { id: 1, name: 'Extracting text', completed: progress >= 25 },
    { id: 2, name: 'Processing chunks', completed: progress >= 50 },
    { id: 3, name: 'Translating content', completed: progress >= 75 },
    { id: 4, name: 'Reconstructing document', completed: progress >= 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Translation Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 text-gray-900">
          {progress < 100 ? (
            <Loader className="h-5 w-5 animate-spin text-blue-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          <span className="font-medium">{currentStep}</span>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 gap-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center space-x-2 p-3 rounded-lg transition-all ${
              step.completed
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              step.completed
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}>
              {step.completed ? (
                <CheckCircle className="h-4 w-4 text-white" />
              ) : (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className={`text-sm font-medium ${
              step.completed ? 'text-green-800' : 'text-gray-600'
            }`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {/* Estimated Time */}
      {progress < 100 && (
        <div className="text-center text-sm text-gray-500">
          <p>This may take a few minutes depending on document size</p>
        </div>
      )}
    </div>
  );
}

