import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { IoReload } from 'react-icons/io5';
import { RiWifiOffLine } from 'react-icons/ri';
import { HiPhone, HiX, HiMinus } from 'react-icons/hi';
import { BsPin, BsPinFill } from 'react-icons/bs';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';

// ════════════════════════════════════════════════════
// ACEFONE IFRAME CONFIGURATION
// ════════════════════════════════════════════════════
const ACEFONE_IFRAME_URL = 'https://console.acefone.in/dialer/login';

interface AcefoneDialerContextType {
  isOpen: boolean;
  isConnected: boolean;
  isPinned: boolean;
  openDialer: () => void;
  closeDialer: () => void;
  toggleDialer: () => void;
}

const AcefoneDialerContext = createContext<AcefoneDialerContextType | null>(null);

export const useAcefoneDialer = () => {
  const context = useContext(AcefoneDialerContext);
  if (!context) {
    throw new Error('useAcefoneDialer must be used within AcefoneDialerProvider');
  }
  return context;
};

interface AcefoneDialerProviderProps {
  children: ReactNode;
  debug?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export const AcefoneDialerProvider = ({
  children,
  debug = false,
  autoRetry = true,
  maxRetries = 3,
  retryDelay = 2000,
}: AcefoneDialerProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 420 : 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);

  // Log helper
  const log = useCallback((message: string, data?: unknown) => {
    if (debug) {
      console.log(`[AcefoneDialer] ${message}`, data || '');
    }
  }, [debug]);

  const openDialer = useCallback(() => {
    setIsOpen(true);
    if (!hasEverOpened) {
      setHasEverOpened(true);
      setIsLoading(true);
      setError(null);
    }
  }, [hasEverOpened]);

  const closeDialer = useCallback(() => {
    if (!isPinned) {
      setIsOpen(false);
    }
  }, [isPinned]);

  const toggleDialer = useCallback(() => {
    if (isOpen) {
      closeDialer();
    } else {
      openDialer();
    }
  }, [isOpen, openDialer, closeDialer]);

  // Toggle pin state
  const togglePin = () => {
    setIsPinned((prev) => {
      const newState = !prev;
      if (newState) {
        toast.info('Dialer pinned - will stay open in background', { autoClose: 2000 });
      } else {
        toast.info('Dialer unpinned', { autoClose: 2000 });
      }
      return newState;
    });
  };

