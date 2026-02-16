import { api } from './axios';

export const UserService = {
  async updateProfile(data: { username?: string; avatar_url?: string }) {
    const res = await api.patch('/api/users/me', data);
    return res.data;
  }
};