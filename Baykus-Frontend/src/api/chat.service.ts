import { api } from './axios';

export const ChatAPI = {
    // SUNUCU (Server)
    getServerMessages: (channelId: string) => api.get(`/api/channels/${channelId}/messages`),
    sendServerMessage: (channelId: string, content: string) => api.post(`/api/channels/${channelId}/messages`, { content }),

    // DM (Private)
    getDMMessages: (dmChannelId: string) => api.get(`/api/dm/${dmChannelId}/messages`),
    sendDMMessage: (dmChannelId: string, content: string) => api.post(`/api/dm/${dmChannelId}/messages`, { content })
};