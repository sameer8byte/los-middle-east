import { Fragment } from "react";
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { FiX } from "react-icons/fi";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  height?: "auto" | "fixed" | "full";
  hideCloseButton?: boolean; // NEW PROP
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "lg",
  height = "auto",
  hideCloseButton = false, // default false
}: Readonly<DialogProps>) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
  };

  const heightClasses = {
    auto: "max-h-[85vh]",
    fixed: "h-[80vh]",
    full: "h-[90vh]",
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-400"
            enterFrom="opacity-0 translate-y-10 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-300"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-10 sm:scale-95"
          >
            <HeadlessDialog.Panel
              className={`
                relative w-full ${sizeClasses[size]} ${heightClasses[height]}
                bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl
                border border-white/20
                flex flex-col overflow-hidden
                transition-all transform
              `}
            >
              <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6 border-b border-gray-200/50 text-center">
                <HeadlessDialog.Title className="text-lg font-semibold text-gray-900">
                  {title}
                </HeadlessDialog.Title>

                {description && (
                  <HeadlessDialog.Description className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                    {description}
                  </HeadlessDialog.Description>
                )}

                {/* Conditionally show close button */}
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="absolute right-5 top-7 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 mt-2 scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent">
                <div className="text-gray-700 space-y-4">{children}</div>
              </div>
            </HeadlessDialog.Panel>
          </Transition.Child>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  );
}
