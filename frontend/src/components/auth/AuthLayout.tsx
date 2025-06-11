import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayoutProps } from '../../types';

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-light-200 dark:bg-dark-800 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">TicketBooking</h1>
        </Link>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
        
        {subtitle && (
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-dark-700 py-8 px-4 shadow sm:rounded-lg sm:px-10 transition-colors duration-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
