// components/Sidebar.tsx
import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FiX } from "react-icons/fi";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  title,
  children,
  width = "w-1/2",
}: SidebarProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black opacity-35 " />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-200"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel
                className={`fixed inset-y-0 right-0 ${width} bg-white shadow-xl`}
              >
                <div className="flex flex-col h-full p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                      onClick={() => onClose()}
                      className="text-[var(--color-on-surface)] opacity-70 hover:text-black"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">{children}</div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
