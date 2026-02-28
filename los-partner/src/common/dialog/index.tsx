import { Fragment } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { FiX } from 'react-icons/fi';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  height?: 'auto' | 'fixed' | 'full';
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  height = 'auto',
}: Readonly<DialogProps>) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  const heightClasses = {
    auto: 'max-h-[90vh]',
    fixed: 'h-[80vh]',
    full: 'h-[90vh]',
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-[100]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity" />
        </Transition.Child>

        {/* Dialog Container */}
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:py-10">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <HeadlessDialog.Panel
              className={`
                w-full ${sizeClasses[size]} ${heightClasses[height]}
                bg-white rounded-xl border border-[var(--border)]
                shadow-xl flex flex-col overflow-hidden
              `}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-[var(--border)]">
                <HeadlessDialog.Title className="text-lg font-semibold text-[var(--foreground)]">
                  {title}
                </HeadlessDialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    p-2 rounded-lg
                    text-gray-500 
                    hover:text-gray-900
                    hover:bg-gray-100
                    active:bg-gray-200
                    transition-all duration-200 ease-in-out
                    hover:scale-110
                    active:scale-95
                    focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1
                  "
                  aria-label="Close dialog"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {children}
              </div>
            </HeadlessDialog.Panel>
          </Transition.Child>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  );
}
