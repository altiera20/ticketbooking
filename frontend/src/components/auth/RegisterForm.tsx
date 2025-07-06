import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaPhone } from 'react-icons/fa';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import { UserRole } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import authService from '../../services/auth.service';

// Define validation schema with Zod
const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(100, 'First name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]*$/, 'First name must contain only letters and spaces'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(100, 'Last name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Last name must contain only letters and spaces'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// TypeScript type for form data
type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const dispatch = useDispatch();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: UserRole.USER,
      phone: '',
      agreeToTerms: false,
    },
  });
  
  const selectedRole = watch('role');
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      dispatch(loginStart());
      
      // Use the actual authService instead of mock data
      const { user, token, refreshToken } = await authService.register(data);
      
      dispatch(loginSuccess({
        user,
        token,
        refreshToken
      }));
      
      toast.success('Registration successful! Please verify your email.');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            id="firstName"
            type="text"
            label="First name"
            placeholder="John"
            leftIcon={<FaUser />}
            error={errors.firstName?.message}
            {...register('firstName')}
            required
            autoComplete="given-name"
          />
        </div>
        
        <div>
          <Input
            id="lastName"
            type="text"
            label="Last name"
            placeholder="Doe"
            leftIcon={<FaUser />}
            error={errors.lastName?.message}
            {...register('lastName')}
            required
            autoComplete="family-name"
          />
        </div>
      </div>
      
      <div>
        <Input
          id="email"
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
            type={showPassword ? 'text' : 'password'}
            label="Password"
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
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Account type
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <input
              type="radio"
              id="user-role"
              value={UserRole.USER}
              className="sr-only"
              {...register('role')}
            />
            <label
              htmlFor="user-role"
              className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                selectedRole === UserRole.USER
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }`}
            >
              User
            </label>
          </div>
          <div>
            <input
              type="radio"
              id="vendor-role"
              value={UserRole.VENDOR}
              className="sr-only"
              {...register('role')}
            />
            <label
              htmlFor="vendor-role"
              className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                selectedRole === UserRole.VENDOR
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }`}
            >
              Vendor
            </label>
          </div>
          <div>
            <input
              type="radio"
              id="admin-role"
              value={UserRole.ADMIN}
              className="sr-only"
              {...register('role')}
            />
            <label
              htmlFor="admin-role"
              className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                selectedRole === UserRole.ADMIN
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }`}
            >
              Admin
            </label>
          </div>
        </div>
      </div>
      
      {selectedRole === UserRole.VENDOR && (
        <div>
          <Input
            id="phone"
            type="tel"
            label="Phone number (for vendors)"
            placeholder="+1 (555) 123-4567"
            leftIcon={<FaPhone />}
            error={errors.phone?.message}
            {...register('phone')}
            autoComplete="tel"
          />
        </div>
      )}
      
      <div className="flex items-center">
        <input
          id="agreeToTerms"
          type="checkbox"
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          {...register('agreeToTerms')}
        />
        <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          I agree to the{' '}
          <Link to="/terms" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Privacy Policy
          </Link>
        </label>
      </div>
      {errors.agreeToTerms && (
        <p className="mt-1 text-sm text-error-600 dark:text-error-400">
          {errors.agreeToTerms.message}
        </p>
      )}
      
      <div>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Create account
        </Button>
      </div>
      
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;
