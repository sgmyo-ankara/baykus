import { api } from './axios';
import type { CreateChannelRequest, UpdateChannelRequest } from '../types';

export const ChannelService = {
  // 1. Kanalları Getir (query-endpoint.ts'den beslenir)
  async getServerChannels(serverId: string) {
    const res = await api.get(`/api/servers/${serverId}/channels`);
    return res.data; // Backend { data: results } dönüyor
  },

  // 2. Kanal Oluştur (POST /api/servers/:serverId/channels)
  async createChannel(serverId: string, data: CreateChannelRequest) {
    const res = await api.post(`/api/servers/${serverId}/channels`, data);
    return res.data;
  },

  // 3. Kanal Güncelle (PUT /api/channels/:channelId)
  async updateChannel(channelId: string, data: UpdateChannelRequest) {
    const res = await api.put(`/api/channels/${channelId}`, data);
    return res.data;
  },

  // 4. Kanal Sil (DELETE /api/channels/:channelId)
  async deleteChannel(channelId: string) {
    const res = await api.delete(`/api/channels/${channelId}`);
    return res.data;
  }
};