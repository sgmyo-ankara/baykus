import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDMMessages } from '../../hooks/useDMMessages';
import { useChatSocket } from '../../hooks/useChatSocket';
import { PlusCircle, Smile, Lock } from 'lucide-react';

export default function DirectMessageChatView() {
    const { channelId } = useParams<{ channelId: string }>();
    const { messages, fetchDMMessages, handleDMSocket, sendDM } = useDMMessages();
    const [text, setText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const stableSocketHandler = useCallback((data: any) => {
        handleDMSocket(data); 
    }, [handleDMSocket]);

    const { isTyping, sendTypingStatus } = useChatSocket(channelId, stableSocketHandler);

    useEffect(() => {
        if (channelId) fetchDMMessages(channelId);
    }, [channelId, fetchDMMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !channelId) return;
        const content = text.trim();
        setText("");
        sendTypingStatus(false);
        await sendDM(channelId, content);
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden relative animate-in fade-in duration-500">
            <div className="flex-1 overflow-y-auto px-6 scrollbar-hide hover:scrollbar-default">
                <div className="flex flex-col justify-end min-h-full pb-8">
                    
                    {/* BAŞLANGIÇ PLAKASI */}
                    <div className="px-6 py-20 text-center opacity-20 italic">
                        <div className="w-16 h-16 bg-accent/5 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-accent/20">
                            <Lock size={28} className="text-accent" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-text-main italic">Güvenli Hat</h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-1 italic">Mesajlar mühürlendi</p>
                    </div>

                    {messages.map((msg, index) => {
                        const prevMsg = messages[index - 1];
                        const author = msg.author;
                        const isCompact = prevMsg && String(author.id) === String(prevMsg.author?.id) && 
                                          (Math.abs(Number(msg.created_at) - Number(prevMsg.created_at)) < 300000);

                        return (
                            <div key={msg.id} className={`group flex items-start gap-4 ${isCompact ? 'mt-0.5' : 'mt-6 py-1 hover:bg-white/[0.01]'}`}>
                                <div className="w-11 shrink-0 flex justify-center">
                                    {!isCompact ? (
                                        <img 
                                            src={author.avatar_url || `https://ui-avatars.com/api/?name=${author.username}&background=random`} 
                                            className="w-11 h-11 rounded-2xl object-cover border border-white/5 shadow-lg bg-white/5" 
                                            alt=""
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${author.username}&background=0D1117&color=fff`; }}
                                        />
                                    ) : (
                                        <span className="text-[8px] opacity-0 group-hover:opacity-40 font-black mt-1">
                                            {new Date(Number(msg.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {!isCompact && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-text-main text-[14px] uppercase italic tracking-tight">{author.username}</span>
                                            <span className="text-[9px] text-text-muted opacity-30 font-bold">
                                                {new Date(Number(msg.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-[14.5px] leading-relaxed break-words font-medium tracking-tight text-text-main/90">
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* TYPING & INPUT ALANI */}
            <div className="px-10 h-6 flex items-center">
                {Object.values(isTyping).length > 0 && (
                    <div className="text-[10px] font-black italic text-accent animate-pulse flex items-center gap-2">
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" />
                        {Object.values(isTyping).join(", ")} yazıyor...
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 pt-2">
                <form onSubmit={handleSend} className="group bg-black/20 border-2 border-white/5 focus-within:border-accent/30 rounded-[22px] flex items-center px-4 py-3 gap-4 shadow-2xl transition-all duration-300">
                    <button type="button" className="text-text-muted hover:text-accent transition-transform"><PlusCircle size={24} strokeWidth={3} /></button>
                    <input 
                        value={text} 
                        onChange={(e) => { setText(e.target.value); sendTypingStatus(e.target.value.length > 0); }} 
                        placeholder="Özel mesaj gönder..." 
                        className="flex-1 bg-transparent outline-none text-[14px] font-bold text-text-main placeholder:italic placeholder:opacity-20" 
                    />
                    <button type="button" className="text-text-muted hover:text-warning transition-transform"><Smile size={24} strokeWidth={3} /></button>
                </form>
            </div>
        </div>
    );
}