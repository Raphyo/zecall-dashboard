import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Retour',
  isLoading = false,
  isDanger = false
}: ConfirmDialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !isLoading && onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all border border-gray-100">
                <div className={`flex items-center justify-center w-14 h-14 mx-auto mb-6 rounded-full ${isDanger ? 'bg-red-50/80 ring-8 ring-red-50' : 'bg-blue-50/80 ring-8 ring-blue-50'}`}>
                  {isDanger ? (
                    <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  )}
                </div>
                <Dialog.Title
                  as="h3"
                  className="text-xl font-semibold text-center text-gray-900 mb-3"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-3">
                  <p className="text-sm text-center leading-relaxed text-gray-500">
                    {message}
                  </p>
                </div>

                <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 
                    hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out active:scale-[0.98]"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center items-center px-5 py-2.5 rounded-lg border border-transparent 
                    ${isDanger 
                      ? 'bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500' 
                      : 'bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out
                    shadow-sm hover:shadow active:scale-[0.98] active:shadow-none`}
                    onClick={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Chargement...</span>
                      </>
                    ) : (
                      confirmLabel
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 