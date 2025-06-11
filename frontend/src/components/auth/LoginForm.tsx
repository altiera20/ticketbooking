import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import Button from '../common/Button';
import Input from '../common/Input';

// Define validation schema with Zod
const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// TypeScript type for form data
type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      dispatch(loginStart());
      
      // Simulate API call
      // In a real app, you would call your API here
      const response = await new Promise<{ user: any; accessToken: string; refreshToken: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            user: {
              id: '1',
              firstName: 'John',
              lastName: 'Doe',
              email: data.email,
              role: 'user',
              walletBalance: 1000,
              isEmailVerified: true,
              isActive: true,
            },
            accessToken: 'fake-access-token',
            refreshToken: 'fake-refresh-token',
          });
        }, 1000);
      });
      
      dispatch(loginSuccess({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
      }));
      
      toast.success('Login successful!');
    } catch (error) {
      dispatch(loginFailure('Invalid email or password'));
      toast.error('Login failed. Please check your credentials.');
    }
  };
  
  return (
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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            leftIcon={<FaLock />}
            error={errors.password?.message}
            {...register('password')}
            required
            autoComplete="current-password"
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
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            {...register('rememberMe')}
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Remember me
          </label>
        </div>
        
        <div className="text-sm">
          <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Forgot your password?
          </Link>
        </div>
      </div>
      
      <div>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign in
        </Button>
      </div>
      
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;
