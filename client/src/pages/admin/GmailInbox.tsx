import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mail, MailOpen, RefreshCw, Trash2, Reply, Send, Search,
  Inbox, AlertCircle, CheckCircle2, ExternalLink, Loader2,
  ChevronLeft, Star, Archive, MoreHorizontal, Paperclip,
} from "lucide-react";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return d.toLocaleDateString("ko-KR", { weekday: "short" });
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── 연결 안내 화면 ────────────────────────────────────────────────────────────
function ConnectGmail({ onConnect }: { onConnect: () => void }) {
  const getAuthUrlQuery = trpc.gmail.getAuthUrl.useQuery(
    { origin: window.location.origin },
    { enabled: false }
  );

  const handleConnect = async () => {
    const result = await getAuthUrlQuery.refetch();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <Mail className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Gmail 연동이 필요합니다</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          support@cocokusuri.com 계정의 Gmail을 연동하면<br />
          관리자 대시보드에서 메일을 읽고 답장할 수 있습니다.
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md text-sm text-amber-800">
        <p className="font-medium mb-1">연동 전 확인 사항</p>
        <ul className="list-disc list-inside space-y-1 text-amber-700">
          <li>Google Cloud Console에서 리디렉션 URI 등록 필요</li>
          <li>승인된 리디렉션 URI: <code className="bg-amber-100 px-1 rounded text-xs">{window.location.origin}/api/gmail/callback</code></li>
          <li>Gmail API 사용 설정 필요</li>
        </ul>
      </div>
      <Button
        onClick={handleConnect}
        className="bg-red-500 hover:bg-red-600 text-white gap-2"
        disabled={getAuthUrlQuery.isFetching}
      >
        {getAuthUrlQuery.isFetching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        Google 계정으로 연동하기
      </Button>
    </div>
  );
}

// ─── 메일 목록 아이템 ─────────────────────────────────────────────────────────
interface MessageItem {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  hasAttachment: boolean;
  labelIds: string[];
}

function MessageListItem({
  msg,
  isSelected,
  onClick,
}: {
  msg: MessageItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
      } ${!msg.isRead ? "bg-white" : "bg-gray-50/50"}`}
    >
      <div className="mt-1 flex-shrink-0">
        {msg.isRead ? (
          <MailOpen className="w-4 h-4 text-gray-400" />
        ) : (
          <Mail className="w-4 h-4 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${!msg.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
            {msg.fromEmail || msg.from}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(msg.date)}</span>
        </div>
        <div className={`text-sm truncate mt-0.5 ${!msg.isRead ? "font-medium text-gray-800" : "text-gray-600"}`}>
          {msg.subject}
        </div>
        <div className="text-xs text-gray-400 truncate mt-0.5">{stripHtml(msg.snippet)}</div>
        {msg.hasAttachment && (
          <Paperclip className="w-3 h-3 text-gray-400 mt-1" />
        )}
      </div>
    </div>
  );
}

// ─── 답장 폼 ──────────────────────────────────────────────────────────────────
function ReplyForm({
  msg,
  onSent,
  onCancel,
}: {
  msg: MessageItem;
  onSent: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const sendMutation = trpc.gmail.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("메일을 발송했습니다.");
      onSent();
    },
    onError: (e) => toast.error(`발송 실패: ${e.message}`),
  });

  const handleSend = () => {
    if (!body.trim()) return toast.error("내용을 입력해주세요.");
    const replySubject = msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
    sendMutation.mutate({
      to: msg.fromEmail || msg.from,
      subject: replySubject,
      body: body.replace(/\n/g, "<br>"),
      threadId: msg.threadId,
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="text-sm text-gray-500 mb-2">
        <span className="font-medium">받는 사람:</span> {msg.fromEmail || msg.from}
      </div>
      <div className="text-sm text-gray-500 mb-3">
        <span className="font-medium">제목:</span> {msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="답장 내용을 입력하세요..."
        className="min-h-[120px] bg-white text-sm"
        autoFocus
      />
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sendMutation.isPending}
          className="gap-1.5"
        >
          {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          발송
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}

// ─── 새 메일 작성 폼 ──────────────────────────────────────────────────────────
function ComposeForm({ onSent, onCancel }: { onSent: () => void; onCancel: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const sendMutation = trpc.gmail.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("메일을 발송했습니다.");
      onSent();
    },
    onError: (e) => toast.error(`발송 실패: ${e.message}`),
  });

  const handleSend = () => {
    if (!to.trim()) return toast.error("받는 사람을 입력해주세요.");
    if (!subject.trim()) return toast.error("제목을 입력해주세요.");
    if (!body.trim()) return toast.error("내용을 입력해주세요.");
    sendMutation.mutate({ to, subject, body: body.replace(/\n/g, "<br>") });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">받는 사람</label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="이메일 주소" className="text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">제목</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="메일 제목" className="text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">내용</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="메일 내용을 입력하세요..."
          className="min-h-[200px] text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSend} disabled={sendMutation.isPending} className="gap-1.5">
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          발송
        </Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function GmailInbox() {
  const [selectedMsg, setSelectedMsg] = useState<MessageItem | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeLabel, setActiveLabel] = useState<string[]>(["INBOX"]);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const utils = trpc.useUtils();

  // URL 파라미터에서 연동 결과 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      toast.success("Gmail 연동이 완료되었습니다!");
      window.history.replaceState({}, "", "/admin/gmail-inbox");
    }
    if (params.get("error")) {
      toast.error(`연동 오류: ${params.get("error")}`);
      window.history.replaceState({}, "", "/admin/gmail-inbox");
    }
  }, []);

  const connectedQuery = trpc.gmail.isConnected.useQuery(undefined, { retry: 1 });
  const unreadQuery = trpc.gmail.unreadCount.useQuery(undefined, {
    enabled: connectedQuery.data?.connected === true,
    refetchInterval: 60000,
  });

  const messagesQuery = trpc.gmail.listMessages.useQuery(
    { maxResults: 20, labelIds: activeLabel, pageToken, query: searchQuery || undefined },
    {
      enabled: connectedQuery.data?.connected === true,
      retry: 1,
    }
  );

  const trashMutation = trpc.gmail.trashMessage.useMutation({
    onSuccess: () => {
      toast.success("메일을 삭제했습니다.");
      setSelectedMsg(null);
      utils.gmail.listMessages.invalidate();
    },
    onError: (e) => toast.error(`삭제 실패: ${e.message}`),
  });

  const markUnreadMutation = trpc.gmail.markAsUnread.useMutation({
    onSuccess: () => {
      utils.gmail.listMessages.invalidate();
      utils.gmail.unreadCount.invalidate();
    },
  });

  const handleSelectMsg = (msg: MessageItem) => {
    setSelectedMsg(msg);
    setShowReply(false);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPageToken(undefined);
    setPageHistory([]);
  };

  const handleNextPage = () => {
    const next = messagesQuery.data?.nextPageToken;
    if (next) {
      setPageHistory((h) => [...h, pageToken ?? ""]);
      setPageToken(next);
    }
  };

  const handlePrevPage = () => {
    const prev = pageHistory[pageHistory.length - 1];
    setPageHistory((h) => h.slice(0, -1));
    setPageToken(prev || undefined);
  };

  const labelTabs = [
    { label: "받은 편지함", ids: ["INBOX"], icon: <Inbox className="w-4 h-4" /> },
    { label: "보낸 편지함", ids: ["SENT"], icon: <Send className="w-4 h-4" /> },
    { label: "중요", ids: ["STARRED"], icon: <Star className="w-4 h-4" /> },
    { label: "스팸", ids: ["SPAM"], icon: <AlertCircle className="w-4 h-4" /> },
  ];

  if (connectedQuery.isLoading) {
    return (
      <AdminLayout noPadding>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!connectedQuery.data?.connected) {
    return (
      <AdminLayout>
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Gmail 인박스</h1>
          <p className="text-sm text-gray-500 mt-1">support@cocokusuri.com</p>
        </div>
        <ConnectGmail onConnect={() => connectedQuery.refetch()} />
      </AdminLayout>
    );
  }

  const messages = (messagesQuery.data?.messages ?? []) as MessageItem[];

  return (
    <AdminLayout noPadding>
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-red-500" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Gmail 인박스</h1>
              <p className="text-xs text-gray-400">support@cocokusuri.com</p>
            </div>
            {(unreadQuery.data?.count ?? 0) > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2">
                {unreadQuery.data?.count}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowCompose(true)}
            >
              <Send className="w-3.5 h-3.5" />
              새 메일 작성
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                utils.gmail.listMessages.invalidate();
                utils.gmail.unreadCount.invalidate();
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${messagesQuery.isFetching ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 탭 + 검색 */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
          {labelTabs.map((tab) => (
            <button
              key={tab.ids.join(",")}
              onClick={() => {
                setActiveLabel(tab.ids);
                setPageToken(undefined);
                setPageHistory([]);
                setSelectedMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                JSON.stringify(activeLabel) === JSON.stringify(tab.ids)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="메일 검색..."
              className="h-7 text-xs w-48"
            />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleSearch}>
              <Search className="w-3.5 h-3.5" />
            </Button>
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-gray-500"
                onClick={() => { setSearchQuery(""); setSearchInput(""); }}
              >
                초기화
              </Button>
            )}
          </div>
        </div>

        {/* 본문 영역 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 메일 목록 */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
            {messagesQuery.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <MailOpen className="w-8 h-8" />
                <p className="text-sm">메일이 없습니다</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageListItem
                    key={msg.id}
                    msg={msg}
                    isSelected={selectedMsg?.id === msg.id}
                    onClick={() => handleSelectMsg(msg)}
                  />
                ))}
                {/* 페이지네이션 */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    disabled={pageHistory.length === 0}
                    onClick={handlePrevPage}
                  >
                    이전
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    disabled={!messagesQuery.data?.nextPageToken}
                    onClick={handleNextPage}
                  >
                    다음
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* 메일 본문 */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedMsg ? (
              <div className="p-6">
                {/* 메일 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{selectedMsg.subject}</h2>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div><span className="font-medium">보낸 사람:</span> {selectedMsg.from}</div>
                      <div><span className="font-medium">받는 사람:</span> {selectedMsg.to}</div>
                      <div><span className="font-medium">날짜:</span> {selectedMsg.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => setShowReply(!showReply)}
                    >
                      <Reply className="w-3.5 h-3.5" />
                      답장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => markUnreadMutation.mutate({ messageId: selectedMsg.id })}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      읽지 않음
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("이 메일을 삭제하시겠습니까?")) {
                          trashMutation.mutate({ messageId: selectedMsg.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>

                <hr className="border-gray-200 mb-4" />

                {/* 답장 폼 */}
                {showReply && (
                  <div className="mb-4">
                    <ReplyForm
                      msg={selectedMsg}
                      onSent={() => {
                        setShowReply(false);
                        utils.gmail.listMessages.invalidate();
                      }}
                      onCancel={() => setShowReply(false)}
                    />
                  </div>
                )}

                {/* 메일 본문 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {selectedMsg.body ? (
                    <iframe
                      srcDoc={selectedMsg.body}
                      className="w-full min-h-[400px] border-0"
                      sandbox="allow-same-origin"
                      title="메일 본문"
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        try {
                          const height = iframe.contentDocument?.body?.scrollHeight;
                          if (height) iframe.style.height = `${height + 32}px`;
                        } catch {}
                      }}
                    />
                  ) : (
                    <div className="p-4 text-sm text-gray-500 whitespace-pre-wrap">
                      {selectedMsg.snippet}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <MailOpen className="w-12 h-12" />
                <p className="text-sm">메일을 선택하면 내용이 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 새 메일 작성 다이얼로그 */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              새 메일 작성
            </DialogTitle>
          </DialogHeader>
          <ComposeForm
            onSent={() => {
              setShowCompose(false);
              utils.gmail.listMessages.invalidate();
            }}
            onCancel={() => setShowCompose(false)}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
