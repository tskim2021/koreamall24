import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Clock, ArrowUp, Megaphone } from "lucide-react";

export default function FloatingSideRail() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { icon: Megaphone, label: "お知らせ", href: "/bbs/notice" },
    { icon: ShoppingCart, label: "カート", href: "/cart" },
    { icon: Clock, label: "最近見た商品", href: "/mypage/recently-viewed" },
  ];

  return (
    <div className="hidden lg:flex flex-col fixed right-3 top-1/2 -translate-y-1/2 z-40 shadow-lg rounded-xl overflow-hidden border border-gray-200">
      {items.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className="w-16 h-16 flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-primary/5 border-b border-gray-100 last:border-b-0 transition-colors"
        >
          <item.icon className="w-5 h-5 text-primary" />
          <span className="text-[10px] text-gray-600 leading-none text-center">{item.label}</span>
        </Link>
      ))}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`w-16 h-16 flex flex-col items-center justify-center gap-0.5 bg-primary hover:bg-primary/90 transition-all ${showTop ? "opacity-100" : "opacity-0 pointer-events-none h-0"}`}
      >
        <ArrowUp className="w-5 h-5 text-white" />
        <span className="text-[10px] text-white leading-none">TOP</span>
      </button>
    </div>
  );
}
