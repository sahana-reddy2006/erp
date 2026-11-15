import type { Server as HttpServer } from 'node:http';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { erpStore } from './store.ts';
import type {
  ConnectedDevice,
  DevicePlatform,
  RealtimeEventType,
  RealtimeMessage,
  UserRole,
} from '../src/types/erp.ts';

interface AuthenticatedClient {
  ws: WebSocket;
  connectionId: string;
  familyId: string;
  userId: string;
  userName: string;
  role: UserRole;
  platform: DevicePlatform;
  connectedAt: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'kinledger-dev-jwt-secret-change-in-prod';

class RealtimeSyncHub {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, AuthenticatedClient>();

  attach(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        const rawPlatform = url.searchParams.get('platform') || 'web';
        const platform: DevicePlatform =
          rawPlatform === 'ios' || rawPlatform === 'android' ? rawPlatform : 'web';

        if (!token) {
          ws.close(4001, 'Missing authentication token');
          return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          familyId: string;
          name: string;
          role: UserRole;
        };

        const connectionId = crypto.randomUUID();
        const client: AuthenticatedClient = {
          ws,
          connectionId,
          familyId: decoded.familyId,
          userId: decoded.userId,
          userName: decoded.name,
          role: decoded.role,
          platform,
          connectedAt: new Date().toISOString(),
        };

        this.clients.set(connectionId, client);

        // Send initial presence snapshot to the connecting client
        const initMsg: RealtimeMessage<ConnectedDevice[]> = {
          type: 'sync:init',
          payload: this.getConnectedDevices(decoded.familyId),
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(initMsg));

        // Broadcast updated presence list to the family room
        this.broadcast(decoded.familyId, 'presence:updated', this.getConnectedDevices(decoded.familyId), decoded.name, platform);

        ws.on('message', (raw) => {
          try {
            const parsed = JSON.parse(raw.toString()) as { type?: string };
            if (parsed.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            }
          } catch {
            // Ignore malformed client frames
          }
        });

        ws.on('close', () => {
          this.clients.delete(connectionId);
          this.broadcast(
            decoded.familyId,
            'presence:updated',
            this.getConnectedDevices(decoded.familyId),
            decoded.name,
            platform
          );
        });
      } catch {
        ws.close(4002, 'Invalid authentication token');
      }
    });
  }

  getConnectedDevices(familyId: string): ConnectedDevice[] {
    const list: ConnectedDevice[] = [];
    for (const c of this.clients.values()) {
      if (c.familyId === familyId && c.ws.readyState === WebSocket.OPEN) {
        list.push({
          connectionId: c.connectionId,
          userId: c.userId,
          userName: c.userName,
          role: c.role,
          platform: c.platform,
          connectedAt: c.connectedAt,
        });
      }
    }
    return list;
  }

  broadcast<T>(
    familyId: string,
    type: RealtimeEventType,
    payload: T,
    actorName?: string,
    sourcePlatform?: DevicePlatform
  ) {
    const message: RealtimeMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      actorName,
      sourcePlatform,
    };
    const serialized = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.familyId === familyId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }

  async sendExpoPushNotifications(
    familyId: string,
    title: string,
    body: string,
    data: Record<string, unknown>,
    excludeUserId?: string
  ) {
    try {
      const tokens = await erpStore.listFamilyMemberPushTokens(familyId, excludeUserId);
      const validTokens = tokens.filter(
        (t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
      );
      if (validTokens.length === 0) return;

      const messages = validTokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data,
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.warn('[Expo Push] Failed to dispatch push notification:', (err as Error).message);
    }
  }
}

export const realtimeHub = new RealtimeSyncHub();
export { JWT_SECRET };
