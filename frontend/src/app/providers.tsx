import React, { type ReactNode } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';

interface ProvidersProps {
  children: ReactNode;
}

const AppProviders: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </Router>
  );
};

export default AppProviders;
