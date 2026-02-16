import { api } from './axios';
import type { Server, CreateServerRequest } from '../types';

export const ServerService = {
  async getMyServers(): Promise<Server[]> {
    const response = await api.get('/api/users/me/servers');
    return response.data;
  },

  async createServer(data: CreateServerRequest): Promise<any> {
    const response = await api.post('/api/servers', data);
    return response.data;
  },

  // BACKEND REGEX: path.match(/^\/api\/servers\/([a-zA-Z0-9]+)$/)
  // Bu yol sonuna /settings almaz!
  updateSettings: (serverId: string, data: { name?: string; icon_url?: string }) => 
    api.patch(`/api/servers/${serverId}`, data),

  deleteServer: (serverId: string) => 
    api.delete(`/api/servers/${serverId}`),

  // BACKEND REGEX: path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/leave$/)
  leaveServer: (serverId: string) => 
    api.post(`/api/servers/${serverId}/leave`),

  // BACKEND REGEX: path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/bans$/)
  getBans: (serverId: string) => 
    api.get(`/api/servers/${serverId}/bans`),

  // BACKEND REGEX: path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/bans\/([a-zA-Z0-9\-]+)$/)
  unbanMember: (serverId: string, userId: string) => 
    api.delete(`/api/servers/${serverId}/bans/${userId}`),

  // ⚠️ DİKKAT: Backend index.ts'de GET /api/servers/:id/roles yolu tanımlanmamış.
  // Handler (getRoles) var ama router'da GET isteğine bağlanmamış.
  // Bu yüzden roller ŞİMDİLİK 404 vermeye devam eder.
  getRoles: (serverId: string) => 
    api.get(`/api/servers/${serverId}/roles`), 
};