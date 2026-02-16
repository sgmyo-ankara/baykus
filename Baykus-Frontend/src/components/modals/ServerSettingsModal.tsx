import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Shield, Trash2, Save, Plus, ChevronRight, Hash, Ban, LogOut, Loader2 } from 'lucide-react';
import { ServerService } from '../../api/servers';
import { useServers } from '../../hooks/useServers';
import { toast } from 'react-hot-toast';

export default function ServerSettingsModal({ isOpen, onClose, server, isOwner }: any) {
    // Global state'i güncellemek için useServers hook'unu çağırıyoruz
    const { updateServerInState, removeServerFromState } = useServers();
    
    const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'bans'>('general');
    const [serverName, setServerName] = useState("");
    const [roles, setRoles] = useState<any[]>([]);
    const [bans, setBans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && server) {
            setServerName(server.name || "");
            if (activeTab === 'roles') fetchRoles();
            if (activeTab === 'bans') fetchBans();
        }
    }, [isOpen, server, activeTab]);

    // 1. ROLLER (GET /api/servers/:id/roles)
    const fetchRoles = async () => {
        try {
            const res = await ServerService.getRoles(server.id);
            setRoles(res.data);
        } catch (err) { 
            setRoles([]);
            console.warn("Backend router'da roller yolu tanımlanmamış olabilir."); 
        }
    };

    // 2. YASAKLILAR (GET /api/servers/:id/bans)
    const fetchBans = async () => {
        try {
            const res = await ServerService.getBans(server.id);
            setBans(res.data);
        } catch (err: any) { 
            if(err.response?.status === 403) console.warn("Yasaklıları görme yetkiniz yok.");
        }
    };

    // 3. YASAĞI KALDIR (DELETE /api/servers/:id/bans/:userId)
    const handleUnban = async (targetUserId: string) => {
        try {
            await ServerService.unbanMember(server.id, targetUserId);
            toast.success("Yasak kaldırıldı.");
            fetchBans(); // Listeyi tazele
        } catch (err) { toast.error("İşlem başarısız."); }
    };

    // 4. AYARLARI GÜNCELLE (PATCH /api/servers/:id)
    const handleUpdateServer = async () => {
        if (serverName.trim().length < 3) return toast.error("Sunucu adı en az 3 karakter olmalıdır.");
        setLoading(true);
        try {
            await ServerService.updateSettings(server.id, { name: serverName });
            
            // 🔥 HOOK ENTEGRASYONU: Sidebar'daki ismi anında değiştirir
            updateServerInState(server.id, { name: serverName });
            
            toast.success("Ayarlar mühürlendi. 🦉");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Güncelleme başarısız.");
        } finally { setLoading(false); }
    };

    // 5. SUNUCUYU SİL VEYA AYRIL
    const handleCriticalAction = async () => {
        const actionMsg = isOwner ? "bu sunucuyu tamamen imha etmek" : "bu sunucudan ayrılmak";
        if (confirm(`DİKKAT: ${actionMsg} istediğine emin misin?`)) {
            try {
                if (isOwner) await ServerService.deleteServer(server.id);
                else await ServerService.leaveServer(server.id);
                
                // 🔥 HOOK ENTEGRASYONU: Sidebar'dan sunucuyu uçurur
                removeServerFromState(server.id);
                
                toast.success(`İşlem başarılı.`);
                onClose();
                window.location.href = "/";
            } catch (err: any) { 
                toast.error(err.response?.data?.error || "İşlem başarısız.");
            }
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none text-left">
            <div onClick={onClose} className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md animate-in fade-in duration-300" />
            
            <div className="relative w-full max-w-[850px] h-[620px] bg-[#0b0e14] rounded-[32px] border-2 border-white/5 shadow-2xl flex animate-in zoom-in-95 duration-200 overflow-hidden">
                
                {/* SOL NAVİGASYON */}
                <div className="w-[260px] bg-white/[0.02] border-r border-white/5 p-8 flex flex-col justify-between">
                    <nav className="space-y-1.5">
                        <div className="mb-8 px-2">
                            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] italic mb-1 opacity-40">Yönetim</h2>
                            <div className="text-sm font-black text-text-main truncate uppercase italic tracking-tighter">{server?.name}</div>
                        </div>

                        <TabItem active={activeTab === 'general'} icon={<Settings size={18} />} label="Genel Ayarlar" onClick={() => setActiveTab('general')} />
                        <TabItem active={activeTab === 'roles'} icon={<Shield size={18} />} label="Roller" onClick={() => setActiveTab('roles')} />
                        <TabItem active={activeTab === 'bans'} icon={<Ban size={18} />} label="Yasaklılar" onClick={() => setActiveTab('bans')} />
                    </nav>

                    <button 
                        onClick={handleCriticalAction} 
                        className="flex items-center gap-3 w-full p-4 rounded-2xl text-danger/50 hover:bg-danger/10 hover:text-danger transition-all text-[10px] font-black uppercase italic border border-danger/10 group active:scale-95 shadow-lg"
                    >
                        {isOwner ? <Trash2 size={16} /> : <LogOut size={16} />}
                        {isOwner ? "Sistemi İmha Et" : "Bağlantıyı Kes"}
                    </button>
                </div>

                {/* SAĞ İÇERİK */}
                <div className="flex-1 p-12 relative overflow-y-auto bg-gradient-to-br from-transparent to-white/[0.01] scrollbar-hide">
                    <button onClick={onClose} className="absolute right-8 top-8 text-text-muted hover:text-text-main transition-all active:scale-90">
                        <X size={28} strokeWidth={3} />
                    </button>

                    {activeTab === 'general' && (
                        <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                            <SectionHeader title="Görünüm" subtitle="Sunucu kimliğini mühürle" />
                            <div className="space-y-8 max-w-md">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest italic flex items-center gap-2 ml-1"><Hash size={14} className="text-accent" /> Sunucu İsmi</label>
                                    <input value={serverName} onChange={(e) => setServerName(e.target.value)} className="w-full bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-text-main outline-none focus:border-accent/40 transition-all italic shadow-2xl" />
                                </div>
                                <button onClick={handleUpdateServer} disabled={loading} className="px-10 py-4 bg-accent text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(79,140,255,0.2)] italic flex items-center gap-3">
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={18} strokeWidth={3} />}
                                    Ayarları Güncelle
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                            <div className="flex justify-between items-end border-b border-white/5 pb-8">
                                <SectionHeader title="Roller" subtitle="Hiyerarşiyi düzenle" />
                                <button className="p-3.5 bg-accent/10 text-accent rounded-2xl hover:bg-accent hover:text-black transition-all border border-accent/20 active:scale-90"><Plus size={24} strokeWidth={3} /></button>
                            </div>
                            <div className="space-y-3">
                                {roles.length === 0 ? (
                                    <div className="text-center py-20 opacity-20 italic uppercase font-black tracking-widest text-xs">Henüz rol tanımlanmamış...</div>
                                ) : (
                                    roles.map(role => (
                                        <div key={role.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group cursor-pointer active:scale-[0.98]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-5 h-5 rounded-lg border-2 border-white/10 shadow-lg" style={{ backgroundColor: role.color }} />
                                                <span className="font-black text-text-main italic uppercase text-[13px] tracking-tight">{role.name}</span>
                                            </div>
                                            <ChevronRight size={18} className="text-text-muted opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'bans' && (
                        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                            <SectionHeader title="Yasaklılar" subtitle="Uzaklaştırılan kullanıcılar" />
                            <div className="space-y-3">
                                {bans.length === 0 ? (
                                    <div className="text-center py-24 bg-white/[0.01] rounded-[40px] border border-dashed border-white/5">
                                        <Ban size={48} className="mx-auto text-text-muted opacity-5 mb-4" />
                                        <p className="text-text-muted italic text-[11px] uppercase font-black tracking-[0.25em] opacity-30 text-center">Sicil Temiz</p>
                                    </div>
                                ) : (
                                    bans.map(ban => (
                                        <div key={ban.user_id} className="flex items-center justify-between p-5 bg-danger/5 border border-danger/10 rounded-2xl group transition-all hover:bg-danger/10">
                                            <div className="flex items-center gap-4">
                                                <img src={ban.avatar_url || '/default-avatar.png'} className="w-12 h-12 rounded-2xl object-cover border-2 border-danger/20" alt="" />
                                                <div>
                                                    <div className="font-black text-text-main uppercase text-sm italic tracking-tight">{ban.username}</div>
                                                    <div className="text-[10px] text-danger/60 font-black uppercase tracking-tighter mt-1 opacity-70">Gerekçe: {ban.reason}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleUnban(ban.user_id)} className="px-6 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white text-[10px] font-black uppercase rounded-xl transition-all italic border border-danger/20 active:scale-95 shadow-2xl">Affet</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function TabItem({ active, icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-[11px] font-black uppercase italic transition-all active:scale-95 ${active ? 'bg-accent text-black shadow-xl border border-white/10' : 'text-text-muted hover:bg-white/5 hover:text-text-main opacity-60 hover:opacity-100'}`}>
            <span className={active ? 'text-black' : 'text-accent'}>{icon}</span>
            <span className="tracking-[0.1em]">{label}</span>
        </button>
    );
}

function SectionHeader({ title, subtitle }: any) {
    return (
        <div className="relative">
            <h3 className="text-5xl font-black italic tracking-tighter uppercase text-text-main leading-none drop-shadow-2xl">{title}</h3>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] mt-4 opacity-40 italic ml-1 border-l-4 border-accent pl-4">{subtitle}</p>
        </div>
    );
}