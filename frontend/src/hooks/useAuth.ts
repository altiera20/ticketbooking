import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout, updateUserProfile } from '../store/slices/authSlice';
import { User } from '../types';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  const updateUser = (userData: Partial<User>) => {
    if (auth.user) {
      dispatch(updateUserProfile({
        ...auth.user,
        ...userData
      }));
    }
  };
  
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    logout: handleLogout,
    updateUser
  };
};

export default useAuth;
