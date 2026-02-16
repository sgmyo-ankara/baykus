// src/index.ts
import { authenticate } from './middleware/auth';

// --- HANDLER IMPORTLARI ---
import { syncUser } from './handlers/auth-endpoint';
import { updateProfile } from './handlers/user-settings-endpoint'; 
import { createServer } from './handlers/servers-endpoint';
import { updateServerSettings, deleteServer } from './handlers/server-settings-endpoint';
import { sendMessage } from './handlers/messages-endpoint';
import { createDM } from './handlers/dm-endpoint';
import { sendDMMessage } from './handlers/dm-messages-endpoint';
import { uploadFile } from './handlers/upload-endpoint';
import { getFile } from './handlers/cdn-endpoint'; 
// [GÜNCELLEME] checkFriendStatus eklendi
import { sendFriendRequest, respondToFriendRequest, getFriends, markAsSeen, checkFriendStatus } from './handlers/friends-endpoint'; 
import { getMessages, getUserServers, getServerChannels, getUserDMs } from './handlers/query-endpoint';
import { createInvite, joinServer } from './handlers/invites-endpoint';
import { getRoles, createRole, updateRole, deleteRole, assignRole, updateChannelOverride } from './handlers/roles-endpoint';
import { createChannel, updateChannel, deleteChannel } from './handlers/channels-endpoint';
import { getServerMembers, kickMember } from './handlers/members-endpoint';
import { editMessage, deleteMessage, toggleReaction } from './handlers/message-actions-endpoint';
import { banMember, unbanMember, getBans, leaveServer } from './handlers/moderation-endpoint';
import { searchChannelMessages, searchDMMessages } from './handlers/search-endpoint';

import { Env } from './types';
import { json, error } from './utils/response';

// Durable Object Export
export { ChatRoom } from './durable-objects/chat-room';
export { Presence } from './durable-objects/presence'; // [GÜNCELLEME] Presence Eklendi

