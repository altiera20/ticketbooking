import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

// Define validation schema with Zod
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  
  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(location.search);
    const resetToken = params.get('token');
    
    if (!resetToken) {
      setTokenError('Missing password reset token. Please request a new password reset link.');
    } else {
      setToken(resetToken);
    }
  }, [location]);
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Call the API to reset password
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      
      setIsSuccess(true);
      toast.success('Password reset successful');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error('Failed to reset password. The token may be invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (tokenError) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        subtitle="We couldn't verify your password reset request"
      >
        <div className="space-y-6">
          <div className="bg-error-50 dark:bg-error-900/30 p-4 rounded-md text-center">
            <p className="text-error-800 dark:text-error-300">
              {tokenError}
            </p>
          </div>
          
          <div className="pt-4">
            <Link to="/forgot-password">
              <Button variant="primary" fullWidth>
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }
  
  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Reset Successful"
        subtitle="Your password has been updated"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <FaCheckCircle className="text-success-500 text-5xl" />
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You can now log in with your new password.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to login page...
            </p>
          </div>
          
          <div className="pt-4">
            <Link to="/login">
              <Button variant="primary" fullWidth>
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }
  
  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter your new password below"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="New password"
              placeholder="••••••••"
              leftIcon={<FaLock />}
              error={errors.password?.message}
              {...register('password')}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm password"
              placeholder="••••••••"
              leftIcon={<FaLock />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Your password must contain:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>At least 8 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
            <li>At least one special character</li>
          </ul>
        </div>
        
        <div>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Reset Password
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
