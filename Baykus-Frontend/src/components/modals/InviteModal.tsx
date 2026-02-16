import { useState } from 'react';
import { useInvites } from '../../hooks/useInvites';
import { Check, X, Copy } from 'lucide-react';

interface InviteModalProps {
    serverId: string;
    onClose: () => void;
}

export default function InviteModal({ serverId, onClose }: InviteModalProps) {
    const { generateInvite, loading } = useInvites();
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        const res = await generateInvite(serverId); 
        if (res.success) setInviteCode(res.code); 
    };

    const copyToClipboard = () => {
        if (!inviteCode) return;
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop - bg-main uyumlu derin karanlık */}
            <div onClick={onClose} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />

            <div className="relative w-full max-w-[400px] bg-bg-elevated rounded-2xl border-2 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-150">
                
                {/* Header - Sade ve Kalın */}
                <div className="relative px-5 pt-6 text-center">
                    <button 
                        onClick={onClose} 
                        className="absolute right-4 top-4 text-text-muted hover:text-text-main transition-colors"
                    >
                        <X size={20} strokeWidth={4} />
                    </button>

                    <h2 className="text-lg font-bold text-text-main tracking-tight uppercase">
                        Davet Oluştur
                    </h2>
                    <p className="text-[13px] text-text-muted mt-0.5 leading-snug">
                        Arkadaşlarını sunucuna çağırmak için bir kod al.
                    </p>
                </div>

                {/* Body - Net ve Odaklı */}
                <div className="px-5 py-6 space-y-2">
                    <label className="text-[12px] font-bold text-text-muted uppercase tracking-wider ml-1">
                        Sunucu Giriş Kodu
                    </label>
                    <div className="relative">
                        <div className={`w-full h-12 px-4 flex items-center rounded-lg bg-black/20 border-2 transition-all font-bold text-[14px] tracking-[0.2em] uppercase
                            ${inviteCode ? 'border-success/30 text-success' : 'border-white/5 text-text-muted/20'}`}>
                            {inviteCode || 'KOD OLUŞTUR'}
                        </div>
                    </div>
                </div>

                {/* Footer - Temiz Alt Bar */}
                <div className="flex justify-end items-center gap-3 px-5 py-3 bg-white/[0.02] mt-2 border-t border-white/5">
                    <button 
                        onClick={onClose} 
                        className="text-[13px] text-text-muted hover:text-text-main font-medium transition-colors"
                    >
                        Kapat
                    </button>
                    
                    {inviteCode ? (
                        <button 
                            onClick={copyToClipboard}
                            className={`px-5 py-2.5 rounded-md text-[12px] font-bold text-white transition-all shadow-lg flex items-center gap-2
                                ${copied ? 'bg-success shadow-success/20' : 'bg-accent shadow-accent/20 hover:bg-accent/80'}`}
                        >
                            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={4} />}
                            {copied ? 'Kopyalandı' : 'Kopyala'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="px-6 py-2.5 bg-success text-white text-[12px] font-bold rounded-md uppercase shadow-lg shadow-success/20 hover:bg-success/80 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {loading ? '...' : 'Kod Al'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}