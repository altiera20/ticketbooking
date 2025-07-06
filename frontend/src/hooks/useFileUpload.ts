import { useState, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';

interface FileUploadOptions {
  url: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  filePreview: string | null;
}

interface FileUploadReturn extends FileUploadState {
  uploadFile: (file: File) => Promise<void>;
  resetState: () => void;
  validateFile: (file: File) => string | null;
  createPreview: (file: File) => void;
  cancelUpload: () => void;
  retryUpload: () => Promise<void>;
}

const useFileUpload = (options: FileUploadOptions): FileUploadReturn => {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    filePreview: null,
  });
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [cancelTokenSource, setCancelTokenSource] = useState<AbortController | null>(null);
  
  // Reset state
  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false,
      filePreview: null,
    });
    
    setCurrentFile(null);
    
    // Revoke object URL to avoid memory leaks
    if (state.filePreview) {
      URL.revokeObjectURL(state.filePreview);
    }
  }, [state.filePreview]);
  
  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const maxSize = (options.maxSizeMB || 5) * 1024 * 1024; // Default 5MB
    if (file.size > maxSize) {
      return `File size exceeds ${options.maxSizeMB || 5}MB limit`;
    }
    
    // Check file type
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      if (!options.allowedTypes.includes(file.type)) {
        return `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`;
      }
    }
    
    return null;
  }, [options.maxSizeMB, options.allowedTypes]);
  
  // Create file preview
  const createPreview = useCallback((file: File) => {
    // Only create preview for image files
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, filePreview: objectUrl }));
    }
  }, []);
  
  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    // Validate file first
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }
    
    // Store current file for retry functionality
    setCurrentFile(file);
    
    // Create preview
    createPreview(file);
    
    // Start upload
    setState(prev => ({ ...prev, isUploading: true, progress: 0, error: null, success: false }));
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Create cancel token
    const controller = new AbortController();
    setCancelTokenSource(controller);
    
    try {
      console.log(`Uploading file to ${options.url}`, { 
        fileSize: file.size, 
        fileType: file.type,
        fileName: file.name
      });
      
      const response = await api.post(options.url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setState(prev => ({ ...prev, progress: percentCompleted }));
          console.log(`Upload progress: ${percentCompleted}%`);
        },
        signal: controller.signal,
      });
      
      console.log('Upload successful, server response:', response.data);
      
      setState(prev => ({ ...prev, isUploading: false, success: true }));
      
      if (options.onSuccess) {
        options.onSuccess(response.data);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      if (axios.isCancel(error)) {
        setState(prev => ({ ...prev, isUploading: false, error: 'Upload cancelled' }));
      } else {
        let errorMessage = 'Failed to upload file';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server error response:', error.response.data);
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received:', error.request);
          errorMessage = 'No response from server';
        } else {
          // Something happened in setting up the request
          console.error('Request setup error:', error.message);
          errorMessage = error.message || 'Unknown error occurred';
        }
        
        setState(prev => ({ ...prev, isUploading: false, error: errorMessage }));
        
        if (options.onError) {
          options.onError(error);
        }
      }
    }
  }, [options, validateFile, createPreview]);
  
  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (cancelTokenSource) {
      cancelTokenSource.abort();
      setCancelTokenSource(null);
    }
  }, [cancelTokenSource]);
  
  // Retry upload
  const retryUpload = useCallback(async () => {
    if (currentFile) {
      await uploadFile(currentFile);
    }
  }, [currentFile, uploadFile]);
  
  return {
    ...state,
    uploadFile,
    resetState,
    validateFile,
    createPreview,
    cancelUpload,
    retryUpload,
  };
};

export default useFileUpload;
