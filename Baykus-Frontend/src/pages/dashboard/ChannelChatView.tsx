import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useServerMessages } from '../../hooks/useServerMessages'; // 🚩 Sunucuya özel hook
import { useChatSocket } from '../../hooks/useChatSocket';
import { PlusCircle, Smile, Hash, Edit3, Trash2 } from 'lucide-react';

export default function ChannelChatView() {
    const { channelId } = useParams<{ channelId: string }>();
    const { messages, fetchServerMessages, handleServerSocket, sendServerMessage, deleteServerMessage } = useServerMessages();
    const [text, setText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const stableSocketHandler = useCallback((data: any) => {
        handleServerSocket(data); 
    }, [handleServerSocket]);

    const { isTyping, sendTypingStatus } = useChatSocket(channelId, stableSocketHandler);

    useEffect(() => {
        if (channelId) fetchServerMessages(channelId);
    }, [channelId, fetchServerMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !channelId) return;
        const content = text.trim();
        setText("");
        sendTypingStatus(false);
        await sendServerMessage(channelId, content);
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden relative select-none">
            <div className="flex-1 overflow-y-auto px-6 scrollbar-hide hover:scrollbar-default">
                <div className="flex flex-col justify-end min-h-full pb-8">
                    <div className="px-6 py-20 text-center opacity-20 italic">
                        <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Hash size={28} className="text-accent" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-text-main italic">Kanalın Başlangıcı</h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-1 italic">Bu kanalın ilk mermisi burada sıkıldı</p>
                    </div>

                    {messages.map((msg, index) => {
                        const prevMsg = messages[index - 1];
                        const isCompact = prevMsg && String(msg.author?.id) === String(prevMsg.author?.id) && (Math.abs(Number(msg.created_at) - Number(prevMsg.created_at)) < 300000);

                        return (
                            <div key={msg.id} className={`group flex items-start gap-4 ${isCompact ? 'mt-0.5' : 'mt-6 py-1'}`}>
                                <div className="w-11 shrink-0 flex justify-center">
                                    {!isCompact ? (
                                        <img src={msg.author?.avatar_url || "/default-avatar.png"} className="w-11 h-11 rounded-2xl object-cover border border-white/5 shadow-lg" />
                                    ) : (
                                        <span className="text-[8px] opacity-0 group-hover:opacity-40 font-black mt-1">{new Date(Number(msg.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {!isCompact && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-text-main text-[14px] uppercase italic tracking-tight">{msg.author?.username}</span>
                                            <span className="text-[9px] text-text-muted opacity-30">{new Date(Number(msg.created_at)).toLocaleTimeString()}</span>
                                        </div>
                                    )}
                                    <p className={`text-[14.5px] leading-relaxed font-medium ${msg.is_deleted ? 'text-text-muted/20 italic line-through' : 'text-text-main/90'}`}>
                                        {msg.is_deleted ? "mesaj silindi." : msg.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="px-10 h-6 flex items-center">
                {Object.values(isTyping).length > 0 && (
                    <div className="text-[10px] font-black italic text-accent animate-pulse flex items-center gap-2">
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" />
                        {Object.values(isTyping).join(", ")} yazıyor...
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 pt-2">
                <form onSubmit={handleSend} className="group bg-black/20 border-2 border-white/5 focus-within:border-accent/30 rounded-[22px] flex items-center px-4 py-3 gap-4 shadow-2xl transition-all">
                    <button type="button" className="text-text-muted hover:text-accent active:scale-90 transition-transform"><PlusCircle size={24} strokeWidth={3} /></button>
                    <input value={text} onChange={(e) => { setText(e.target.value); sendTypingStatus(e.target.value.length > 0); }} placeholder="#kanala bir şeyler karala..." className="flex-1 bg-transparent outline-none text-[14px] font-bold text-text-main placeholder:italic placeholder:opacity-20" />
                    <button type="button" className="text-text-muted hover:text-warning active:scale-90 transition-transform"><Smile size={24} strokeWidth={3} /></button>
                </form>
            </div>
        </div>
    );
}