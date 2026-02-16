import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { auth } from '../lib/firebase';

// Gelen aksiyonlar için tip tanımı
interface SocketAction {
    type: string;
    payload: any;
}

type TypingMap = { [userId: string]: string };

export function useChatSocket(
    channelId: string | undefined,
    onAction: (event: SocketAction) => void
) {
    // 1. UID HATASI ÇÖZÜMÜ: Store'dan gelen user'ı 'any' cast ederek veya tip güvenli kontrol ederek uid'ye erişiyoruz
    const { user: storeUser } = useAuthStore();
    const socketRef = useRef<WebSocket | null>(null);
    const onActionRef = useRef(onAction);
    const [isTyping, setIsTyping] = useState<TypingMap>({});

    // 2. NodeJS HATASI ÇÖZÜMÜ: Tarayıcı ortamında setTimeout tipi 'number' veya 'any' olarak tutulmalıdır
    const reconnectTimeoutRef = useRef<any>(null);

    useEffect(() => {
        onActionRef.current = onAction;
    }, [onAction]);

    const connect = useCallback(async (isAlive: { current: boolean }) => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

        // Mevcut bağlantı varsa veya bağlanıyorsa dur
        if (socketRef.current?.readyState === WebSocket.OPEN ||
            socketRef.current?.readyState === WebSocket.CONNECTING) return;

        // UID'yi hem store'dan hem doğrudan Firebase'den güvenli şekilde alıyoruz
        const currentUser = auth.currentUser;
        const uid = (storeUser as any)?.uid || currentUser?.uid;

        if (!channelId || !uid) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token || !isAlive.current) return;

            console.log(`%c[WS] 🔌 Connecting: ${channelId}`, "color: #4F8CFF; font-weight: bold;");

            const ws = new WebSocket(
                `wss://api.baykus.live/api/ws?token=${token}&channelId=${channelId}`
            );

            ws.onopen = () => {
                if (isAlive.current) console.log(`%c[WS] ✅ BAĞLANDI: ${channelId}`, "color: #22C55E; font-weight: bold;");
            };

            ws.onmessage = (event) => {
                try {
                    const rawData = JSON.parse(event.data);
                    const payload = rawData.data || rawData.payload || rawData;

                    // 🚩 TYPING RADARI
                    if (rawData.type === "TYPING_UPDATE") {
                        const { user_id, username, is_typing } = payload;

                        // Kendi yazıyor bilgimizi listede görmeyelim
                        if (String(user_id) === String(uid)) return;

                        setIsTyping(prev => {
                            const next = { ...prev };
                            if (is_typing) {
                                next[user_id] = username; // Listeye ekle
                            } else {
                                delete next[user_id]; // Listeden sil
                            }
                            return next;
                        });
                        return; // Mesaj işleyiciye (onAction) gitmesine gerek yok
                    }

                    // Diğer mesaj aksiyonları (New, Edit, Delete)
                    onActionRef.current({ type: rawData.type, payload });

                } catch (err) { console.error("WS Parse Error:", err); }
            };

            ws.onclose = (e) => {
                socketRef.current = null;
                // 1000 kodu normal kapatmadır, onun dışındakilerde reconnect dene
                if (isAlive.current && e.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => connect(isAlive), 3000);
                }
            };

            ws.onerror = () => {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.close();
                }
            };

            socketRef.current = ws;

        } catch (err) {
            if (isAlive.current) reconnectTimeoutRef.current = setTimeout(() => connect(isAlive), 5000);
        }
        // storeUser referansını ekledik ki store dolduğu an soket tetiklensin
    }, [channelId, storeUser]);

    useEffect(() => {
        const isAlive = { current: true };
        connect(isAlive);

        return () => {
            isAlive.current = false;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (socketRef.current) {
                socketRef.current.close(1000); // 1000 koduyla kapatmak reconnect'i tetiklemez
                socketRef.current = null;
            }
        };
    }, [connect]);

    const sendTypingStatus = (typing: boolean) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: typing ? "TYPING_START" : "TYPING_STOP"
            }));
        }
    };

    return { isTyping, sendTypingStatus };
}