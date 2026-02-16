import { useState, useCallback } from 'react';
import { MessageService } from '../api/messages';
import { api } from '../api/axios'; // Axios instance'ın

export function useMessages() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 🚩 isDM parametresi eklendi
    const fetchMessages = useCallback(async (channelId: string, isDM: boolean = false) => {
        if (!channelId) return;
        setLoading(true);
        try {
            // 🚩 MÜHÜR: Eğer DM ise /api/dm'e git, değilse eski MessageService'i kullan
            const res = isDM 
                ? await api.get(`/api/dm/${channelId}/messages`)
                : await MessageService.getChannelMessages(channelId);

            // Veriyi normalize et (Backend farklı key'ler dönebilir)
            const rawData = res.messages || res.data?.messages || res.data || [];
            
            const normalized = (Array.isArray(rawData) ? rawData : [])
                .map((m: any) => ({ 
                    ...m, 
                    created_at: Number(m.created_at),
                    // DM'de 'sender', Sunucu'da 'author' gelebilir. İkisini de mühürle.
                    author: m.author || m.sender || { username: "Baykuş", avatar_url: "" }
                }))
                .sort((a: any, b: any) => a.created_at - b.created_at);
            
            setMessages(normalized);
        } catch (err) { 
            console.error("Fetch Error:", err);
            setMessages([]); 
        } finally { setLoading(false); }
    }, []);

    const handleSocketAction = useCallback((event: { type: string, payload: any }) => {
        const { type, payload } = event;

        setMessages((prev) => {
            // Backend bazen payload bazen data içinde gönderir, ID'yi bulalım
            const msgId = payload.id || payload.message_id;

            switch (type) {
                case "NEW_MESSAGE":
                case "NEW_DM_MESSAGE": // 🚩 DM sinyalini de kabul et
                    if (prev.some((m) => String(m.id) === String(msgId))) return prev;
                    return [...prev, { 
                        ...payload, 
                        created_at: Number(payload.created_at || Date.now()),
                        author: payload.author || payload.sender || { username: "Yükleniyor..." }
                    }].sort((a, b) => a.created_at - b.created_at);

                case "MESSAGE_UPDATE":
                case "DM_MESSAGE_UPDATE":
                    return prev.map((m) => String(m.id) === String(msgId) 
                        ? { ...m, content: payload.content, is_edited: true } : m);

                case "MESSAGE_DELETE":
                case "DM_MESSAGE_DELETE":
                    return prev.map((m) => String(m.id) === String(msgId) 
                        ? { ...m, content: "Bu mesaj silindi.", is_deleted: true } : m);

                default: return prev;
            }
        });
    }, []);

    const sendNewMessage = async (channelId: string, content: string, isDM: boolean = false) => {
        try {
            // 🚩 Mesaj gönderirken de endpoint'i isDM'e göre seçiyoruz
            const res = isDM 
                ? await api.post(`/api/dm/${channelId}/messages`, { content })
                : await MessageService.sendMessage(channelId, content);
            
            const payload = res.data?.data || res.payload || res.data;
            if (payload) {
                handleSocketAction({ 
                    type: isDM ? "NEW_DM_MESSAGE" : "NEW_MESSAGE", 
                    payload 
                });
            }
            return { success: true };
        } catch { return { success: false }; }
    };

    return { 
        messages, 
        loading, 
        fetchMessages, 
        handleSocketAction, 
        sendNewMessage 
    };
}