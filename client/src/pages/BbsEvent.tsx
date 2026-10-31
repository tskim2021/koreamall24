import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BbsEvent() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: events = [] } = trpc.events.getAll.useQuery();

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => event.isActive)
      .filter((event) =>
        event.titleJa?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container py-8">
          <h1 className="text-3xl font-bold text-primary mb-2">イベント</h1>
          <p className="text-muted-foreground">最新のイベント情報をチェック</p>
        </div>
      </div>

      <main className="container py-8" style={{paddingTop: '60px', paddingBottom: '60px'}}>
        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="イベントを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="default">
              検索
            </Button>
          </form>
        </div>

        {/* Events Gallery - 2 Column Layout */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col p-0"
                onClick={() => setLocation(`/bbs/event/${event.id}`)}
              >
                {/* Image Container - Rectangular */}
                <div className="relative w-full h-80 overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={event.imageUrl}
                    alt={event.titleJa}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Date Badge */}
                  <div className="absolute top-3 right-3 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {new Date(event.startDate).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {event.titleJa}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {event.descriptionJa}
                  </p>

                  {/* Date Range */}
                  <div className="text-xs text-muted-foreground mb-3">
                    {new Date(event.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                    {new Date(event.endDate).toLocaleDateString("ja-JP")}
                  </div>

                  {/* View More Link */}
                  <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                    詳しく見る
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "検索結果がありません" : "イベントはまだありません"}
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
