import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Calendar, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BbsEventDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id || "0", 10);

  const { data: event, isLoading } = trpc.events.getById.useQuery({ id: eventId });
  const incrementViewMutation = trpc.events.incrementViewCount.useMutation();

  useEffect(() => {
    if (event && eventId) {
      incrementViewMutation.mutate({ id: eventId });
    }
  }, [event, eventId, incrementViewMutation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">イベントが見つかりません</p>
            <Button onClick={() => setLocation("/bbs/event")}>
              イベント一覧に戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/bbs/event")}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            イベント一覧に戻る
          </Button>
          <h1 className="text-3xl font-bold text-primary">{event.titleJa}</h1>
        </div>
      </div>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Image */}
          <Card className="overflow-hidden mb-8">
            <div className="w-full h-96 overflow-hidden bg-gray-200">
              <img
                src={event.imageUrl}
                alt={event.titleJa}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {/* Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Date Info */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">開始日</p>
                  <p className="font-semibold">
                    {new Date(event.startDate).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">終了日</p>
                  <p className="font-semibold">
                    {new Date(event.endDate).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">ステータス</p>
                <p className="font-semibold">
                  {event.isActive ? (
                    <span className="text-green-600">開催中</span>
                  ) : (
                    <span className="text-gray-500">終了</span>
                  )}
                </p>
              </div>
            </Card>
          </div>

          {/* Description */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">イベント詳細</h2>
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="whitespace-pre-wrap">{event.descriptionJa}</p>
            </div>
          </Card>

          {/* View Count */}
          <div className="text-center text-sm text-muted-foreground">
            <p>閲覧数: {event.viewCount}</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