// [GÜNCELLEME] Sharding Yardımcısı
function getShardName(userId: string): string {
    const lastChar = userId.slice(-1);
    if (/[0-9]/.test(lastChar)) return `shard-${lastChar}`;
    return `shard-0`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 1. CORS Preflight Kontrolü (HER ZAMAN İLK SIRADA)
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection",
        },
      });
    }

    // --- 🛡️ 2. AKILLI RATE LIMITING ENTEGRASYONU ---
    // [FIX] WebSocket isteklerini (/api/ws ve /api/presence) Rate Limiter'dan hariç tutuyoruz.
    if (path.startsWith("/api/") && path !== "/api/ws" && path !== "/api/presence") {
      // A) Kimlik Tespiti
      const userForLimit = await authenticate(request, env);

      // B) Anahtar Belirleme
      let limitKey = "";
      if (userForLimit) {
        limitKey = `user:${userForLimit.uid}`;
      } else {
        limitKey = `ip:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
      }

      // C) Limiti Uygula
      try {
        const { success } = await env.RATE_LIMITER.limit({ key: limitKey });
        
        if (!success) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Çok hızlı işlem yapıyorsunuz! Lütfen yavaşlayın. 🐢"
          }), { status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
      } catch (e) {
        console.warn("Rate Limiter hatası (Fail Open):", e);
      }
    }

    // =========================================================================
    // --- 3. CHAT WEBSOCKET BAĞLANTISI (/api/ws) ---
    // =========================================================================
    
    const upgradeHeader = request.headers.get("Upgrade");
    const isWebSocket = upgradeHeader && upgradeHeader.toLowerCase() === "websocket";

    if (path === "/api/ws" && isWebSocket) {
      try {
        const token = url.searchParams.get("token");
        if (!token) return new Response("Token required", { status: 401 });

        const dummyReq = new Request(url.toString(), { headers: { "Authorization": `Bearer ${token}` } });
        const user = await authenticate(dummyReq, env);
        
        if (!user) {
            console.error("[WS] Auth Failed: Geçersiz Token");
            return new Response("Unauthorized", { status: 401 });
        }

        const channelId = url.searchParams.get("channelId");
        if (!channelId) return new Response("Channel ID required", { status: 400 });

        if (!env.CHAT_ROOM) {
            console.error("[WS] CRITICAL: env.CHAT_ROOM (Durable Object) tanımlı değil!");
            return new Response("Service Unavailable", { status: 503 });
        }

        const userInfo = await env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(user.uid).first<{username: string}>();
        const username = userInfo?.username || "Kullanıcı";

        const id = env.CHAT_ROOM.idFromName(channelId);
        const stub = env.CHAT_ROOM.get(id);

        const newUrl = new URL(request.url);
        newUrl.pathname = "/websocket";
        
        newUrl.searchParams.set("action", "connect");
        newUrl.searchParams.set("userId", user.uid);
        newUrl.searchParams.set("username", username);
        
        // WebSocket Header Fix
        const headers = new Headers(request.headers);
        headers.set("Upgrade", "websocket");
        headers.set("Connection", "Upgrade");

        const doRequest = new Request(newUrl.toString(), {
            method: "GET",
            headers: headers
        });
        
        return await stub.fetch(doRequest);

      } catch (wsErr: any) {
        console.error("[WS Handshake Error]:", wsErr);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // =========================================================================
    // --- 4. PRESENCE WEBSOCKET BAĞLANTISI (/api/presence) - YENİ ---
    // =========================================================================
    if (path === "/api/presence" && isWebSocket) {
        try {
            const token = url.searchParams.get("token");
            if (!token) return new Response("Token required", { status: 401 });

            // Auth
            const dummyReq = new Request(url.toString(), { headers: { "Authorization": `Bearer ${token}` } });
            const user = await authenticate(dummyReq, env);
            if (!user) return new Response("Unauthorized", { status: 401 });

            // Kullanıcının tercih ettiği statü (1: Online, 3: DND vb.)
            const status = url.searchParams.get("status") || "1";

            if (!env.PRESENCE) {
                console.error("[Presence] CRITICAL: env.PRESENCE tanımlı değil!");
                return new Response("Service Unavailable", { status: 503 });
            }

            // SHARDING: Kullanıcıyı doğru DO'ya yönlendir (0-9)
            const shardName = getShardName(user.uid);
            const id = env.PRESENCE.idFromName(shardName);
            const stub = env.PRESENCE.get(id);

            const newUrl = new URL(request.url);
            newUrl.pathname = "/presence"; // Loglar için temiz path
            newUrl.searchParams.set("action", "connect");
            newUrl.searchParams.set("userId", user.uid);
            newUrl.searchParams.set("status", status);

            // WebSocket Header Fix
            const headers = new Headers(request.headers);
            headers.set("Upgrade", "websocket");
            headers.set("Connection", "Upgrade");

            return await stub.fetch(new Request(newUrl.toString(), { method: "GET", headers }));

        } catch (e) {
            console.error("[Presence WS Error]", e);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    // --- 5. CDN / DOSYA GÖRÜNTÜLEME ---
    const cdnMatch = path.match(/^\/cdn\/(.+)$/);
    if (cdnMatch && method === "GET") {
        return await getFile(request, env, cdnMatch[1]);
    }

    // --- 6. API HANDLERS ---
    const authenticateRequest = async () => {
      const user = await authenticate(request, env);
      if (!user) throw new Error("UNAUTHORIZED");
      return user;
    };

    try {
      // --- AUTH & PROFİL ---
      if (path === "/api/auth/sync" && method === "POST") {
        const user = await authenticateRequest();
        return await syncUser(request, env, user);
      }

      if (path === "/api/users/me" && method === "PATCH") {
        const user = await authenticateRequest();
        return await updateProfile(request, env, user);
      }

      // --- SUNUCU YÖNETİMİ ---
      const serverSettingsMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)$/);
      if (serverSettingsMatch) {
        const user = await authenticateRequest();
        if (method === "PATCH") return await updateServerSettings(request, env, user, serverSettingsMatch[1]);
        if (method === "DELETE") return await deleteServer(request, env, user, serverSettingsMatch[1]);
      }

      if (path === "/api/servers" && method === "POST") {
        const user = await authenticateRequest();
        return await createServer(request, env, user);
      }

      if (path === "/api/users/me/servers" && method === "GET") {
        const user = await authenticateRequest();
        return await getUserServers(request, env, user);
      }

      const leaveMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/leave$/);
      if (leaveMatch && method === "POST") {
        const user = await authenticateRequest();
        return await leaveServer(request, env, user, leaveMatch[1]);
      }

      // --- MODERASYON ---
      const bansMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/bans$/);
      if (bansMatch) {
        const user = await authenticateRequest();
        if (method === "GET") return await getBans(request, env, user, bansMatch[1]);
        if (method === "POST") return await banMember(request, env, user, bansMatch[1]);
      }

      const unbanMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/bans\/([a-zA-Z0-9\-]+)$/);
      if (unbanMatch && method === "DELETE") {
        const user = await authenticateRequest();
        return await unbanMember(request, env, user, unbanMatch[1], unbanMatch[2]);
      }

      // --- KANAL YÖNETİMİ ---
      const serverChannelsMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/channels$/);
      if (serverChannelsMatch) {
        const user = await authenticateRequest();
        if (method === "GET") return await getServerChannels(request, env, user, serverChannelsMatch[1]);
        if (method === "POST") return await createChannel(request, env, user, serverChannelsMatch[1]);
      }

      const channelActionMatch = path.match(/^\/api\/channels\/([a-zA-Z0-9]+)$/);
      if (channelActionMatch) {
        const user = await authenticateRequest();
        if (method === "PUT") return await updateChannel(request, env, user, channelActionMatch[1]);
        if (method === "DELETE") return await deleteChannel(request, env, user, channelActionMatch[1]);
      }

      // --- ÜYE & ROL YÖNETİMİ ---
      const membersMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/members$/);
      if (membersMatch && method === "GET") {
        const user = await authenticateRequest();
        return await getServerMembers(request, env, user, membersMatch[1]);
      }

      const kickMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/members\/([a-zA-Z0-9\-]+)$/);
      if (kickMatch && method === "DELETE") {
        const user = await authenticateRequest();
        return await kickMember(request, env, user, kickMatch[1], kickMatch[2]);
      }

      // ⚠️ [DÜZELTME] EKSİK OLAN ROL LİSTELEME EKLENDİ ⚠️
      // Bu endpoint, sunucudaki rolleri listeler.
      const serverRolesMatch = path.match(/^\/api\/servers\/([a-zA-Z0-9]+)\/roles$/);
      if (serverRolesMatch && method === "GET") {
        const user = await authenticateRequest();
        return await getRoles(request, env, user, serverRolesMatch[1]);
      }

      if (path === "/api/roles" && method === "POST") {
        const user = await authenticateRequest();
        return await createRole(request, env, user);
      }

      const roleIdMatch = path.match(/^\/api\/roles\/([a-zA-Z0-9]+)$/);
      if (roleIdMatch) {
        const user = await authenticateRequest();
        if (method === "PUT") return await updateRole(request, env, user, roleIdMatch[1]);
        if (method === "DELETE") return await deleteRole(request, env, user, roleIdMatch[1]);
      }

      if (path === "/api/members/role" && method === "POST") {
        const user = await authenticateRequest();
        return await assignRole(request, env, user);
      }

      const channelPermMatch = path.match(/^\/api\/channels\/([a-zA-Z0-9]+)\/permissions$/);
      if (channelPermMatch && method === "POST") {
        const user = await authenticateRequest();
        return await updateChannelOverride(request, env, user, channelPermMatch[1]);
      }

      // --- MESAJLAŞMA & ARAMA ---
      const channelMsgMatch = path.match(/^\/api\/channels\/([a-zA-Z0-9]+)\/messages$/);
      if (channelMsgMatch) {
        const user = await authenticateRequest();
        if (method === "POST") return await sendMessage(request, env, user, channelMsgMatch[1]);
        if (method === "GET") return await getMessages(request, env, user, channelMsgMatch[1], false);
      }

      const channelSearchMatch = path.match(/^\/api\/channels\/([a-zA-Z0-9]+)\/search$/);
      if (channelSearchMatch && method === "GET") {
        const user = await authenticateRequest();
        return await searchChannelMessages(request, env, user, channelSearchMatch[1]);
      }

      // --- MESAJ AKSİYONLARI ---
      const messageActionMatch = path.match(/^\/api\/messages\/([0-9]+)$/);
      if (messageActionMatch) {
        const user = await authenticateRequest();
        if (method === "PUT") return await editMessage(request, env, user, messageActionMatch[1]);
        if (method === "DELETE") return await deleteMessage(request, env, user, messageActionMatch[1]);
      }

      const reactionMatch = path.match(/^\/api\/messages\/([0-9]+)\/reactions$/);
      if (reactionMatch && method === "PUT") {
        const user = await authenticateRequest();
        return await toggleReaction(request, env, user, reactionMatch[1]);
      }

      // --- DM / GRUP ---
      if (path === "/api/dm" && method === "POST") {
        const user = await authenticateRequest();
        return await createDM(request, env, user);
      }

      if (path === "/api/users/me/dms" && method === "GET") {
        const user = await authenticateRequest();
        return await getUserDMs(request, env, user);
      }

      const dmMsgMatch = path.match(/^\/api\/dm\/([a-zA-Z0-9\-]+)\/messages$/);
      if (dmMsgMatch) {
        const user = await authenticateRequest();
        if (method === "POST") return await sendDMMessage(request, env, user, dmMsgMatch[1]);
        if (method === "GET") return await getMessages(request, env, user, dmMsgMatch[1], true);
      }

      const dmSearchMatch = path.match(/^\/api\/dm\/([a-zA-Z0-9\-]+)\/search$/);
      if (dmSearchMatch && method === "GET") {
        const user = await authenticateRequest();
        return await searchDMMessages(request, env, user, dmSearchMatch[1]);
      }

      // --- DOSYA YÜKLEME ---
      if (path === "/api/upload" && method === "POST") {
        const user = await authenticateRequest();
        return await uploadFile(request, env, user);
      }

      // --- ARKADAŞLIK & PRESENCE ---
      if (path.startsWith("/api/friends")) {
        const user = await authenticateRequest();
        if (path === "/api/friends/request" && method === "POST") return await sendFriendRequest(request, env, user);
        if (path === "/api/friends/respond" && method === "PUT") return await respondToFriendRequest(request, env, user);
        if (path === "/api/friends" && method === "GET") return await getFriends(request, env, user);
        if (path === "/api/friends/seen" && method === "PUT") return await markAsSeen(request, env, user);
        
        // [GÜNCELLEME] Polling Endpoint (SQL'e gitmez, sadece DO'ya sorar)
        if (path === "/api/friends/status" && method === "POST") return await checkFriendStatus(request, env, user);
      }

      // --- DAVET SİSTEMİ ---
      if (path === "/api/invites" && method === "POST") {
        const user = await authenticateRequest();
        return await createInvite(request, env, user);
      }

      const joinMatch = path.match(/^\/api\/invites\/([a-zA-Z0-9]+)\/join$/);
      if (joinMatch && method === "POST") {
        const user = await authenticateRequest();
        return await joinServer(request, env, user, joinMatch[1]);
      }

      // --- STATİK / HEALTH ---
      if (path === "/") {
        return json({ 
          status: "Baykuşun diyarını hoşgeldin", 
          version: "2.4.3 - FINAL COMPLETE",
          database: "v8.4 Final Diamond"
        });
      }

      return error("Endpoint bulunamadı", 404);

    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") return error("Yetkisiz erişim", 401);
      console.error("Router Error:", err);
      return error("Sunucu hatası", 500, err.message);
    }
  },
};