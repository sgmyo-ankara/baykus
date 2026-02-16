import { useEffect, useState } from 'react';
import { Hash, Plus, Settings, Trash2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { ChannelService } from '../../api/channels';
import CreateChannelModal from '../../components/modals/CreateChannelModal';
import DeleteChannelModal from '../../components/modals/DeleteChannelModal';

export default function ChannelSidebar({ serverId }: { serverId: string }) {
    const { channels, fetchChannels, createChannel } = useChannels();
    const { channelId: activeChannelId } = useParams();
    const navigate = useNavigate();

    // MODAL STATES
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({ open: false, id: '', name: '' });

    useEffect(() => {
        if (serverId) fetchChannels(serverId);
    }, [serverId, fetchChannels]);

    const handleCreate = async (name: string) => {
        await createChannel(serverId, { name, type: 1 });
        setIsCreateOpen(false);
    };

    const handleConfirmDelete = async () => {
        await ChannelService.deleteChannel(deleteModal.id);
        setDeleteModal({ open: false, id: '', name: '' });
        fetchChannels(serverId);
        if (activeChannelId === deleteModal.id) navigate(`/channels/${serverId}`);
    };

    return (
        <div className="flex flex-col h-full">
            <header className="h-16 px-6 flex items-center justify-between border-b border-white/5">
                <h2 className="font-black italic tracking-tighter text-text-main uppercase">SUNUCU PANELİ</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-3 space-y-6">
                <section>
                    <div className="flex items-center justify-between px-2 mb-2 group">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-50">Metin Kanalları</span>
                        <button onClick={() => setIsCreateOpen(true)} className="text-text-muted hover:text-success transition-colors">
                            <Plus size={16} strokeWidth={4} />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => navigate(`/channels/${serverId}/${channel.id}`)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl group transition-all
                                    ${activeChannelId === channel.id ? 'bg-white/10 text-text-main shadow-lg' : 'text-text-muted hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Hash size={18} strokeWidth={activeChannelId === channel.id ? 4 : 2} className={activeChannelId === channel.id ? 'text-accent' : 'opacity-40'} />
                                    <span className={`font-bold text-sm ${activeChannelId === channel.id ? '' : 'opacity-80'}`}>
                                        {channel.name}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Settings size={14} className="hover:text-text-main cursor-pointer" />
                                    <Trash2 
                                        size={14} 
                                        className="hover:text-error cursor-pointer" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteModal({ open: true, id: channel.id, name: channel.name });
                                        }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* MODALLARI BURAYA EKLE */}
            <CreateChannelModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                onCreate={handleCreate} 
            />
            <DeleteChannelModal 
                isOpen={deleteModal.open} 
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleConfirmDelete}
                channelName={deleteModal.name}
            />
        </div>
    );
}