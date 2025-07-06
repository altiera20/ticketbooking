import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaUser, FaEnvelope, FaPhone, FaSave } from 'react-icons/fa';
import Button from '../common/Button';
import Input from '../common/Input';
import ProfilePicture from './ProfilePicture';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateUserProfile } from '../../store/slices/authSlice';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

// Define validation schema with Zod
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  phone: z.string().optional().refine(val => !val || /^[0-9+\-\s()]{7,15}$/.test(val), {
    message: 'Please enter a valid phone number',
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfileForm: React.FC = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await api.put<{user: any}>('/users/profile', data);
      
      if (response.data.user) {
        dispatch(updateUserProfile(response.data.user));
        toast.success('Profile updated successfully');
        reset(data); // Reset form with new values
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    }
  };
  
  const handleProfilePictureUpdate = (imageUrl: string) => {
    if (user) {
      dispatch(updateUserProfile({ ...user, profilePicture: imageUrl }));
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center mb-8">
        <div className="flex justify-center md:justify-start mb-4 md:mb-0 md:mr-8">
          <ProfilePicture 
            currentImageUrl={user?.profilePicture}
            onUploadSuccess={handleProfilePictureUpdate}
            size="lg"
          />
        </div>
        
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Profile Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Update your personal information and profile picture
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              id="firstName"
              label="First Name"
              placeholder="John"
              leftIcon={<FaUser />}
              error={errors.firstName?.message}
              {...register('firstName')}
              required
            />
          </div>
          
          <div>
            <Input
              id="lastName"
              label="Last Name"
              placeholder="Doe"
              leftIcon={<FaUser />}
              error={errors.lastName?.message}
              {...register('lastName')}
              required
            />
          </div>
        </div>
        
        <div>
          <Input
            id="email"
            name="email"
            label="Email Address"
            placeholder="john.doe@example.com"
            leftIcon={<FaEnvelope />}
            value={user?.email || ''}
            disabled
          />
        </div>
        
        <div>
          <Input
            id="phone"
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            leftIcon={<FaPhone />}
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<FaSave />}
            loading={isLoading}
            disabled={isLoading || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
