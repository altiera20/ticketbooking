import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

// Define validation schema with Zod
const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      
      // Call the API to request password reset
      await api.post('/auth/forgot-password', { email: data.email });
      
      setIsEmailSent(true);
      toast.success('If your email is registered, you will receive a password reset link');
    } catch (error) {
      // Don't reveal if the email exists or not
      toast.success('If your email is registered, you will receive a password reset link');
      setIsEmailSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AuthLayout
      title={isEmailSent ? "Check Your Email" : "Forgot Password"}
      subtitle={isEmailSent 
        ? "We've sent you an email with instructions to reset your password."
        : "Enter your email and we'll send you instructions to reset your password."
      }
    >
      {!isEmailSent ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              leftIcon={<FaEnvelope />}
              error={errors.email?.message}
              {...register('email')}
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Send Reset Link
            </Button>
          </div>
          
          <div className="text-center mt-4">
            <Link 
              to="/login" 
              className="flex items-center justify-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <FaArrowLeft className="mr-2" />
              Back to Login
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-md text-center">
            <p className="text-primary-800 dark:text-primary-300">
              If the email address you entered is registered in our system, you will receive an email with instructions to reset your password shortly.
            </p>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Didn't receive an email?</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Verify you entered the correct email address</li>
              <li>Wait a few minutes and check again</li>
            </ul>
          </div>
          
          <div className="pt-4">
            <Link to="/login">
              <Button variant="outline" fullWidth>
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;