import { api } from './axios';
import type { DMChannel } from '../types';

export const DMService = {
  // Kullanıcının tüm DM kutularını getirir
  async getMyDMs(): Promise<DMChannel[]> {
    const res = await api.get('/api/users/me/dms');
    return res.data;
  },

  // 🔥 BACKEND UYUMLU: Yeni bir DM başlatır (veya var olanı getirir)
  // Backend'deki Senaryo 2 (target_user_id) tetiklenir.
  async startDM(targetUserId: string): Promise<{ channel: DMChannel, message: string }> {
    const res = await api.post('/api/dm', { target_user_id: targetUserId });
    return res.data; // Backend { message, channel } objesi dönüyor.
  },

  // Grup Sohbeti Başlatma (Gelecek hazırlığı - Senaryo 1)
  async createGroup(name: string, userIds: string[]): Promise<{ channel: DMChannel }> {
    const res = await api.post('/api/dm', { group_name: name, user_ids: userIds, type: 2 });
    return res.data;
  }
};