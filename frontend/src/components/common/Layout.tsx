import React from 'react';
import { LayoutProps } from '../../types';
import Header from './Header';
import Footer from './Footer';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-light-200 dark:bg-dark-800 transition-colors duration-300">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
