import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, User, Minimize2, HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/../../shared/utils/formatPrice";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: Array<{
    id: number;
    name: string;
    price: string;
    imageUrl: string | null;
    stock: number;
    isInStock: boolean;
  }>;
};

export default function FloatingChatbot() {
  // 챗봇 임시 숨김
  return null;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFaqPanel, setShowFaqPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();
  const [showPulse, setShowPulse] = useState(true);

  // 등장 애니메이션 상태: 'hidden' → 2초 후 'bouncing' → 완료 후 'visible'
  const [appearState, setAppearState] = useState<"hidden" | "bouncing" | "visible">("hidden");

  // 페이지 로딩 완료 후 2초 뒤에 bounce 등장
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppearState("bouncing");
      // bounce 애니메이션 지속시간(700ms) 후 visible로 전환
      setTimeout(() => setAppearState("visible"), 700);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Generate stable session ID
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem("chatbot_session_id");
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("chatbot_session_id", newId);
    return newId;
  });

  // Extract product ID from URL if on product page
  const productIdMatch = location.match(/\/product\/(\d+)/);
  const productId = productIdMatch ? parseInt(productIdMatch[1]) : undefined;

  // Get page context
  const getPageContext = useCallback(() => {
    if (location.startsWith("/cart")) return "cart";
    if (location.startsWith("/mypage")) return "mypage";
    if (location.startsWith("/checkout")) return "checkout";
    if (location.startsWith("/search")) return "search";
    if (location.startsWith("/category")) return "category";
    return "home";
  }, [location]);

  const utils = trpc.useUtils();
  // Get chatbot settings from admin
  const { data: chatbotSettings } = trpc.chatbot.getSettings.useQuery(undefined, {
    staleTime: 60000,
  });

  // Check if chatbot is enabled
  const isEnabled = chatbotSettings?.CHATBOT_ENABLED !== "false";

  // Get welcome message from settings
  const welcomeMessage = chatbotSettings?.WELCOME_MESSAGE || "こんにちは！ココくすりのお買い物をサポートします。お気軽にご質問ください。";

  // Get suggested questions
  const suggestionsInput = useMemo(() => ({ page: getPageContext(), productId }), [getPageContext, productId]);
  const { data: suggestions = [] } = trpc.chatbot.getSuggestions.useQuery(
    suggestionsInput,
    { enabled: isOpen && messages.length === 0 }
  );

  // Get active FAQs for quick access panel
  const { data: activeFaqs = [] } = trpc.chatbot.getActiveFaqs.useQuery(undefined, {
    enabled: isOpen,
    staleTime: 60000,
  });

  // Chat mutation
  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: async (data) => {
      // Check if response contains [PRODUCT_SEARCH: keyword]
      const productSearchMatch = data.response.match(/\[PRODUCT_SEARCH:\s*(.+?)\]/);
      let products: any[] = [];
      
      if (productSearchMatch) {
        const keyword = productSearchMatch[1].trim();
        try {
          const searchResult = await utils.chatbot.searchProducts.fetch({ query: keyword, limit: 5 });
          products = searchResult;
        } catch (e) {
          console.warn('[Chatbot] Failed to search products:', e);
        }
      }
      
      // Remove [PRODUCT_SEARCH: ...] tag from display
      const cleanedResponse = data.response.replace(/\[PRODUCT_SEARCH:\s*.+?\]/g, '').trim();
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: cleanedResponse, products: products.length > 0 ? products : undefined },
      ]);
      setIsTyping(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "申し訳ございません。エラーが発生しました。もう一度お試しください。",
        },
      ]);
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Hide pulse after first open
  useEffect(() => {
    if (isOpen) setShowPulse(false);
  }, [isOpen]);

  const handleSend = (content?: string) => {
    const text = content || input.trim();
    if (!text || isTyping) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setShowFaqPanel(false);

    chatMutation.mutate({
      messages: newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      context: {
        currentPage: getPageContext(),
        productId,
      },
      sessionId,
    });
  };

  const handleFaqClick = (faq: any) => {
    const question = faq.questionJa || faq.questionKo || "";
    if (question) {
      handleSend(question);
    }
    setShowFaqPanel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't show on admin pages
  if (location.startsWith("/admin")) return null;

  // Don't show if disabled
  if (!isEnabled) return null;

  const categoryLabels: Record<string, string> = {
    product: "商品",
    order_shipping: "注文・配送",
    payment: "お支払い",
    member_points: "会員・ポイント",
    other: "その他",
  };

  return (
    <>
      {/* bounce 등장 애니메이션 keyframe 정의 */}
      <style>{`
        @keyframes chatBounceIn {
          0%   { transform: translateY(120px); opacity: 0; }
          55%  { transform: translateY(-18px); opacity: 1; }
          75%  { transform: translateY(8px); }
          90%  { transform: translateY(-5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        .chat-bounce-in {
          animation: chatBounceIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-50 w-[calc(100vw-1rem)] sm:w-[360px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        style={{ bottom: 'calc(56px + 1rem + 3.5rem + 0.5rem)', right: '4px', height: 'min(520px, calc(100dvh - 120px))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">ココくすり AIアシスタント</p>
              <p className="text-[10px] text-muted-foreground">24時間対応</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeFaqs.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowFaqPanel(!showFaqPanel)}
                title="よくある質問"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setIsOpen(false);
                setMessages([]);
                setShowFaqPanel(false);
                // Reset session
                const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                sessionStorage.setItem("chatbot_session_id", newId);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* FAQ Panel (overlay) */}
        {showFaqPanel && activeFaqs.length > 0 && (
          <div className="absolute top-14 left-0 right-0 bottom-0 z-10 bg-background rounded-b-2xl overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">よくある質問</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFaqPanel(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {Object.entries(
                activeFaqs.reduce((acc: Record<string, any[]>, faq) => {
                  const cat = faq.category || "other";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(faq);
                  return acc;
                }, {})
              ).map(([category, faqs]) => (
                <div key={category}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {categoryLabels[category] || category}
                  </p>
                  {(faqs as any[]).map((faq: any) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFaqClick(faq)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors mb-1"
                    >
                      {faq.questionJa || faq.questionKo}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">
                  {welcomeMessage.split("。")[0]}。
                </p>
                <p className="text-xs text-muted-foreground">
                  {welcomeMessage.split("。").slice(1).join("。") || "お気軽にご質問ください。"}
                </p>
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full mt-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-2 max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_a]:text-primary [&_a]:underline">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  
                  {/* Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {msg.products.map((product) => (
                        <a
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                            <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                              {product.isInStock ? (
                                <span className="text-[10px] text-green-600 dark:text-green-400">在庫あり</span>
                              ) : (
                                <span className="text-[10px] text-red-600 dark:text-red-400">在庫切れ</span>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-3 h-3 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-background/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-end"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[38px] max-h-[80px]"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="shrink-0 h-[38px] w-[38px] rounded-lg"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          {messages.length >= 2 && !isTyping && (
            <div className="mt-2 flex justify-center">
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary border border-border rounded-full px-3 py-1 hover:border-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Mail className="w-3 h-3" />
                解決しない場合はお問い合わせ
              </a>
            </div>
          )}
          <p className="text-[9px] text-muted-foreground text-center mt-1.5">
            AIアシスタントは参考情報を提供します。医療相談は医師にご相談ください。
          </p>
        </div>
      </div>

      {/* Floating Button — 로딩 완료 2초 후 bounce 등장 */}
      {appearState !== "hidden" && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors duration-300 hover:scale-105",
            appearState === "bouncing" && "chat-bounce-in",
            isOpen
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          style={{ bottom: 'calc(56px + 1rem)', right: '16px' }}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageCircle className="w-6 h-6" />
              {showPulse && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </>
          )}
        </button>
      )}
    </>
  );
}
