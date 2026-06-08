import React from 'react';
import AppProviders from '@/app/providers';
import AppRoutes from '@/routes/index';
import GlobalLoader from '@/components/GlobalLoader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProviders>
        <GlobalLoader />
        <Toaster position="top-right" />
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
