import { createPortal } from 'react-dom';
import { ShieldBan, UserMinus, X, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    username: string;
    action: 'REMOVE' | 'BLOCK' | null;
}

export default function FriendActionModal({ isOpen, onClose, onConfirm, username, action }: Props) {
    if (!isOpen || !action) return null;

    const isBlock = action === 'BLOCK';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop - Blur ve Koyu Arka Plan */}
            <div 
                onClick={onClose} 
                className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm animate-in fade-in duration-200" 
            />
            
            <div className={`relative w-full max-w-[400px] bg-bg-elevated rounded-2xl border-2 shadow-2xl overflow-hidden animate-in zoom-in duration-150 
                ${isBlock ? 'border-danger/20' : 'border-warning/20'}`}>
                
                {/* Sağ Üst Kapatma */}
                <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-main transition-colors">
                    <X size={18} strokeWidth={4} />
                </button>

                <div className="px-5 pt-8 text-center">
                    {/* İkon Alanı */}
                    <div className={`flex justify-center mb-3 opacity-80 ${isBlock ? 'text-danger' : 'text-warning'}`}>
                        {isBlock ? (
                            <ShieldBan size={32} strokeWidth={3} />
                        ) : (
                            <UserMinus size={32} strokeWidth={3} />
                        )}
                    </div>

                    {/* Başlık - Uppercase & Tracking Tight */}
                    <h2 className="text-lg font-black text-text-main uppercase tracking-tighter">
                        {isBlock ? 'Kullanıcıyı Engelle' : 'Arkadaştan Çıkar'}
                    </h2>

                    {/* Mesaj Alt Metni */}
                    <p className="text-[13px] text-text-muted mt-3 leading-relaxed px-5 font-bold tracking-wide opacity-80">
                        <strong className={`${isBlock ? 'text-danger' : 'text-warning'} font-black`}>@{username}</strong> 
                        {isBlock 
                            ? ' isimli kullanıcıyı engellemek istediğine emin misin? Artık sana ulaşamayacak.' 
                            : ' isimli kullanıcıyı listenden çıkarıyorsun.'}
                    </p>
                </div>

                {/* Buton Grubu */}
                <div className="flex flex-col gap-2 px-5 py-6 mt-2">
                    <button 
                        onClick={onConfirm}
                        className={`w-full h-11 text-white text-[13px] font-black  rounded-lg shadow-lg transition-all active:scale-95 ${
                            isBlock 
                            ? 'bg-danger shadow-danger/20 hover:brightness-110' 
                            : 'bg-warning shadow-warning/20 hover:brightness-110 text-black'
                        }`}
                    >
                        {isBlock ? 'Evet, Engelle' : 'Evet, Listeden Çıkar'}
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="w-full h-11 bg-white/5 text-text-muted text-[13px] font-bold  rounded-lg hover:bg-white/10 transition-all"
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}