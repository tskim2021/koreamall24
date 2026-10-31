import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// 세션 ID를 localStorage에서 가져오거나 새로 생성
function getOrCreateSessionId(): string {
  const key = "coco_session_id";
  const expKey = "coco_session_exp";
  const now = Date.now();
  const sessionTimeout = 30 * 60 * 1000; // 30분

  const existing = localStorage.getItem(key);
  const exp = parseInt(localStorage.getItem(expKey) || "0", 10);

  if (existing && exp > now) {
    // 세션 만료 시간 갱신
    localStorage.setItem(expKey, String(now + sessionTimeout));
    return existing;
  }

  // 새 세션 생성
  const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(key, newId);
  localStorage.setItem(expKey, String(now + sessionTimeout));
  return newId;
}

export function usePageTracking() {
  const [location] = useLocation();
  const trackPageViewMutation = trpc.analytics.trackPageView.useMutation();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // 같은 경로 중복 추적 방지
    if (lastTrackedPath.current === location) return;
    lastTrackedPath.current = location;

    const sessionId = getOrCreateSessionId();

    // 봇/크롤러 제외
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) return;

    // 페이지뷰 추적 (fire-and-forget, 에러 무시)
    trackPageViewMutation.mutate({
      page: location,
      referrer: document.referrer || undefined,
      sessionId,
      userAgent: navigator.userAgent,
    });
  }, [location]);
}

export function useSearchTracking() {
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();

  return (keyword: string) => {
    if (!keyword.trim()) return;
    trackSearchMutation.mutate({ keyword: keyword.trim() });
  };
}
