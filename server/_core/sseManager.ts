/**
 * SSE (Server-Sent Events) Manager
 * 사용자별 실시간 알림 스트림을 관리합니다.
 */
import type { Response } from 'express';

interface SSEClient {
  userId: number;
  res: Response;
}

// 연결된 SSE 클라이언트 목록
const clients: SSEClient[] = [];

/**
 * 새 SSE 클라이언트를 등록합니다.
 */
export function addSSEClient(userId: number, res: Response): void {
  clients.push({ userId, res });
  console.log(`[SSE] Client connected: userId=${userId}, total=${clients.length}`);
}

/**
 * SSE 클라이언트를 제거합니다.
 */
export function removeSSEClient(userId: number, res: Response): void {
  const idx = clients.findIndex(c => c.userId === userId && c.res === res);
  if (idx !== -1) {
    clients.splice(idx, 1);
    console.log(`[SSE] Client disconnected: userId=${userId}, total=${clients.length}`);
  }
}

/**
 * 특정 사용자에게 SSE 알림을 전송합니다.
 */
export function notifyUserSSE(
  userId: number,
  data: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }
): void {
  const userClients = clients.filter(c => c.userId === userId);
  if (userClients.length === 0) return;

  const payload = JSON.stringify({
    ...data,
    timestamp: Date.now(),
  });

  for (const client of userClients) {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error(`[SSE] Failed to send to userId=${userId}:`, err);
    }
  }
}

/**
 * 모든 사용자에게 SSE 알림을 전송합니다 (broadcast).
 */
export function broadcastSSE(data: {
  type: string;
  title: string;
  message: string;
  link?: string;
}): void {
  const payload = JSON.stringify({
    ...data,
    timestamp: Date.now(),
  });

  for (const client of [...clients]) {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error(`[SSE] Broadcast failed for userId=${client.userId}:`, err);
    }
  }
}

/**
 * 현재 연결된 클라이언트 수를 반환합니다.
 */
export function getSSEClientCount(): number {
  return clients.length;
}
