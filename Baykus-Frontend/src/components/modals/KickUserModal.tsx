import { createPortal } from 'react-dom';
import { AlertTriangle, Lock, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void; // Opsiyonel yaptık (hata modunda gerek yok)
    username?: string;      // Opsiyonel
    errorMsg?: string;      // Yeni: Hata mesajı gelirse hata moduna geçer
}

export default function KickUserModal({ isOpen, onClose, onConfirm, username, errorMsg }: Props) {
    if (!isOpen) return null;

    // Eğer errorMsg varsa "Hata/Yetki Yok" modunda çalışır
    const isError = !!errorMsg;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div onClick={onClose} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
            
            <div className={`relative w-full max-w-[340px] bg-bg-elevated rounded-2xl border-2 shadow-2xl overflow-hidden animate-in zoom-in duration-150 
                ${isError ? 'border-white/5' : 'border-danger/20'}`}>
                
                {/* Header Kapama - Sadece hata modunda daha belirgin olsun */}
                {isError && (
                    <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-main transition-colors">
                        <X size={18} strokeWidth={4} />
                    </button>
                )}

                <div className="px-5 pt-8 text-center">
                    <div className={`flex justify-center mb-3 opacity-80 ${isError ? 'text-warning' : 'text-danger'}`}>
                        {isError ? (
                            <Lock size={32} strokeWidth={3} /> 
                        ) : (
                            <AlertTriangle size={32} strokeWidth={3} />
                        )}
                    </div>

                    <h2 className="text-lg font-bold text-text-main uppercase tracking-tight">
                        {isError ? 'ERİŞİM ENGELLENDİ' : 'Kullanıcıyı At?'}
                    </h2>

                    <p className="text-[12px] text-text-muted mt-2 leading-relaxed px-4 font-bold uppercase tracking-wide opacity-80">
                        {isError ? (
                            errorMsg
                        ) : (
                            <><strong className="text-danger font-black">{username}</strong> adlı kullanıcıyı sunucudan atmak istediğine emin misin?</>
                        )}
                    </p>
                </div>

                <div className="flex flex-col gap-2 px-5 py-6 mt-2">
                    {!isError ? (
                        <>
                            <button 
                                onClick={onConfirm}
                                className="w-full h-11 bg-danger text-white text-[12px] font-black uppercase rounded-lg shadow-lg shadow-danger/20 hover:brightness-110 transition-all active:scale-95"
                            >
                                Sunucudan At
                            </button>
                            <button 
                                onClick={onClose} 
                                className="w-full h-11 bg-white/5 text-text-muted text-[12px] font-bold uppercase rounded-lg hover:bg-white/10 transition-all"
                            >
                                Vazgeç
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="w-full h-11 bg-white/5 hover:bg-white/10 text-text-main text-[12px] font-black uppercase rounded-lg transition-all active:scale-95 border border-white/5"
                        >
                            Anladım
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}