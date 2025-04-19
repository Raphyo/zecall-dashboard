'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 10000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' ? 'bg-green-50' : 'bg-red-50';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const borderColor = type === 'success' ? 'border-green-200' : 'border-red-200';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`${bgColor} ${textColor} ${borderColor} px-4 py-3 rounded-lg border shadow-lg flex items-center gap-2`}
        role="alert"
      >
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-auto inline-flex text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 