  // Toggle minimize state
  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  // iframe load handling
  useEffect(() => {
    if (!hasEverOpened) return;

    const iframe = iframeRef.current;
    if (!iframe) {
      log('iframe ref not available');
      return;
    }

    const handleLoad = () => {
      log('iframe loaded successfully');
      setIsLoading(false);
      setError(null);
      setRetryCount(0);
      setIsConnected(true);
      toast.success('Acefone Dialer ready', { autoClose: 2000 });
    };

    const handleError = () => {
      const err = new Error(
        'Failed to load Acefone Dialer. Please check your network connection and permissions.',
      );
      log('iframe load error', err);
      setError(err);
      setIsLoading(false);
      setIsConnected(false);

      // Auto-retry logic
      if (autoRetry && retryCount < maxRetries) {
        const nextRetryCount = retryCount + 1;
        log(`Scheduling retry ${nextRetryCount}/${maxRetries}`);

        setTimeout(() => {
          log(`Attempting retry ${nextRetryCount}/${maxRetries}`);
          setRetryCount(nextRetryCount);
          if (iframe) {
            iframe.src = `${ACEFONE_IFRAME_URL}?retry=${nextRetryCount}&t=${Date.now()}`;
          }
        }, retryDelay);

        toast.warning(
          `Connection failed. Retrying (${nextRetryCount}/${maxRetries})...`,
          { autoClose: 3000 },
        );
      } else {
        log('Max retries exceeded or auto-retry disabled');
        toast.error(
          'Failed to load Acefone Dialer after multiple attempts. Please try again later.',
          { autoClose: 5000 },
        );
      }
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [hasEverOpened, autoRetry, maxRetries, retryDelay, retryCount, log]);

  const handleRetry = () => {
    log('Manual retry initiated');
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    if (iframeRef.current) {
      iframeRef.current.src = `${ACEFONE_IFRAME_URL}?t=${Date.now()}`;
    }
  };

  const contextValue: AcefoneDialerContextType = useMemo(() => ({
    isOpen,
    isConnected,
    isPinned,
    openDialer,
    closeDialer,
    toggleDialer,
  }), [isOpen, isConnected, isPinned, openDialer, closeDialer, toggleDialer]);

  // Floating panel component - rendered separately to keep iframe alive
  const FloatingPanel = hasEverOpened ? (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        // Use visibility instead of display to keep iframe alive
        visibility: isOpen ? 'visible' : 'hidden',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-in-out',
      }}
      className={cn(
        'w-[400px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden',
        isDragging && 'cursor-grabbing'
      )}
    >
      {/* Header - Draggable */}
      <div
        role="toolbar"
        aria-label="Dialer window controls - drag to move"
        className="p-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HiPhone className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Acefone Dialer
            </h3>
            {isConnected && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Connected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {/* Minimize Button */}
            <button
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500"
              aria-label={isMinimized ? 'Expand dialer' : 'Minimize dialer'}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <HiMinus className="w-4 h-4" />
            </button>
            {/* Pin Button */}
            <button
              onClick={togglePin}
              className={cn(
                'p-1.5 rounded transition-colors',
                isPinned
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'hover:bg-gray-100 text-gray-500'
              )}
              aria-label={isPinned ? 'Unpin dialer' : 'Pin dialer to keep open'}
              title={isPinned ? 'Unpin dialer' : 'Pin to keep open in background'}
            >
              {isPinned ? (
                <BsPinFill className="w-4 h-4" />
              ) : (
                <BsPin className="w-4 h-4" />
              )}
            </button>
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded transition-colors text-gray-500"
              aria-label="Close dialer"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: isMinimized ? 'none' : 'block' }}>
        <div className="relative" style={{ height: '450px' }}>
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-700 font-semibold">
                  Connecting to Acefone Dialer...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Please wait while we establish the connection
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 overflow-auto p-4 bg-red-50 z-10">
              <div className="flex items-start gap-4">
                <RiWifiOffLine
                  className="text-red-600 flex-shrink-0 mt-1"
                  size={24}
                />
                <div className="flex-1">
                  <h3 className="text-red-800 font-bold text-lg mb-2">
                    Unable to Load Dialer
                  </h3>
                  <p className="text-red-700 text-sm mb-4">{error.message}</p>

                  <div className="text-sm text-gray-700 bg-white rounded p-4 mb-4 border border-red-200">
                    <p className="font-semibold mb-3 text-gray-800">
                      ✓ Quick Troubleshooting:
                    </p>
                    <ul className="space-y-2 list-none">
                      <li className="flex gap-2">
                        <span className="text-blue-600">→</span>
                        <span>
                          <strong>Browser Permissions:</strong> Allow
                          microphone and speaker access
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600">→</span>
                        <span>
                          <strong>Network:</strong> Check your internet
                          connection
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-600">→</span>
                        <span>
                          <strong>Firewall:</strong> Ensure required ports are
                          open
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                  >
                    <IoReload size={16} />
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* iframe Element - ALWAYS MOUNTED once hasEverOpened is true */}
          <iframe
            ref={iframeRef}
            id="acefone-dialer"
            src={ACEFONE_IFRAME_URL}
            width="100%"
            height="100%"
            title="Acefone Dialer"
            allow="microphone; camera; speaker; microphone *; camera *; speaker *; usb; payment; geolocation"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-pointer-lock allow-presentation"
            style={{
              border: 'none',
              visibility: error || isLoading ? 'hidden' : 'visible',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Powered by Acefone</span>
            <button
              onClick={handleRetry}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              disabled={isLoading}
            >
              <IoReload size={12} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <AcefoneDialerContext.Provider value={contextValue}>
      {children}
      {/* Portal the floating panel to document.body */}
      {FloatingPanel && createPortal(FloatingPanel, document.body)}
    </AcefoneDialerContext.Provider>
  );
};