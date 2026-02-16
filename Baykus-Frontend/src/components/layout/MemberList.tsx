import { useEffect, useState, useMemo } from 'react';
import { useMembers } from '../../hooks/useMembers';
import { ShieldAlert, UserMinus, ShieldCheck } from 'lucide-react';
import KickUserModal from '../modals/KickUserModal';

export default function MemberList({ serverId }: { serverId: string }) {
    const { members, loading, fetchMembers, kickUser } = useMembers(serverId);
    
    const [kickModal, setKickModal] = useState<{ 
        open: boolean, id: string, name: string, error?: string 
    }>({ open: false, id: '', name: '', error: undefined });

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers, serverId]);

    // Üyeleri Online ve Offline olarak kategorize et (useMemo ile performans optimize)
    const { online, offline } = useMemo(() => {
        return {
            online: members.filter(m => m.status === 'online'),
            offline: members.filter(m => m.status !== 'online')
        };
    }, [members]);

    const handleConfirmKick = async () => {
        const res = await kickUser(kickModal.id);
        if (!res.success) {
            setKickModal(prev => ({ ...prev, error: res.error }));
        } else {
            setKickModal({ open: false, id: '', name: '', error: undefined });
            fetchMembers();
        }
    };

    if (loading && members.length === 0) {
        return (
            <div className="flex-1 px-3 py-6 space-y-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-xl bg-white/5" />
                        <div className="h-4 w-24 bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent select-none">
            {/* Kaydırılabilir Alan */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/5">
                
                {/* ÇEVRİMİÇİ GRUBU */}
                {online.length > 0 && (
                    <section>
                        <h3 className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-success/60 italic">
                            Çevrimiçi — {online.length}
                        </h3>
                        <div className="space-y-0.5">
                            {online.map(member => (
                                <MemberRow key={member.user_id} member={member} setKickModal={setKickModal} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ÇEVRİMDIŞI GRUBU */}
                {offline.length > 0 && (
                    <section>
                        <h3 className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40 italic">
                            Çevrimdışı — {offline.length}
                        </h3>
                        <div className="space-y-0.5">
                            {offline.map(member => (
                                <MemberRow key={member.user_id} member={member} setKickModal={setKickModal} isOffline />
                            ))}
                        </div>
                    </section>
                )}

                {!loading && members.length === 0 && (
                    <div className="text-center py-10 opacity-20 italic text-xs uppercase font-bold">
                        Sunucu ıssız görünüyor...
                    </div>
                )}
            </div>

            <KickUserModal 
                isOpen={kickModal.open}
                onClose={() => setKickModal({ open: false, id: '', name: '', error: undefined })}
                onConfirm={handleConfirmKick}
                username={kickModal.name}
                errorMsg={kickModal.error}
            />
        </div>
    );
}

// Alt Bileşen: Her bir üye satırı
function MemberRow({ member, setKickModal, isOffline }: any) {
    return (
        <div className={`flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-all duration-200 ${isOffline ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                    <img 
                        src={member.avatar_url || '/default-avatar.png'} 
                        className="w-9 h-9 rounded-xl object-cover border-2 border-white/5" 
                        alt="" 
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#020617] ${
                        member.status === 'online' ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-text-muted'
                    }`} />
                </div>
                
                <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-[13px] font-bold truncate italic" style={{ color: member.role_color || 'inherit' }}>
                        {member.username}
                    </span>
                    {member.role_name && (
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-tighter flex items-center gap-1 italic">
                            {member.role_name === 'Admin' ? <ShieldAlert size={10} strokeWidth={3} className="text-error" /> : <ShieldCheck size={10} strokeWidth={3} className="text-accent" />}
                            {member.role_name}
                        </span>
                    )}
                </div>
            </div>

            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setKickModal({ open: true, id: member.user_id, name: member.username, error: undefined }); 
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-all active:scale-90"
            >
                <UserMinus size={14} strokeWidth={3} />
            </button>
        </div>
    );
}