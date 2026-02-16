import { useState } from 'react';
import { Hash, Users, Bell, Pin, Search, HelpCircle, UserPlus2, Circle, Settings, ShieldCheck } from 'lucide-react';
import AddFriendModal from '../modals/AddFriendModal';

interface MainHeaderProps {
    activeId: string;
    dmView: 'all' | 'pending' | 'add' | 'online';
    setDmView: (view: 'all' | 'pending' | 'add' | 'online') => void;
    channelName: string;
    showMembers?: boolean;
    setShowMembers?: (show: boolean) => void;
    isAtChannel?: boolean;
    isHome?: boolean;
    isServerHome?: boolean; // 🚩 Sadece sunucu seçili ama kanal seçili değilse
    onInviteClick?: () => void;
    onlineCount?: number;
}

export default function MainHeader(props: MainHeaderProps) {
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const { isHome, isServerHome, channelName, dmView, setDmView, onlineCount = 0 } = props;

    // =====================================================
    // 🏠 1. MOD: ANA SAYFA (ARKADAŞLAR) HEADER
    // =====================================================
    if (isHome) {
        return (
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-bg-panel/20 backdrop-blur-md shrink-0 select-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                        <Users size={24} className="text-text-muted" />
                        <div className="flex flex-col">
                            <h1 className="font-black italic uppercase tracking-tighter text-xl text-text-main leading-none">Arkadaşlar</h1>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Circle size={8} className="fill-success text-success animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/60">{onlineCount} Çevrimiçi</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                        {['online', 'all', 'pending'].map((view: any) => (
                            <button 
                                key={view}
                                onClick={() => setDmView(view)}
                                className={`px-3 py-1 rounded-lg text-xs font-black uppercase italic transition-all ${dmView === view ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5'}`}
                            >
                                {view === 'online' ? 'Çevrimiçi' : view === 'all' ? 'Tümü' : 'Bekleyenler'}
                            </button>
                        ))}
                        <button 
                            onClick={() => setIsAddFriendOpen(true)}
                            className="bg-success text-white px-3 py-1 rounded-lg text-xs font-black uppercase italic ml-2 shadow-lg shadow-success/20"
                        >
                            Arkadaş Ekle
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <SearchBox />
                    <HelpCircle size={20} className="text-text-muted hover:text-text-main cursor-pointer" />
                </div>
                <AddFriendModal isOpen={isAddFriendOpen} onClose={() => setIsAddFriendOpen(false)} />
            </header>
        );
    }

    // =====================================================
    // 🛡️ 2. MOD: SUNUCU ANA SAYFASI (KANAL SEÇİLMEMİŞ)
    // =====================================================
    if (isServerHome) {
        return (
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-bg-panel/20 backdrop-blur-md shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-accent" />
                    <h1 className="font-black italic uppercase tracking-tighter text-xl text-text-main">{channelName}</h1>
                    <span className="bg-accent/10 text-accent text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ml-2 border border-accent/20">Sunucu Genel</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={props.onInviteClick} className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-text-main rounded-xl text-xs font-black uppercase italic transition-all border border-white/5">
                        <UserPlus2 size={16} /> Davet Et
                    </button>
                    <Settings size={20} className="text-text-muted hover:text-text-main cursor-pointer" />
                </div>
            </header>
        );
    }

    // =====================================================
    // 💬 3. MOD: KANAL / CHAT HEADER
    // =====================================================
    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-bg-panel/20 backdrop-blur-md shrink-0 select-none">
            <div className="flex items-center gap-3">
                <Hash size={24} className="text-text-muted" />
                <h1 className="font-black italic uppercase tracking-tighter text-xl text-text-main">{channelName}</h1>
            </div>
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-4 border-r border-white/10 pr-5">
                    <Bell size={20} className="text-text-muted hover:text-accent cursor-pointer transition-colors" />
                    <Pin size={20} className="text-text-muted hover:text-warning cursor-pointer transition-colors" />
                    <Users 
                        size={22} 
                        className={`cursor-pointer transition-all ${props.showMembers ? 'text-accent' : 'text-text-muted hover:text-text-main'}`} 
                        onClick={() => props.setShowMembers?.(!props.showMembers)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <SearchBox />
                    <HelpCircle size={20} className="text-text-muted hover:text-text-main cursor-pointer" />
                </div>
            </div>
        </header>
    );
}

// Ortak Arama Kutusu Bileşeni
function SearchBox() {
    return (
        <div className="bg-black/40 border-2 border-white/5 focus-within:border-accent/40 rounded-xl flex items-center px-3 py-1.5 gap-2 transition-all">
            <input type="text" placeholder="ARA..." className="bg-transparent border-none outline-none text-[10px] w-32 placeholder:italic font-black text-text-main uppercase" />
            <Search size={14} className="text-text-muted" />
        </div>
    );
}