import { useState, useCallback } from 'react';
import { MessageService } from '../api/messages';

export function useServerMessages() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchServerMessages = useCallback(async (channelId: string) => {
        if (!channelId) return;
        setLoading(true);
        try {
            const res = await MessageService.getChannelMessages(channelId);
            const rawData = res.messages || res.data || [];
            
            const normalized = (Array.isArray(rawData) ? rawData : [])
                .map((m: any) => ({
                    ...m,
                    created_at: Number(m.created_at),
                    author: m.author || { username: "Baykuş", avatar_url: "" }
                }))
                .sort((a, b) => a.created_at - b.created_at);
                
            setMessages(normalized);
        } catch (err) {
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // ⚡ Socket Dinleyici
    const handleServerSocket = useCallback((event: { type: string, payload: any }) => {
        const { type, payload } = event;
        if (type !== "NEW_MESSAGE") return;

        setMessages(prev => {
            if (prev.some(m => String(m.id) === String(payload.id))) return prev;
            return [...prev, { 
                ...payload, 
                created_at: Number(payload.created_at || Date.now()) 
            }].sort((a, b) => a.created_at - b.created_at);
        });
    }, []);

    // 📤 Mesaj Gönderme (Hatanın Kaynağı Burasıydı)
    const sendServerMessage = async (channelId: string, content: string) => {
        try {
            const res = await MessageService.sendMessage(channelId, content);
            // Kendi mesajını anında görmek istersen handleServerSocket'i burada da tetikleyebilirsin
            return { success: true };
        } catch { 
            return { success: false }; 
        }
    };

    // 🚩 MÜHÜR: sendServerMessage'ı buraya ekledik
    return { 
        messages, 
        loading, 
        fetchServerMessages, 
        handleServerSocket, 
        sendServerMessage // Artık ChannelChatView bu fonksiyonu görebilecek
    };
}