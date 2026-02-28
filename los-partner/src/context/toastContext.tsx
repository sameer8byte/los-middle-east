import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const contextValue = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }), [toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const getToastStyles = () => {
    const baseStyles = "flex items-start space-x-3 p-4 rounded-[var(--radius-brand)] shadow-lg border max-w-sm min-w-[300px] animate-in slide-in-from-right duration-300";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-[var(--color-success)] bg-opacity-10 border-[var(--color-success)] border-opacity-30`;
      case 'error':
        return `${baseStyles} bg-[var(--color-error)] bg-opacity-10 border-[var(--color-error)] border-opacity-30`;
      case 'warning':
        return `${baseStyles} bg-[var(--color-secondary)] bg-opacity-10 border-[var(--color-warning)] border-opacity-30`;
      case 'info':
        return `${baseStyles} bg-[var(--color-primary)] bg-opacity-10 border-[var(--color-primary)] border-opacity-30`;
      default:
        return `${baseStyles} bg-[var(--color-surface)] border-[var(--color-muted)]`;
    }
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return <FaCheckCircle className={`${iconClass} text-[var(--color-on-success)]`} />;
      case 'error':
        return <FaTimes className={`${iconClass} text-[var(--color-on-error)]`} />;
      case 'warning':
        return <FaExclamationTriangle className={`${iconClass} text-[var(--color-warning)]`} />;
      case 'info':
        return <FaInfoCircle className={`${iconClass} text-[var(--color-on-primary)]`} />;
      default:
        return <FaInfoCircle className={`${iconClass} text-[var(--color-on-surface)]`} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-on-surface)]">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[var(--color-on-surface)] opacity-50 hover:opacity-100 transition-opacity"
      >
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  );
};
