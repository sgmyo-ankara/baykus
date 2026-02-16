import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useServers } from '../../hooks/useServers';
import logo from '../../assets/logo.jpg';
import AddServerModal from '../modals/AddServerModal';
import ServerContextMenu from '../menus/ServerContextMenu';

interface SidebarProps {
    activeId: string;
    setActiveId: (id: string) => void;
}

export default function Sidebar({ activeId, setActiveId }: SidebarProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { servers, isLoading } = useServers();
    const navigate = useNavigate();
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, server: any } | null>(null);

    const handleHomeClick = () => {
        setActiveId('home');
        navigate('/');
    };

    const handleServerClick = (serverId: string) => {
        setActiveId(serverId);
        navigate(`/channels/${serverId}`);
    };

    return (
        <>
            <div className="flex flex-col items-center w-full h-full py-4 relative bg-[#020617]">
                <div className="mb-2">
                    <SidebarButton
                        icon={<img src={logo} alt="Logo" className="w-full h-full object-cover" />}
                        label="Ana Sayfa"
                        active={activeId === 'home'}
                        onClick={handleHomeClick}
                    />
                </div>

                <div className="w-8 h-[2px] bg-white/5 rounded-full mb-2" />

                <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar">
                    {isLoading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="w-12 h-12 shrink-0 rounded-full bg-white/5 animate-pulse" />
                        ))
                    ) : (
                        servers.map((s) => (
                            <SidebarButton
                                key={s.id}
                                icon={s.icon_url ? (
                                    <img src={s.icon_url} className="w-full h-full object-cover" alt={s.name} />
                                ) : (
                                    s.name[0].toUpperCase()
                                )}
                                label={s.name}
                                active={activeId === s.id}
                                onClick={() => handleServerClick(s.id)}
                                onContextMenu={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.pageX, y: e.pageY, server: s });
                                }}
                            />
                        ))
                    )}
                </div>

                <div className="mt-auto flex flex-col items-center border-t border-white/5 w-full pt-4">
                    <SidebarButton
                        icon={<Plus size={24} />}
                        label="Sunucu Ekle"
                        isAction
                        onClick={() => setIsModalOpen(true)}
                    />
                </div>
            </div>

            <AddServerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            
            {contextMenu && (
                <ServerContextMenu 
                    x={contextMenu.x} 
                    y={contextMenu.y} 
                    server={contextMenu.server} 
                    onClose={() => setContextMenu(null)} 
                />
            )}
        </>
    );
}

// --- BURASI EKSİKTİ, DÜZGÜN YAZDIK ---

function SidebarButton({ icon, label, active, isAction, onClick, onContextMenu }: any) {
    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="group relative flex items-center justify-center w-full h-12 cursor-pointer mb-1"
        >
            <div className={`absolute left-0 bg-white rounded-r-full transition-all duration-300 origin-left
                ${active ? 'h-8 w-1' : 'h-2 w-0 group-hover:w-1 group-hover:h-5'}`} 
            />

            <div
                className={`w-12 h-12 flex items-center justify-center text-xl font-black transition-all duration-300 overflow-hidden
                ${active
                        ? 'rounded-[16px] bg-accent text-white shadow-[0_0_20px_rgba(79,140,255,0.3)]'
                        : isAction
                        ? 'rounded-full bg-white/5 text-success hover:rounded-[16px] hover:bg-success hover:text-white'
                        : 'rounded-full bg-white/5 text-text-muted hover:rounded-[16px] hover:bg-accent hover:text-white'
                }`}
            >
                <div className="w-full h-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 select-none uppercase italic">
                    {icon}
                </div>
            </div>

            <div className="fixed left-[86px] px-3 py-1.5 rounded-lg bg-black text-white text-xs font-black uppercase italic opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100] shadow-2xl translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap">
                {label}
                <div className="absolute top-1/2 -left-1 w-2 h-2 bg-black rotate-45 -translate-y-1/2" />
            </div>
        </div>
    );
}