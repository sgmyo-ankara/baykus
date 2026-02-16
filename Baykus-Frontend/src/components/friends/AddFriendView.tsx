// src/components/friends/AddFriendView.tsx
import { useState } from 'react';
import { useFriends } from '../../hooks/useFriends';

export default function AddFriendView() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const { sendRequest } = useFriends();

  const handleSend = async () => {
    if (username.trim().length < 3) return;
    
    const result = await sendRequest(username);
    
    if (result.success) {
      setStatus({ type: 'success', msg: 'Arkadaşlık isteği başarıyla gönderildi!' });
      setUsername('');
    } else {
      setStatus({ type: 'error', msg: result.message });
    }
  };

  return (
    <div className="p-8 max-w-2xl animate-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-xl font-black uppercase italic mb-1">Arkadaş Ekle</h2>
      <p className="text-sm text-text-muted mb-6">Arkadaşlarını Baykuş kullanıcı adıyla ekleyebilirsin.</p>
      
      <div className="relative group">
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Kullanıcı adını gir..."
          className={`w-full h-14 bg-black/20 border-2 rounded-2xl px-6 outline-none transition-all placeholder:text-text-muted/20 text-white
            ${status?.type === 'error' ? 'border-error/50' : 'border-white/5 focus:border-accent'}`}
        />
        <button 
          onClick={handleSend}
          className="absolute right-3 top-2.5 h-9 px-6 bg-accent text-white text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg"
        >
          İstek Gönder
        </button>
      </div>

      {status && (
        <p className={`mt-4 text-sm font-bold ${status.type === 'success' ? 'text-success' : 'text-error'}`}>
          {status.msg}
        </p>
      )}
    </div>
  );
}