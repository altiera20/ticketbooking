import React from 'react';
import AuthLayout from '../components/auth/AuthLayout';
import RegisterForm from '../components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <AuthLayout 
      title="Create an account" 
      subtitle="Join us today! Enter your details to get started."
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;
