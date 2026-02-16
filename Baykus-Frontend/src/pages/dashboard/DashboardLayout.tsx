import { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import UserPanel from '../../components/layout/UserPanel';
import DMSidebar from '../../pages/dashboard/DMSidebar';
import ChannelSidebar from '../../pages/dashboard/ChannelSidebar';
import MainHeader from '../../components/layout/MainHeader';
import FriendsListView from '../../components/friends/FriendsListView';
import PendingView from '../../components/friends/PendingView';
import MemberList from '../../components/layout/MemberList';
import InviteModal from '../../components/modals/InviteModal';
import { useServers } from '../../hooks/useServers';
import { useChannels } from '../../hooks/useChannels';
import { usePresence } from '../../hooks/usePresence'; 
import { FriendService } from '../../api/friends';

export default function DashboardLayout() {
    const location = useLocation();
    const { serverId, channelId } = useParams();
    const { servers } = useServers();
    const { channels, fetchChannels } = useChannels();
    
    // --- DURUM TESPİTLERİ ---
    const isDMRoute = location.pathname.includes('/@me');
    const isInsideChat = !!channelId; // Bir kanalın içindeyiz
    const isActuallyHome = !isInsideChat && (isDMRoute || location.pathname === '/');
    const isServerHome = !!serverId && !channelId && serverId !== '@me'; // Sunucu seçili ama kanal yok

    const [dmView, setDmView] = useState<'all' | 'pending' | 'add' | 'online'>('all');
    const [showMembers, setShowMembers] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);

    // Veri Yükleme (Sunucu Kanalları)
    useEffect(() => {
        if (serverId && serverId !== '@me') fetchChannels(serverId);
    }, [serverId, fetchChannels]);

    // Arkadaş Listesi (Presence için)
    useEffect(() => {
        if (isActuallyHome) {
            FriendService.getFriends('all').then(res => setFriends(res.data || []));
        }
    }, [isActuallyHome]);

    // --- CANLI DURUM (PRESENCE) ---
    const friendIds = useMemo(() => friends.map(f => f.friend_id), [friends]);
    const onlineMap = usePresence(friendIds);
    const onlineCount = useMemo(() => Object.values(onlineMap).filter(v => v === true).length, [onlineMap]);

    // Header Başlık Mantığı
    const getHeaderTitle = () => {
        if (isInsideChat) {
            const channel = channels.find((c: any) => c.id === channelId);
            return channel ? channel.name.toUpperCase() : "SOHBET AKIŞI";
        }
        if (isServerHome) {
            const server = servers.find((s: any) => s.id === serverId);
            return server ? server.name.toUpperCase() : "SUNUCU";
        }
        return "ARKADAŞLAR";
    };

    return (
        <div className="h-screen w-full bg-bg-main p-3 flex gap-3 overflow-hidden font-sans text-text-main">
            {/* 1. SÜTUN: SIDEBAR */}
            <aside className="h-full w-[82px] flex-shrink-0 flex flex-col items-center bg-bg-panel/40 backdrop-blur-xl rounded-[28px] border-2 border-white/5 shadow-2xl relative z-[50]">
                <Sidebar activeId={serverId || 'home'} setActiveId={() => {}} />
            </aside>

            {/* 2. SÜTUN: SOL PANEL (DM/KANAL) */}
            <aside className="h-full w-64 flex-shrink-0 flex flex-col bg-bg-panel/40 backdrop-blur-xl rounded-[28px] border-2 border-white/5 shadow-2xl overflow-hidden relative z-[40]">
                <div className="flex-1 overflow-hidden">
                    {(isDMRoute || !serverId) ? <DMSidebar /> : <ChannelSidebar serverId={serverId} />}
                </div>
                <div className="p-3 border-t border-white/5"><UserPanel /></div>
            </aside>

            {/* 3. SÜTUN: ANA PANEL */}
            <main className="h-full flex-1 bg-bg-panel/40 backdrop-blur-sm rounded-[32px] border-2 border-white/5 shadow-2xl relative overflow-hidden z-[10] flex flex-col">
                <MainHeader 
                    channelName={getHeaderTitle()}
                    dmView={dmView} 
                    setDmView={setDmView} 
                    showMembers={showMembers} 
                    setShowMembers={setShowMembers}
                    isAtChannel={isInsideChat} 
                    isHome={isActuallyHome}
                    isServerHome={isServerHome}
                    onInviteClick={() => setShowInviteModal(true)}
                    onlineCount={onlineCount}
                />
                
                <div className="flex-1 relative overflow-hidden h-full">
                    {isInsideChat ? (
                        <div className="h-full w-full animate-in fade-in duration-300"><Outlet /></div>
                    ) : isActuallyHome ? (
                        <div className="flex flex-col h-full overflow-y-auto animate-in fade-in">
                            {dmView === 'online' && <FriendsListView type="all" filter={(f: any) => onlineMap[f.friend_id] === true} />}
                            {(dmView === 'all' || dmView === 'add') && <FriendsListView type="all" />}
                            {dmView === 'pending' && <PendingView />}
                        </div>
                    ) : (
                        <div className="m-auto flex flex-col items-center opacity-30 h-full justify-center">
                            <span className="text-6xl animate-bounce-slow mb-6">🦉</span>
                            <h2 className="text-2xl font-black italic">BİR KANAL SEÇ</h2>
                        </div>
                    )}
                </div>
            </main>

            {/* 4. SÜTUN: ÜYE LİSTESİ */}
            {isInsideChat && !isDMRoute && showMembers && (
                <aside className="h-full w-64 flex-shrink-0 bg-bg-panel/40 backdrop-blur-xl rounded-[28px] border-2 border-white/5 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                    <MemberList serverId={serverId!} />
                </aside>
            )}

            {showInviteModal && <InviteModal serverId={serverId!} onClose={() => setShowInviteModal(false)} />}
        </div>
    );
}