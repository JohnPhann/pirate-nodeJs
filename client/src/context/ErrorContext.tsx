import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ErrorAlert from '../components/ErrorAlert';
import { setErrorHandler } from '../utils/api';

interface ErrorContextType {
  showError: (message: string, description?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<{ message: string; description?: string } | null>(null);

  const showError = useCallback((message: string, description?: string) => {
    setError({ message, description });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const handleClose = useCallback(() => {
    setError(null);
  }, []);

  // Set the error handler when the provider mounts
  useEffect(() => {
    setErrorHandler(showError);
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && (
        <ErrorAlert
          message={error.message}
          description={error.description}
          onClose={handleClose}
        />
      )}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}; 