import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export interface SSENotification {
  type: string;
  title: string;
  message: string;
  link?: string;
  timestamp: number;
}

/**
 * SSE 실시간 알림 훅
 * - 로그인 상태일 때만 /api/notifications/stream에 연결
 * - 새 알림 수신 시 onNotification 콜백 호출
 * - 언마운트 시 자동으로 연결 해제
 */
export function useSSENotifications(
  onNotification: (notif: SSENotification) => void
) {
  const { user } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const utils = trpc.useUtils();
  const onNotifRef = useRef(onNotification);
  onNotifRef.current = onNotification;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/notifications/stream", {
      withCredentials: true,
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSENotification & { type: string };
        // 연결 확인 메시지는 무시
        if (data.type === "connected") return;
        // 미읽음 카운트 갱신
        utils.notification.unreadCount.invalidate();
        // 알림 목록 갱신
        utils.notification.list.invalidate();
        // 콜백 호출
        onNotifRef.current(data);
      } catch {
        // JSON 파싱 실패 무시
      }
    };

    es.onerror = () => {
      // 연결 오류 시 30초 후 재연결
      es.close();
      esRef.current = null;
      setTimeout(() => {
        if (user) connect();
      }, 30000);
    };

    esRef.current = es;
  }, [user, utils]);

  useEffect(() => {
    if (!user) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [user, connect]);
}
