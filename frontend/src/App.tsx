import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts
import Layout from './components/common/Layout';

// Pages
import Home from './pages/Home';
import Events from './pages/Events';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  const { mode } = useSelector((state: RootState) => state.theme);
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className={mode === 'dark' ? 'dark' : ''}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: mode === 'dark' ? '#1a1a1a' : '#ffffff',
                color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
                border: mode === 'dark' ? '1px solid #2b2b2b' : '1px solid #ebebeb',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'white',
                },
              },
            }}
          />
          
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Main App Routes */}
            <Route
              path="/"
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            
            <Route
              path="/events"
              element={
                <Layout>
                  <Events />
                </Layout>
              }
            />
            
            {/* Protected Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* 404 Route */}
            <Route
              path="*"
              element={
                <Layout>
                  <div className="flex flex-col items-center justify-center py-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                      404
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                      Page not found
                    </p>
                    <button
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </Layout>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;