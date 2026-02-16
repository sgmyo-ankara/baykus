import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Hash } from 'lucide-react';

export default function CreateChannelModal({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (name: string) => void }) {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-[360px] bg-bg-elevated rounded-2xl border-2 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-150">
                <div className="relative px-5 pt-5 text-center">
                    <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-main">
                        <X size={20} strokeWidth={4} />
                    </button>
                    <h2 className="text-lg font-bold text-text-main tracking-tight uppercase">Kanal Oluştur</h2>
                    <p className="text-[12px] text-text-muted mt-0.5 leading-snug">Metin tabanlı yeni bir sohbet alanı kur.</p>
                </div>

                <div className="px-5 py-5 space-y-2.5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Kanal İsmi</label>
                        <div className="relative">
                            <input 
                                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                                placeholder="Örn: genel-sohbet"
                                className="w-full h-12 px-3 pl-10 rounded-lg bg-black/20 border-2 border-white/5 text-[13px] font-bold text-text-main outline-none focus:border-accent/50 transition-all"
                            />
                            <Hash size={18} strokeWidth={4} className="absolute left-3 top-3.5 text-text-muted/40" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 px-5 py-3 bg-white/[0.02] mt-2 border-t border-white/5">
                    <button onClick={onClose} className="text-[12px] text-text-muted hover:text-text-main font-medium">Vazgeç</button>
                    <button 
                        onClick={() => { onCreate(name); setName(''); }}
                        disabled={name.length < 3}
                        className="px-5 py-2.5 bg-accent text-white text-[12px] font-bold rounded-md uppercase shadow-lg disabled:opacity-50 transition-all"
                    >
                        Kanalı Kur
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}