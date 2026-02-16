import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { auth } from '../lib/firebase';
import { api } from '../api/axios';

export function usePresence(friendIds: string[]) {
    const { user } = useAuthStore();
    const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
    const wsRef = useRef<WebSocket | null>(null);

    // 1. WebSocket Bağlantısı (Kendi Durumumuz)
    useEffect(() => {
        if (!user) return;

        const connectWS = async () => {
            const token = await auth.currentUser?.getIdToken();
            const wsUrl = `wss://api.baykus.live/api/presence?token=${token}&status=1`;
            
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => console.log("[Presence] Bağlantı sağlandı.");
            ws.onclose = () => setTimeout(connectWS, 5000); // Koptuğunda tekrar dene
        };

        connectWS();
        return () => wsRef.current?.close();
    }, [user]);

    // 2. Polling (Arkadaşların Durumu - SQL'e dokunmayan hızlı endpoint)
    const updateFriendsStatus = useCallback(async () => {
        if (friendIds.length === 0) return;
        try {
            // Backend'deki checkFriendStatus endpoint'ine POST atar
            const res = await api.post('/api/friends/status', { user_ids: friendIds });
            setOnlineMap(res.data.online_status);
        } catch (e) {
            console.error("[Presence] Polling hatası:", e);
        }
    }, [friendIds]);

    useEffect(() => {
        updateFriendsStatus(); // İlk yüklemede çek
        const interval = setInterval(updateFriendsStatus, 30000); // 30 saniyede bir güncelle
        return () => clearInterval(interval);
    }, [updateFriendsStatus]);

    return onlineMap;
}