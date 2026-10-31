import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronRight } from "lucide-react";

export default function NoticeList() {
  const [route, params] = useRoute("/bbs/notice/:id");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: announcements, isLoading } = trpc.announcements.getAll.useQuery();
  const { data: selectedAnnouncement } = trpc.announcements.getById.useQuery(
    { id: selectedId || 0 },
    { enabled: !!selectedId }
  );

  const activeAnnouncements = announcements?.filter((a) => a.isActive) || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">お知らせ</h1>
            <p className="text-gray-600">最新のお知らせやニュースをご確認ください</p>
          </div>

          {/* Notice List */}
          <div className="bg-white rounded-lg shadow">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
              </div>
            ) : activeAnnouncements.length > 0 ? (
              <div className="divide-y">
                {activeAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    onClick={() => setSelectedId(announcement.id)}
                    className="p-6 hover:bg-pink-50 cursor-pointer transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {announcement.titleJa}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {announcement.contentJa}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>
                            {new Date(announcement.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                          <span>閲覧数: {announcement.viewCount}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>お知らせはありません</p>
              </div>
            )}
          </div>

          {/* Detail Modal */}
          {selectedId && selectedAnnouncement && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedId(null)}
            >
              <div
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedAnnouncement.titleJa}
                    </h2>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b">
                    <span>
                      {new Date(selectedAnnouncement.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    <span>閲覧数: {selectedAnnouncement.viewCount}</span>
                  </div>

                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {selectedAnnouncement.contentJa}
                  </div>

                  <div className="mt-8 pt-6 border-t">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
