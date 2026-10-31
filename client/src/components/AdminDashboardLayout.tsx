import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Menu, X, LogOut, Settings, Home, Package, ShoppingCart, Users, BarChart3, FileText, Tag, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
}

export default function AdminDashboardLayout({
  children,
  currentTab,
  onTabChange,
}: AdminDashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
      toast.success("로그아웃되었습니다");
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold mb-4">관리자 권한이 필요합니다</p>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: Home },
    { id: "products", label: "상품 관리", icon: Package },
    { id: "orders", label: "주문 관리", icon: ShoppingCart },
    { id: "customers", label: "고객 관리", icon: Users },
    { id: "reviews", label: "리뷰 관리", icon: FileText },
    { id: "categories", label: "카테고리관리", icon: Tag },
    { id: "analytics", label: "분석", icon: BarChart3 },
    { id: "settings", label: "설정", icon: Cog },
  ];

  return (
    <div className={`flex h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50"}`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-r transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-red-600">KUSURI</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors`}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                  currentTab === item.id
                    ? `${
                        darkMode
                          ? "bg-red-600 text-white"
                          : "bg-red-100 text-red-600"
                      }`
                    : `${
                        darkMode
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full px-4 py-2 flex items-center gap-2 rounded-lg transition-colors text-sm ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {darkMode ? "☀️" : "🌙"}
            {sidebarOpen && <span>{darkMode ? "라이트" : "다크"}</span>}
          </button>
          <button
            onClick={() => logout.mutate()}
            className="w-full px-4 py-2 flex items-center gap-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div
          className={`${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } border-b px-6 py-4 flex items-center justify-between`}
        >
          <div>
            <h2 className="text-2xl font-bold">관리자대시보드</h2>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {user?.name} 로 로그인 중
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
              🔔
            </button>
            <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
              {user?.name?.charAt(0) || "A"}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
