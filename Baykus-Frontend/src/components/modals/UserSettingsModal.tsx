import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Mail, Check, LogOut, Hash } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { auth } from '../../lib/firebase';

export default function UserSettingsModal({ isOpen, onClose, userData, avatarUrl }: any) {
    const { updateProfile, updating } = useUser();
    const [editMode, setEditMode] = useState(false);
    const [newUsername, setNewUsername] = useState("");

    useEffect(() => {
        if (isOpen) {
            setNewUsername(userData?.username || "");
            setEditMode(false);
        }
    }, [isOpen, userData]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (newUsername.trim() === userData?.username) {
            setEditMode(false);
            return;
        }

        const updatedData: any = { username: newUsername.trim() };

        if (userData?.avatar_url?.includes('ui-avatars.com')) {
            updatedData.avatar_url = `https://ui-avatars.com/api/?name=${newUsername.trim()}&background=random`;
        }

        const res = await updateProfile(updatedData);
        if (res.success) setEditMode(false);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none">
            {/* BACKDROP */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-bg-main/80 backdrop-blur-md animate-in fade-in duration-300"
            />

            {/* MODAL */}
            <div className="relative w-full max-w-[580px] bg-bg-main rounded-[24px] border-2 border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex h-full flex-col md:flex-row">

                    {/* SOL */}
                    <div className="w-full md:w-[220px] bg-gradient-to-b from-white/[0.03] to-transparent p-8 flex flex-col items-center justify-center border-r border-white/5">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-accent/20 rounded-[35px] blur opacity-25 group-hover:opacity-50 transition duration-500"></div>

                            <div className="relative">
                                <img
                                    src={avatarUrl}
                                    className="w-32 h-32 rounded-[32px] object-cover border-2 border-white/10 shadow-2xl"
                                    alt="Avatar"
                                />
                                <div className="absolute inset-0 bg-black/60 rounded-[32px] opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all border-2 border-accent/50">
                                    <Camera className="text-white" size={28} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Online Dot */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-[5px] border-[#0b0e14] shadow-lg" />
                        </div>
                    </div>

                    {/* SAĞ */}
                    <div className="flex-1 p-8 relative">
                        <button
                            onClick={onClose}
                            className="absolute right-6 top-6 text-text-muted hover:text-white transition-all"
                        >
                            <X size={22} strokeWidth={3} />
                        </button>

                        <div className="space-y-8">
                            {/* HEADER */}
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter text-text-main leading-none">
                                    Profil
                                </h2>
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] mt-2 opacity-30">
                                    Kullanıcı Bilgileri
                                </p>
                            </div>

                            {/* DETAYLAR */}
                            <div className="space-y-5">

                                {/* USERNAME */}
                                <div className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                            <Hash size={15} className="text-accent" />
                                            Kullanıcı Adı
                                        </label>

                                        {!editMode ? (
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="text-[11px] font-black text-accent uppercase hover:underline"
                                            >
                                                Değiştir
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setEditMode(false)}
                                                className="text-[11px] font-black text-text-muted uppercase hover:underline"
                                            >
                                                İptal
                                            </button>
                                        )}
                                    </div>

                                 
                                    <div className="relative min-h-[44px]">
                                        {/* VIEW MODE */}
                                        <div
                                            className={`absolute inset-0 flex items-center transition-opacity duration-200 ${
                                                editMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                            }`}
                                        >
                                            <div className="text-xl font-black tracking-tight text-text-main">
                                                @{userData?.username}
                                            </div>
                                        </div>

                                        {/* EDIT MODE */}
                                        <div
                                            className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ${
                                                editMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                            }`}
                                        >
                                            <input
                                                autoFocus
                                                value={newUsername}
                                                onChange={(e) =>
                                                    setNewUsername(
                                                        e.target.value.toLowerCase().replace(/\s/g, '_')
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave();
                                                    if (e.key === 'Escape') setEditMode(false);
                                                }}
                                                className="flex-1 bg-white/5 border border-accent/30 rounded-xl px-4 py-2 text-sm font-bold text-text-main outline-none focus:border-accent transition-all"
                                            />
                                            <button
                                                onClick={handleSave}
                                                disabled={updating}
                                                className="bg-accent text-black p-2 rounded-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Check size={18} strokeWidth={4} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* EMAIL */}
                                <div className="pt-4 border-t border-white/5">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Mail size={15} />
                                        E-Posta
                                    </label>
                                    <div className="text-sm font-bold text-text-main/60">
                                        {userData?.email}
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="pt-5">
                                <button
                                    onClick={() => auth.signOut()}
                                    className="flex items-center gap-3 text-[11px] font-black text-danger/50 hover:text-danger uppercase tracking-widest transition-all group"
                                >
                                    <div className="p-2 rounded-lg bg-danger/5 group-hover:bg-danger/10 transition-colors">
                                        <LogOut size={16} strokeWidth={3} />
                                    </div>
                                    Çıkış Yap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
