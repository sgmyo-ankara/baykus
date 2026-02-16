import { api } from './axios';

export const MessageService = {
    async getChannelMessages(channelId: string) {
        const res = await api.get(`/api/channels/${channelId}/messages`);
        return res.data;
    },

    async sendMessage(
        channelId: string,
        content: string,
        attachment?: { path: string; file_size: number; content_type: string }
    ) {
        const res = await api.post(`/api/channels/${channelId}/messages`, {
            content,
            attachment
        });
        return res.data;
    },

    async updateMessage(messageId: string, content: string) {
        const res = await api.put(`/api/messages/${messageId}`, { content });
        return res.data;
    },

    async deleteMessage(messageId: string) {
        const res = await api.delete(`/api/messages/${messageId}`);
        return res.data;
    }
};
