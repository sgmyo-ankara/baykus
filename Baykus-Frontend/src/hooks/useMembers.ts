import { useState, useCallback } from 'react';
import { MemberService } from '../api/members';

export function useMembers(serverId: string) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!serverId || serverId === 'home') return;
        setLoading(true);
        try {
            const data = await MemberService.getServerMembers(serverId);
            const rawMembers = Array.isArray(data) ? data : [];

            // BACKEND ROL VE DURUM MANTIĞINA GÖRE SIRALAMA
            const sorted = [...rawMembers].sort((a, b) => {
                // 1. ÖNCE DURUM (Status)
                // Online olanlar her zaman en üstte görünür
                if (a.status === 'online' && b.status !== 'online') return -1;
                if (a.status !== 'online' && b.status === 'online') return 1;

                // 2. ROL POZİSYONU (Position)
                // Backend'deki "ORDER BY position DESC" mantığına göre:
                // Pozisyonu büyük olan (Örn: Admin 10, Member 1) daha üsttedir.
                const aPos = a.role_position || 0;
                const bPos = b.role_position || 0;
                if (aPos !== bPos) return bPos - aPos;

                // 3. ALFABETİK SIRALAMA
                // Eğer durum ve rol pozisyonu aynıysa isme göre A'dan Z'ye diz
                return a.username.localeCompare(b.username);
            });

            setMembers(sorted);
        } catch (err) {
            console.error("Üye listesi yüklenemedi:", err);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    const kickUser = async (targetUserId: string) => {
        try {
            await MemberService.kickMember(serverId, targetUserId);
            // Başarılıysa listeden anında çıkar (UI tepkiselliği için)
            setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
            return { success: true };
        } catch (err: any) {
            const msg = err.response?.data?.error || "Üye atılamadı.";
            return { success: false, error: msg };
        }
    };

    return { members, loading, fetchMembers, kickUser };
}