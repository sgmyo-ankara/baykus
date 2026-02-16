import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus } from 'lucide-react';
import { useFriends } from '../../hooks/useFriends';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFriendModal({ isOpen, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const { sendRequest } = useFriends();

  if (!isOpen) return null;

  const resetAndClose = () => {
    setUsername('');
    setStatus(null);
    onClose();
  };

  const handleSend = async () => {
    if (username.trim().length < 3) return;
    const result = await sendRequest(username);
    
    if (result.success) {
      setStatus({ type: 'success', msg: 'İstek Gönderildi!' });
      setUsername('');
      setTimeout(resetAndClose, 1500);
    } else {
      setStatus({ type: 'error', msg: result.message });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop - bg-main uyumlu */}
      <div onClick={resetAndClose} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />

      {/* Modal Gövdesi - 360px */}
      <div className="relative w-full max-w-[400px] bg-bg-elevated rounded-2xl border-2 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-150">
        
        {/* Header - Verdiğin ölçülerde */}
        <div className="relative px-5 pt-5 text-center">
          <button 
            onClick={resetAndClose} 
            className="absolute right-4 top-4 text-text-muted hover:text-text-main transition-colors"
          >
            <X size={20} strokeWidth={4} /> {/* İkon kalınlığı 4 */}
          </button>

          <h2 className="text-lg font-bold text-text-main tracking-tight uppercase">
            Arkadaş Ekle
          </h2>
          <p className="text-[13px] text-text-muted mt-0.5 leading-snug">
            Baykuş dünyasına birini çağır.
          </p>
        </div>

        {/* Body - Verdiğin spacing yapısı */}
        <div className="px-5 py-5 space-y-2.5">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-muted uppercase tracking-wider">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <input 
                autoFocus
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: baykus_han"
                className={`w-full h-12 px-3 rounded-lg bg-black/20 border-2 text-[13px] font-bold outline-none transition-all
                  ${status?.type === 'error' ? 'border-danger/50 text-danger' : 'border-white/5 text-text-main focus:border-accent/50'}`}
              />
              <div className="absolute right-3 top-3 text-text-muted opacity-20">
                <UserPlus size={20} strokeWidth={3} />
              </div>
            </div>
          </div>

          {status && (
            <div className={`p-3 rounded-lg text-[11px] font-black  animate-in fade-in slide-in-from-top-1
              ${status.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {status.msg}
            </div>
          )}
        </div>

        {/* Footer - bg-main uyumlu tasarım */}
        <div className="flex justify-end items-center gap-3 px-5 py-3 bg-white/[0.02] mt-2">
          <button 
            onClick={resetAndClose} 
            className="text-[13px] text-text-muted hover:text-text-main font-medium transition-colors"
          >
            Vazgeç
          </button>
          <button 
            onClick={handleSend}
            disabled={username.trim().length < 3}
            className="px-4 py-2.5 bg-accent text-white text-[13px] font-bold rounded-md shadow-lg hover:bg-accent/80 active:scale-95 disabled:opacity-50 transition-all"
          >
            İstek Gönder
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}