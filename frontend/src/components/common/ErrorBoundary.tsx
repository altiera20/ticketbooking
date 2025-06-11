import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import Button from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-light-100 dark:bg-dark-800 text-center">
      <div className="w-full max-w-md p-6 bg-white dark:bg-dark-700 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-error-600 dark:text-error-400 mb-4">
          Something went wrong
        </h2>
        <div className="bg-error-50 dark:bg-error-900/30 p-4 rounded-md mb-4">
          <p className="text-error-800 dark:text-error-300 font-mono text-sm overflow-auto max-h-40">
            {error.message}
          </p>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </p>
        <Button
          variant="primary"
          onClick={resetErrorBoundary}
          fullWidth
        >
          Try Again
        </Button>
      </div>
    </div>
  );
};

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset application state here if needed
        window.location.href = '/';
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary; 