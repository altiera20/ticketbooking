import React, { useState } from 'react';
import { Link, NavLink as RouterNavLink } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

// Custom NavLink for active styling
const NavLink: React.FC<{ to: string; onClick: () => void; children: React.ReactNode }> = ({ to, onClick, children }) => (
  <RouterNavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `font-heading text-fluid-lg transition-colors duration-300 ${
        isActive ? 'text-neon-green animate-glow' : 'text-light-text hover:text-neon-green'
      }`
    }
  >
    {children}
  </RouterNavLink>
);

// Custom AuthButton for consistent styling
const AuthButton: React.FC<{ to?: string; onClick?: () => void; children: React.ReactNode }> = ({ to, onClick, children }) => {
  const commonClasses = "font-body text-fluid-base px-5 py-2.5 rounded-md shadow-3d bg-gradient-to-br from-neon-green to-electric-blue text-dark-text font-bold border-2 border-light-text transform transition-all duration-300 hover:scale-105 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2";
  
  const content = (
    <div className="flex items-center justify-center gap-2">
      {children}
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={commonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={commonClasses}>
      {content}
    </button>
  );
};

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const navLinks = (
    <>
      <NavLink to="/" onClick={() => setIsMenuOpen(false)}>Home</NavLink>
      <NavLink to="/events" onClick={() => setIsMenuOpen(false)}>Events</NavLink>
      {isAuthenticated && user?.role === UserRole.VENDOR && (
        <NavLink to="/vendor/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</NavLink>
      )}
      <NavLink to="/about" onClick={() => setIsMenuOpen(false)}>About</NavLink>
      <NavLink to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</NavLink>
    </>
  );

  return (
    <header className="sticky top-0 z-50 p-4 bg-dark-bg/80 backdrop-blur-lg border-b-2 border-vibrant-purple shadow-neon-outline-purple">
      <div className="w-full flex items-center justify-between">
        <Link to="/" className="flex-shrink-0">
          <h1 className="font-heading text-fluid-4xl text-light-text animate-glow">UniTick</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="flex items-center space-x-2 font-bold text-fluid-lg text-light-text hover:text-neon-green">
                <FaUser className="text-neon-green" />
                <span>{user?.firstName}</span>
              </Link>
              <AuthButton onClick={handleLogout}><FaSignOutAlt /></AuthButton>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <AuthButton to="/login">Login</AuthButton>
              <AuthButton to="/register">Register</AuthButton>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="-mr-2 flex md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-neon-pink hover:text-light-text hover:bg-vibrant-purple/50">
            <span className="sr-only">Open main menu</span>
            {isMenuOpen ? <FaTimes className="block h-8 w-8 animate-spin-slow" /> : <FaBars className="block h-8 w-8 animate-pulse-slow" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden pt-10">
          <nav className="px-2 pt-2 pb-3 space-y-6 sm:px-3 flex flex-col items-center">
            {navLinks}
          </nav>
          <div className="pt-4 pb-3 mt-6 border-t-2 border-vibrant-purple">
            {isAuthenticated ? (
              <div className="flex flex-col items-center space-y-4">
                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-2 font-bold text-fluid-lg text-light-text hover:text-neon-green">
                  <FaUser className="text-neon-green" />
                  <span>{user?.firstName}</span>
                </Link>
                <AuthButton onClick={handleLogout}>Logout</AuthButton>
              </div>
            ) : (
              <div className="px-2 space-y-4 flex flex-col">
                <AuthButton to="/login" onClick={() => setIsMenuOpen(false)}>Login</AuthButton>
                <AuthButton to="/register" onClick={() => setIsMenuOpen(false)}>Register</AuthButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
