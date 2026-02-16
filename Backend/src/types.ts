// src/types.ts
// =====================================================
// BAYKUŞ PROJESİ - TİP TANIMLARI (v8.9.1 - PATCHED)
// =====================================================

// 1. ALTYAPI
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  PRESENCE: DurableObjectNamespace; 
  RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

// 2. AUTH
// [DÜZELTME] username ve avatar_url eklendi.
export interface UserPayload {
  uid: string;
  email: string;
  picture?: string; // Auth provider'dan geliyorsa
  username?: string; // [EKLENDİ] Endpoint'lerde kullanılıyor
  avatar_url?: string; // [EKLENDİ] Endpoint'lerde kullanılıyor
  exp?: number;
}

export interface UserSyncRequest {
  username?: string;
  picture?: string;
}

// 3. DATABASE MODELLERİ
export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  status: number;
  created_at: number;
}

export interface Server {
  id: string;
  name: string;
  owner_id: string;
  icon_url: string | null;
  created_at: number;
}

export interface Role {
  id: string;
  server_id: string;
  name: string;
  permissions: number;
  color: string | null;
  position: number;
  created_at: number;
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  role_id: string | null;
  joined_at: number;
}

export interface ServerBan {
  server_id: string;
  user_id: string;
  reason: string | null;
  banned_by: string;
  created_at: number;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: number;
  created_at: number;
}

export interface ChannelPermission {
  channel_id: string;
  role_id?: string;
  user_id?: string;
  allow: number;
  deny: number;
}

export interface Message {
  id: string;
  server_id: string;
  channel_id: string;
  author_id: string;
  content: string;
  internal_counter: number;
  reply_to_id: string | null;
  has_attachment: boolean | number;
  is_deleted: boolean | number;
  is_edited: boolean | number;
  created_at: number;
  attachment?: Attachment | null;
}

export interface Attachment {
  id: string;
  message_id: string;
  path: string;
  file_size: number;
  content_type: string;
  created_at: number;
}

export interface DMChannel {
  id: string;
  type: 1 | 2;
  owner_id: string | null;
  name: string | null;
  icon_url: string | null;
  created_at: number;
  member_count?: number;
}

export interface DMMember {
  dm_channel_id: string;
  user_id: string;
  joined_at: number;
}

export interface DMMessage {
  id: string;
  dm_channel_id: string;
  sender_id: string;
  content: string;
  internal_counter: number;
  reply_to_id: string | null;
  has_attachment: boolean | number;
  is_deleted: boolean | number;
  is_edited: boolean | number;
  created_at: number;
  attachment?: Attachment | null;
}

export interface Friend {
  friendship_id: string;
  user_1: string;
  user_2: string;
  status: number;
  is_seen: number;
  last_action_by: string;
  created_at: number;
  updated_at: number;
}

export interface Invite {
  code: string;
  server_id: string;
  inviter_id: string;
  channel_id: string;
  max_uses: number;
  uses: number;
  expires_at: number;
  created_at: number;
}

// 4. API İSTEK TİPLERİ

// Profil
export interface UpdateProfileRequest {
  username?: string;
  avatar_url?: string;
}

// Sunucu & Kanal
export interface CreateServerRequest {
  name: string;
  icon_url?: string;
}

export interface CreateChannelRequest {
  name: string;
  type?: number;
}

export interface UpdateChannelRequest {
  name?: string;
}

// Davet
export interface CreateInviteRequest {
  server_id: string;
  channel_id?: string;
  max_uses?: number;     
  expires_in?: number; 
}

// Mesajlaşma
export interface AttachmentRequest {
  path: string;
  file_size: number;
  content_type: string;
}

export interface SendMessageRequest {
  content: string;
  reply_to_id?: string;
  attachment?: AttachmentRequest;
}

export interface EditMessageRequest {
  content: string;
}

export interface ReactionRequest {
  emoji: string;
}

// DM İşlemleri
export interface CreateDMRequest {
  type?: 1 | 2;
  target_user_id?: string; 
  group_name?: string;
  user_ids?: string[];
}

export interface SendDMRequest {
  content: string;
  reply_to_id?: string;
  attachment?: AttachmentRequest;
}

// Arkadaşlık
export interface FriendRequestPayload {
  target_username: string;
}

export interface FriendRespondPayload {
  friendship_id: string;
  action: 'ACCEPT' | 'REJECT' | 'BLOCK' | 'REMOVE';
}

// Polling
export interface CheckFriendStatusRequest {
  user_ids: string[];
}

// Rol Yönetimi
export interface CreateRoleRequest {
  server_id: string;
  name: string;
  permissions?: number;
  color?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: number;
  color?: string;
  position?: number;
}

export interface AssignRoleRequest {
  server_id: string;
  target_user_id: string;
  role_id: string | null;
}

export interface UpdateChannelOverrideRequest {
  role_id?: string;
  user_id?: string;
  allow: number;
  deny: number;
}

// Moderasyon
export interface BanMemberRequest {
  user_id: string;
  reason?: string;
}