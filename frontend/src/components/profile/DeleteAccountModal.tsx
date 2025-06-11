import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import Button from '../common/Button';
import Input from '../common/Input';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { logout } from '../../store/slices/authSlice';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      await api.delete('/api/users/account');
      
      toast.success('Your account has been deleted');
      dispatch(logout());
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete account');
      setIsDeleting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          aria-hidden="true"
        ></div>
        
        {/* Modal panel */}
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                <FaExclamationTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                </div>
                
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                        Warning
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>All your bookings and transaction history will be deleted</li>
                          <li>Your profile information will be permanently removed</li>
                          <li>You will lose access to any purchased tickets</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    To confirm, type "DELETE" in the field below:
                  </p>
                  <div className="mt-2">
                    <Input
                      id="confirmDelete"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="border-red-300 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="button"
              variant="danger"
              leftIcon={<FaTrash />}
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isDeleting || confirmText !== 'DELETE'}
              className="sm:ml-3"
            >
              Delete Account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="mt-3 sm:mt-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
