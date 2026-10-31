import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, subDays } from "date-fns";
import { Users, Eye, Globe, Search, TrendingUp, BarChart2 } from "lucide-react";

const COLORS = ["#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

type DateRange = 7 | 30 | 90;

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>(30);

  const effectiveStartDate = useMemo(() => subDays(new Date(), dateRange), [dateRange]);
  const effectiveEndDate = useMemo(() => new Date(), []);

  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery(
    { startDate: effectiveStartDate, endDate: effectiveEndDate },
    { retry: false }
  );

  const { data: dailyStats } = trpc.analytics.getDailyStats.useQuery(
    {
      startDate: format(effectiveStartDate, "yyyy-MM-dd"),
      endDate: format(effectiveEndDate, "yyyy-MM-dd"),
    },
    { retry: false }
  );

  const { data: countryStats } = trpc.analytics.getCountryStats.useQuery(
    { date: format(new Date(), "yyyy-MM-dd") },
    { retry: false }
  );

  const { data: searchKeywords } = trpc.analytics.getSearchKeywords.useQuery(
    {
      startDate: format(effectiveStartDate, "yyyy-MM-dd"),
      endDate: format(effectiveEndDate, "yyyy-MM-dd"),
      limit: 20,
    },
    { retry: false }
  );

  const dailyChartData = useMemo(() =>
    (dailyStats || []).map((stat: any) => ({
      date: stat.date ? String(stat.date).slice(5) : "",
      세션: Number(stat.totalSessions) || 0,
      페이지뷰: Number(stat.totalPageViews) || 0,
      방문자: Number(stat.uniqueVisitors) || 0,
    }))
  , [dailyStats]);

  const countryChartData = useMemo(() =>
    (countryStats || []).slice(0, 8).map((stat: any) => ({
      name: stat.countryName || stat.country || "Unknown",
      value: Number(stat.sessions) || 0,
    }))
  , [countryStats]);

  const keywordChartData = useMemo(() =>
    (searchKeywords || []).slice(0, 10).map((kw: any) => ({
      keyword: String(kw.keyword || ""),
      검색수: Number(kw.count) || 0,
    }))
  , [searchKeywords]);

  if (summaryLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* 페이지 타이틀 + 날짜 필터 */}
        <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">방문자 애널리틱스</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(effectiveStartDate, "yyyy.MM.dd")} ~ {format(effectiveEndDate, "yyyy.MM.dd")} 기준
            </p>
          </div>
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
            {([7, 30, 90] as DateRange[]).map((days) => (
              <button
                key={days}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  dateRange === days
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setDateRange(days)}
              >
                {days}일
              </button>
            ))}
          </div>
        </div>

        {/* 핵심 지표 4개 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "총 세션", value: summary?.totalSessions ?? 0, icon: TrendingUp, color: "text-pink-600" },
            { label: "페이지 뷰", value: summary?.totalPageViews ?? 0, icon: Eye, color: "text-blue-600" },
            { label: "고유 방문자", value: summary?.uniqueVisitors ?? 0, icon: Users, color: "text-green-600" },
            { label: "총 이벤트", value: summary?.totalEvents ?? 0, icon: BarChart2, color: "text-purple-600" },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{item.label}</p>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{Number(item.value).toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* 일일 트렌드 차트 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">일일 방문자 트렌드</h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="세션" stroke="#ec4899" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="페이지뷰" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="방문자" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
              방문자 추적이 시작되면 여기에 표시됩니다
            </div>
          )}
        </div>

        {/* 국가별 + 인기 페이지 (2열) */}
        <div className="grid grid-cols-2 gap-4">
          {/* 국가별 방문자 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-gray-800">국가별 방문자</h3>
            </div>
            {countryChartData.length > 0 ? (
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie
                      data={countryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                    >
                      {countryChartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {countryChartData.slice(0, 6).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-xs text-gray-700 truncate max-w-[80px]">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">데이터 없음</div>
            )}
          </div>

          {/* 인기 페이지 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-bold text-gray-800">인기 페이지</h3>
            </div>
            {summary?.topPages && summary.topPages.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-xs font-semibold text-gray-500">페이지</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-gray-500">조회수</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topPages.slice(0, 7).map((page: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 text-xs text-gray-700 max-w-[160px] truncate">{String(page.page || "")}</td>
                      <td className="py-1.5 text-xs text-right font-semibold text-blue-600">{Number(page.count) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs">데이터 없음</div>
            )}
          </div>
        </div>

        {/* 검색 키워드 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-800">검색 키워드 TOP 10</h3>
          </div>
          {keywordChartData.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={keywordChartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="keyword" type="category" width={90} tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="검색수" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full self-start">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-xs font-semibold text-gray-500">순위</th>
                    <th className="text-left py-1.5 text-xs font-semibold text-gray-500">키워드</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-gray-500">검색 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchKeywords || []).slice(0, 10).map((kw: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-1.5 text-xs text-gray-800 font-medium">{String(kw.keyword || "")}</td>
                      <td className="py-1.5 text-xs text-right font-semibold text-purple-600">{Number(kw.count) || 0}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
              검색 데이터가 쌓이면 여기에 표시됩니다
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
