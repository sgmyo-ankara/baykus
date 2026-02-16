import { api } from './axios';
import type { User } from '../types';

export const syncUserWithBackend = async (userData: { 
  username: string; 
  email: string; 
  picture: string 
}): Promise<User> => {
  const response = await api.post('/api/auth/sync', userData);
  
  return response.data.user;
};