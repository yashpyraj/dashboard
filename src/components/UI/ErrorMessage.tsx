import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center relative">
      {/* Character in Error State */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Error Character"
          className="w-48 h-auto transform rotate-6"
        />
      </div>
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-100 mb-2 relative z-10">Something went wrong</h3>
      <p className="text-gray-400 mb-4 relative z-10">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-10"
        >
          Try Again
        </button>
      )}
    </div>
  );
}