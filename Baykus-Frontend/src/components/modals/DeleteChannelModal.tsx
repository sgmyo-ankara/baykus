import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function DeleteChannelModal({ isOpen, onClose, onConfirm, channelName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, channelName: string }) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-[340px] bg-bg-elevated rounded-2xl border-2 border-danger/20 shadow-2xl overflow-hidden animate-in zoom-in duration-150">
                <div className="px-5 pt-6 text-center">
                    <div className="flex justify-center mb-3 text-danger opacity-80">
                        <AlertTriangle size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-lg font-bold text-text-main uppercase tracking-tight">Kanalı Sil?</h2>
                    <p className="text-[12px] text-text-muted mt-2 leading-relaxed px-2">
                        <strong className="text-danger font-black">#{channelName}</strong> kanalını silmek istediğine emin misin? Bu işlem geri alınamaz.
                    </p>
                </div>

                <div className="flex flex-col gap-2 px-5 py-5">
                    <button 
                        onClick={onConfirm}
                        className="w-full h-11 bg-danger text-white text-[12px] font-black uppercase rounded-lg shadow-lg shadow-danger/20 hover:brightness-110 transition-all"
                    >
                        Kanalı Kalıcı Olarak Sil
                    </button>
                    <button onClick={onClose} className="w-full h-11 bg-white/5 text-text-muted text-[12px] font-bold uppercase rounded-lg hover:bg-white/10 transition-all">
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}