import { api } from './axios';
import type { FriendRequestPayload, FriendRespondPayload } from '../types';

export const FriendService = {
  async sendRequest(data: FriendRequestPayload) {
    const res = await api.post('/api/friends/request', data);
    return res.data;
  },

  async respondRequest(data: FriendRespondPayload) {
    // Backend'deki PUT metoduna uygun hale getirdik
    const res = await api.put('/api/friends/respond', data);
    return res.data;
  },

  async getFriends(type: 'all' | 'pending' | 'blocked' = 'all') {
    const res = await api.get(`/api/friends?type=${type}`);
    return res.data;
  },

  // Bildirimleri (Kırmızı noktaları) temizlemek için
  async markAsSeen() {
    const res = await api.put('/api/friends/seen');
    return res.data;
  }
};