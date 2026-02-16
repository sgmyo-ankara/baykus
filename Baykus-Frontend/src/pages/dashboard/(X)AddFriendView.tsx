import { useState } from 'react';
import { useInvites } from '../../hooks/useInvites';
import { useNavigate } from 'react-router-dom';

export default function AddFriendView() {
    const [inviteCode, setInviteCode] = useState('');
    const { joinServer, loading } = useInvites();
    const navigate = useNavigate();

    const handleJoinServer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode) return;

        const res = await joinServer(inviteCode);
        if (res.success) {
            // Başarılıysa doğrudan katıldığı sunucunun ilk kanalına uçuruyoruz
            navigate(`/channels/${res.serverId}/${res.channelId}`);
        } else {
            alert(res.error);
        }
    };

    return (
        <div className="p-8 max-w-2xl">
            <h2 className="text-white text-xl font-black italic uppercase italic mb-2">Arkadaş Ekle</h2>
            <p className="text-text-muted text-sm mb-6">Arkadaşlarını kullanıcı adlarıyla ekleyebilirsin.</p>
            
            {/* Mevcut Arkadaş Ekleme Inputu Buraya... */}
            <div className="h-[1px] bg-white/5 my-8" />

            {/* SUNUCUYA KATILMA ALANI */}
            <h2 className="text-white text-xl font-black italic uppercase italic mb-2">Sunucuya Katıl</h2>
            <p className="text-text-muted text-sm mb-4">Bir davet bağlantın mı var? Buraya yazarak sunucuya giriş yap.</p>
            
            <form onSubmit={handleJoinServer} className="relative group">
                <input 
                    type="text" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Örn: aB12cD34"
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-success/50 transition-all font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-medium"
                />
                <button 
                    disabled={loading || !inviteCode}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-success text-white rounded-lg font-bold text-xs uppercase hover:bg-success/80 transition-all disabled:opacity-50"
                >
                    {loading ? 'Katılınıyor...' : 'Sunucuya Katıl'}
                </button>
            </form>
        </div>
    );
}