import { memo } from 'react';
import { HiPhone } from 'react-icons/hi';
import { BsPinFill } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useAcefoneDialer } from '../context/AcefoneDialerContext';

interface AcefoneIframeDialerProps {
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * AcefoneIframeDialer Component
 *
 * Renders a phone icon button that toggles the Acefone dialer panel.
 * The dialer panel is managed by AcefoneDialerProvider and persists
 * across page navigation.
 *
 * @example
 * ```tsx
 * // Wrap your app with the provider (in App.tsx or layout)
 * <AcefoneDialerProvider>
 *   <App />
 * </AcefoneDialerProvider>
 *
 * // Use the button anywhere
 * <AcefoneIframeDialer />
 * ```
 */
export const AcefoneIframeDialer = memo(({
  className = '',
}: AcefoneIframeDialerProps) => {
  const { isOpen, isConnected, isPinned, toggleDialer } = useAcefoneDialer();

  return (
    <div className={cn('relative', className)}>
      {/* Phone Button */}
      <button
        onClick={toggleDialer}
        className={cn(
          'relative p-2 rounded-lg transition-all duration-200',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
          isOpen && 'bg-gray-100',
          isPinned && 'ring-2 ring-blue-400',
        )}
        aria-label={isConnected ? 'Dialer (Connected)' : 'Dialer'}
      >
        <HiPhone className="w-6 h-6 text-gray-600" />

        {/* Connection Status Badge */}
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            />
          )}
        </AnimatePresence>

        {/* Pinned Indicator */}
        <AnimatePresence>
          {isPinned && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1"
            >
              <BsPinFill className="w-3 h-3 text-blue-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
});

AcefoneIframeDialer.displayName = 'AcefoneIframeDialer';

// Re-export the provider and hook for convenience
export { AcefoneDialerProvider, useAcefoneDialer } from '../context/AcefoneDialerContext';