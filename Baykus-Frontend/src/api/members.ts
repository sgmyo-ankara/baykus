import { api } from './axios';

export const MemberService = {
    /**
     * Sunucudaki tüm üyeleri, rolleri ve durumlarıyla birlikte getirir.
     * Backend: getServerMembers handler'ını tetikler
     */
    async getServerMembers(serverId: string) {
        const res = await api.get(`/api/servers/${serverId}/members`);
        // Backend json(members.results) döndüğü için res.data direkt array'dir
        return res.data;
    },

    /**
     * Belirlenen üyeyi sunucudan atar (Kick).
     * Backend: kickMember handler'ını tetikler
     */
    async kickMember(serverId: string, targetUserId: string) {
        // Backend DELETE /api/servers/:serverId/members/:targetUserId bekliyor
        const res = await api.delete(`/api/servers/${serverId}/members/${targetUserId}`);
        return res.data;
    }
};