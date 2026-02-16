import { useState } from 'react';
import { InviteService } from '../api/invites';

export function useInvites() {
    const [loading, setLoading] = useState(false);

    const generateInvite = async (serverId: string) => {
        setLoading(true);
        try {
            const data = await InviteService.createInvite(serverId);
            return { success: true, code: data.invite_code };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.error || "Davet oluşturulamadı." };
        } finally {
            setLoading(false);
        }
    };

    const joinServer = async (code: string) => {
        setLoading(true);
        try {
            const data = await InviteService.joinByCode(code);
            return { success: true, serverId: data.server_id, channelId: data.channel_id };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.error || "Sunucuya katılamadınız." };
        } finally {
            setLoading(false);
        }
    };

    return { generateInvite, joinServer, loading };
}