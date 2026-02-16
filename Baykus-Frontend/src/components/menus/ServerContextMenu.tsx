import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Trash2, LogOut, UserPlus } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { api } from '../../api/axios';
import { toast } from 'react-hot-toast';
import ServerSettingsModal from '../modals/ServerSettingsModal'; // Modalını import et

interface Props {
    x: number;
    y: number;
    server: any;
    onClose: () => void;
}

export default function ServerContextMenu({ x, y, server, onClose }: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const isOwner = server.owner_id === auth.currentUser?.uid;

    // Dışarı tıklayınca kapat (Eğer ayarlar modalı açık değilse)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!isSettingsOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [onClose, isSettingsOpen]);

    // Sunucudan Ayrılma Fonksiyonu
    const handleLeave = async () => {
        try {
            await api.post(`/api/servers/${server.id}/leave`);
            toast.success("Sunucudan ayrıldın.");
            window.location.href = "/";
        } catch (err: any) {
            toast.error(err.response?.data?.error || "İşlem başarısız.");
        }
    };

    return (
        <>
            {createPortal(
                <div 
                    ref={menuRef}
                    style={{ top: y, left: x }}
                    className="fixed z-[10000] w-56 bg-[#0b0e14] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-1.5 animate-in fade-in zoom-in duration-100"
                >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic truncate opacity-50">
                            {server.name}
                        </p>
                    </div>

                    <MenuBtn icon={<UserPlus size={14}/>} label="Davet Oluştur" color="text-accent" />
                    
                    {/* AYARLARI AÇAN BUTON */}
                    <MenuBtn 
                        icon={<Settings size={14}/>} 
                        label="Sunucu Ayarları" 
                        onClick={() => setIsSettingsOpen(true)}
                    />

                    <div className="h-[1px] bg-white/5 my-1" />

                    {isOwner ? (
                        <MenuBtn 
                            icon={<Trash2 size={14}/>} 
                            label="Sunucuyu Sil" 
                            color="text-danger" 
                            bold 
                            onClick={() => setIsSettingsOpen(true)} // Silme işlemi de ayarlar modalı içinde handle ediliyor
                        />
                    ) : (
                        <MenuBtn 
                            icon={<LogOut size={14}/>} 
                            label="Sunucudan Ayrıl" 
                            color="text-danger" 
                            onClick={handleLeave}
                        />
                    )}
                </div>,
                document.body
            )}

            {/* AYARLAR MODALI */}
            <ServerSettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    onClose(); // Modal kapanınca sağ tık menüsünü de tamamen temizle
                }}
                server={server}
                isOwner={isOwner}
            />
        </>
    );
}

function MenuBtn({ icon, label, onClick, color = "text-text-muted", bold = false }: any) {
    return (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-all group ${color}`}
        >
            <span className={`text-[11px] uppercase italic tracking-tighter ${bold ? 'font-black' : 'font-bold'}`}>
                {label}
            </span>
            <span className="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                {icon}
            </span>
        </button>
    );
}