'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  summary: string;
}

const formatTranscript = (transcript: string) => {
  return transcript.split('\n').map((line, index) => {
    if (line.startsWith('User:')) {
      return (
        <div key={index} className="mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-800 font-medium mb-1">Utilisateur</p>
            <p className="text-blue-900">{line.replace('User:', '').trim()}</p>
          </div>
        </div>
      );
    } else if (line.startsWith('Assistant:')) {
      return (
        <div key={index} className="mb-4">
          <div className="bg-orange-50 p-3 rounded-lg">
            <p className="text-orange-800 font-medium mb-1">Assistant</p>
            <p className="text-orange-900">{line.replace('Assistant:', '').trim()}</p>
          </div>
        </div>
      );
    }
    return null;
  });
};

export function TranscriptModal({ isOpen, onClose, transcript, summary }: TranscriptModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-medium">
                    Transcription de l'appel
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Résumé</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Transcription complète</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto p-4 border rounded-lg">
                      {formatTranscript(transcript)}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 