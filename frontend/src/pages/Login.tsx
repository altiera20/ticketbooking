import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import LoginForm from '../components/auth/LoginForm';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleLoginSuccess = () => {
    // Check if there was a booking intent
    const bookingIntent = sessionStorage.getItem('bookingIntent');
    if (bookingIntent) {
      // Clear the booking intent
      sessionStorage.removeItem('bookingIntent');
      // Navigate back to the event page
      navigate(from);
    } else {
      // Navigate to default page
      navigate('/');
    }
  };

  return (
    <AuthLayout 
      title="Sign in to your account" 
      subtitle="Welcome back! Please enter your details."
    >
      <div className="w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8">Welcome Back</h2>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </AuthLayout>
  );
};

export default Login;
