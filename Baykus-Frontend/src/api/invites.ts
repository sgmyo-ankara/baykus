import { api } from './axios';

export const InviteService = {
    // Davet kodu oluşturur
    async createInvite(serverId: string, expiresIn?: number, maxUses?: number) {
        // Backend: path === "/api/invites" && method === "POST"
        const res = await api.post('/api/invites', {
            server_id: serverId,
            expires_in: expiresIn,
            max_uses: maxUses
        });
        return res.data;
    },

    // Davet koduyla sunucuya katılır (BACKEND'E UYGUN HALİ)
    async joinByCode(inviteCode: string) {
        // Backend Regex: /^\/api\/invites\/([a-zA-Z0-9]+)\/join$/
        // Yani URL: /api/invites/KOD/join olmalı.
        const res = await api.post(`/api/invites/${inviteCode}/join`);
        return res.data;
    }
};