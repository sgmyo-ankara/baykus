import { useEffect, useState, useMemo } from 'react';
import { FriendService } from '../../api/friends';
import { usePresence } from '../../hooks/usePresence';
import { MessageSquare, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FriendsOnlineList() {
    const [friends, setFriends] = useState<any[]>([]);
    const navigate = useNavigate();

    // 1. İlk yüklemede arkadaş listesini SQL'den al
    useEffect(() => {
        const loadFriends = async () => {
            const res = await FriendService.getFriends('all');
            setFriends(res.data || []);
        };
        loadFriends();
    }, []);

    // 2. Presence takibi için ID listesini hazırla
    const friendIds = useMemo(() => friends.map(f => f.friend_id), [friends]);
    const onlineMap = usePresence(friendIds);

    // 3. Online olanları ve Offline olanları ayır/sirala
    const sortedFriends = useMemo(() => {
        return [...friends].sort((a, b) => {
            const aOnline = onlineMap[a.friend_id] ? 1 : 0;
            const bOnline = onlineMap[b.friend_id] ? 1 : 0;
            return bOnline - aOnline; // Online olanlar yukarı
        });
    }, [friends, onlineMap]);

    const onlineCount = Object.values(onlineMap).filter(v => v === true).length;

    return (
        <div className="p-4 select-none">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4 px-2">
                Çevrimiçi — {onlineCount}
            </h2>

            <div className="space-y-1">
                {sortedFriends.map((friend) => {
                    const isOnline = onlineMap[friend.friend_id];
                    
                    return (
                        <div 
                            key={friend.friend_id}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] group transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img 
                                        src={friend.avatar_url || '/default-avatar.png'} 
                                        className="w-10 h-10 rounded-2xl object-cover bg-white/5 border border-white/5"
                                    />
                                    {/* Canlı Durum İkonu */}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-4 border-[#0f172a] ${
                                        isOnline ? 'bg-success' : 'bg-text-muted opacity-50'
                                    }`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-main leading-tight">
                                        {friend.username}
                                    </span>
                                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-tighter">
                                        {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => navigate(`/channels/@me/${friend.friend_id}`)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-text-muted hover:text-accent transition-colors"
                                >
                                    <MessageSquare size={16} />
                                </button>
                                <button className="p-2 hover:bg-white/10 rounded-lg text-text-muted">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}