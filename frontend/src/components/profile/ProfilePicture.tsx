import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCamera, FaSpinner, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import useFileUpload from '../../hooks/useFileUpload';

interface ProfilePictureProps {
  currentImageUrl?: string | null;
  onUploadSuccess?: (imageUrl: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  currentImageUrl,
  onUploadSuccess,
  className = '',
  size = 'md',
}) => {
  const [isHovering, setIsHovering] = useState(false);
  
  // Size classes
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };
  
  // File upload hook
  const fileUpload = useFileUpload({
    url: '/api/users/profile/picture',
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    onSuccess: (response) => {
      if (onUploadSuccess && response.user?.profilePicture) {
        onUploadSuccess(response.user.profilePicture);
      }
    },
  });
  
  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      fileUpload.uploadFile(acceptedFiles[0]);
    }
  }, [fileUpload]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/jpg': [],
      'image/webp': [],
    },
    maxFiles: 1,
    multiple: false,
  });
  
  // Determine which image to show
  const imageToShow = fileUpload.filePreview || currentImageUrl || '/images/default-avatar.png';
  
  return (
    <div className={`relative ${className}`}>
      <div
        {...getRootProps()}
        className={`
          relative 
          ${sizeClasses[size]} 
          rounded-full 
          overflow-hidden 
          cursor-pointer 
          border-2 
          ${isDragActive ? 'border-primary-500' : 'border-gray-200 dark:border-gray-700'}
          transition-all 
          duration-200
          ${fileUpload.isUploading ? 'opacity-70' : ''}
        `}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <input {...getInputProps()} />
        
        {/* Profile Image */}
        <img
          src={imageToShow}
          alt="Profile"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default avatar if image fails to load
            (e.target as HTMLImageElement).src = '/images/default-avatar.png';
          }}
        />
        
        {/* Hover Overlay */}
        {(isHovering || isDragActive) && !fileUpload.isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <FaCamera className="mx-auto text-2xl" />
              <span className="text-xs mt-1 block">
                {isDragActive ? 'Drop image here' : 'Change photo'}
              </span>
            </div>
          </div>
        )}
        
        {/* Upload Progress Overlay */}
        {fileUpload.isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
            <FaSpinner className="animate-spin text-white text-xl mb-2" />
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${fileUpload.progress}%` }}
              />
            </div>
            <span className="text-white text-xs mt-1">{fileUpload.progress}%</span>
          </div>
        )}
      </div>
      
      {/* Status Indicators */}
      {fileUpload.success && (
        <div className="absolute -bottom-1 -right-1 bg-success-500 text-white p-1 rounded-full">
          <FaCheck />
        </div>
      )}
      
      {fileUpload.error && (
        <div className="mt-2">
          <div className="flex items-center text-error-500 text-sm">
            <FaExclamationTriangle className="mr-1" />
            <span className="truncate">{fileUpload.error}</span>
          </div>
          <button 
            onClick={() => fileUpload.retryUpload()}
            className="text-primary-500 text-xs hover:underline mt-1"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Cancel Upload Button */}
      {fileUpload.isUploading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileUpload.cancelUpload();
          }}
          className="absolute -top-1 -right-1 bg-error-500 text-white p-1 rounded-full hover:bg-error-600 transition-colors"
          title="Cancel upload"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default ProfilePicture;