import { useState, useCallback } from 'react';
import { api } from '../api/axios';

export function useDMMessages() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDMMessages = useCallback(async (dmChannelId: string) => {
        if (!dmChannelId) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/dm/${dmChannelId}/messages`);
            const rawData = res.data?.messages || res.data?.data || res.data || [];
            const dataArray = Array.isArray(rawData) ? rawData : [];

            const normalized = dataArray.map((m: any) => {
                // 🚩 VERİ GÜVENLİĞİ: author veya sender'dan hangisi varsa onu al
                const rawAuthor = m.author || m.sender || {};
                return {
                    ...m,
                    created_at: Number(m.created_at),
                    author: {
                        id: rawAuthor.id || rawAuthor.user_id || '0',
                        username: rawAuthor.username || "Bilinmeyen",
                        avatar_url: rawAuthor.avatar_url || ""
                    }
                };
            }).sort((a, b) => a.created_at - b.created_at);

            setMessages(normalized);
        } catch (err) {
            console.error("DM Mesaj Hatası:", err);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDMSocket = useCallback((event: { type: string, payload: any }) => {
        const { type, payload } = event;
        if (type !== "NEW_DM_MESSAGE" && type !== "NEW_MESSAGE") return;

        setMessages(prev => {
            // Mükerrer kontrolü
            if (prev.some(m => String(m.id) === String(payload.id))) return prev;

            const msgData = payload.data || payload;
            const rawAuthor = msgData.author || msgData.sender || {};

            // 🚩 AKILLI YAZAR BULUCU:
            // Eğer socket'ten gelen username boşsa ("Kullanıcı" fallback'ine düşmeden önce), 
            // listedeki eski mesajlardan bu sender_id'ye ait bir isim var mı bak.
            let recoveredUsername = rawAuthor.username || rawAuthor.name;
            let recoveredAvatar = rawAuthor.avatar_url;

            if (!recoveredUsername) {
                const existingAuthor = prev.find(m =>
                    String(m.author?.id) === String(msgData.sender_id || msgData.author_id)
                );
                if (existingAuthor) {
                    recoveredUsername = existingAuthor.author.username;
                    recoveredAvatar = existingAuthor.author.avatar_url;
                }
            }

            const newMsg = {
                ...msgData,
                created_at: Number(msgData.created_at || Date.now()),
                author: {
                    id: rawAuthor.id || rawAuthor.user_id || msgData.sender_id || '0',
                    username: recoveredUsername || "Yükleniyor...", // Hala yoksa "Yükleniyor..."
                    avatar_url: recoveredAvatar || ""
                }
            };

            return [...prev, newMsg].sort((a, b) => a.created_at - b.created_at);
        });
    }, []);

    const sendDM = async (dmChannelId: string, content: string) => {
        try {
            await api.post(`/api/dm/${dmChannelId}/messages`, { content });
            return { success: true };
        } catch { return { success: false }; }
    };

    return { messages, loading, fetchDMMessages, handleDMSocket, sendDM };
}