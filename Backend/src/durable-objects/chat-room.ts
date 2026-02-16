// src/durable-objects/chat-room.ts
import { Env } from '../types';

interface ConnectedUser {
  id: string;
  username: string;
}

export class ChatRoom {
  state: DurableObjectState;
  sessions: Map<WebSocket, ConnectedUser>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // =====================================================
    // 🔌 WEBSOCKET CONNECT
    // =====================================================
    if (action === "connect") {
      // Upgrade Header Kontrolü (Case-Insensitive)
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }

      const userId = url.searchParams.get("userId") || "anon";
      const username = url.searchParams.get("username") || "Kullanıcı";

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      this.sessions.set(server, { id: userId, username });

      server.addEventListener("message", (event) => {
        try {
          if (typeof event.data !== "string") return;
          const msg = JSON.parse(event.data);

          // Typing Indicator Logic
          if (msg.type === "TYPING_START" || msg.type === "TYPING_STOP") {
            this.broadcastExcept(server, {
              type: "TYPING_UPDATE",
              payload: {
                user_id: userId,
                username,
                is_typing: msg.type === "TYPING_START"
              }
            });
          }
        } catch (e) {
             console.error("WS Message Error", e);
        }
      });

      server.addEventListener("close", () => {
        this.sessions.delete(server);
      });

      server.addEventListener("error", () => {
        this.sessions.delete(server);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // =====================================================
    // 📢 BROADCAST MESSAGE (HTTP POST)
    // =====================================================
    if (action === "broadcast" && request.method === "POST") {
      const body = await request.text();

      for (const ws of this.sessions.keys()) {
        try {
          ws.send(body);
        } catch {
          this.sessions.delete(ws);
        }
      }

      return new Response("OK");
    }

    return new Response("Not found", { status: 404 });
  }

  // Gönderen hariç herkese yolla (Typing için)
  private broadcastExcept(sender: WebSocket, message: any) {
    const data = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      if (ws !== sender) {
        try {
          ws.send(data);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}