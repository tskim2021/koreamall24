import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Alert, AlertDescription } from"@/components/ui/alert";
import { toast } from"sonner";
import {
 ExternalLink, CheckCircle, Info, Globe, Search, AlertCircle,
 RefreshCw, FileText, Clock, Loader2,
} from"lucide-react";
import AdminLayout from"@/components/AdminLayout";

interface SearchEngine {
 id: string;
 name: string;
 settingKey: string;
 metaName: string;
 color: string;
 logoText: string;
 consoleUrl: string;
 helpUrl: string;
 description: string;
 steps: string[];
 placeholder: string;
}

const SEARCH_ENGINES: SearchEngine[] = [
 {
 id:"google",
 name:"Google Search Console",
 settingKey:"SEARCH_GOOGLE_VERIFICATION",
 metaName:"google-site-verification",
 color:"bg-blue-50 border-blue-200",
 logoText:"G",
 consoleUrl:"https://search.google.com/search-console",
 helpUrl:"https://support.google.com/webmasters/answer/9008080",
 description:"Google 검색 결과에 사이트를 등록하고 검색 성능을 모니터링합니다.",
 steps: [
"Google Search Console에 접속합니다.",
"속성 추가 → URL 접두어 방식으로 사이트 URL을 입력합니다.",
"HTML 태그 방식을 선택하면 content 값이 표시됩니다.",
"해당 content 값을 아래에 입력합니다.",
"저장 후 Google Search Console에서 확인 버튼을 클릭합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
 {
 id:"bing",
 name:"Bing Webmaster Tools",
 settingKey:"SEARCH_BING_VERIFICATION",
 metaName:"msvalidate.01",
 color:"bg-teal-50 border-teal-200",
 logoText:"B",
 consoleUrl:"https://www.bing.com/webmasters",
 helpUrl:"https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b",
 description:"Bing 및 Yahoo 검색 결과에 사이트를 등록합니다. (Yahoo는 Bing 인증으로 자동 포함)",
 steps: [
"Bing Webmaster Tools에 접속합니다.",
"사이트 추가 → 사이트 URL을 입력합니다.",
"'메타 태그' 방식을 선택합니다.",
"content 값을 아래에 입력합니다.",
"저장 후 Bing에서 확인 버튼을 클릭합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
 {
 id:"yahoo",
 name:"Yahoo! Japan",
 settingKey:"SEARCH_YAHOO_VERIFICATION",
 metaName:"y_key",
 color:"bg-purple-50 border-purple-200",
 logoText:"Y",
 consoleUrl:"https://search.yahoo.co.jp/",
 helpUrl:"https://webmaster.yahoo.co.jp/",
 description:"Yahoo! Japan 검색에 사이트를 등록합니다.",
 steps: [
"Yahoo! Japan サイトエクスプローラー에 접속합니다.",
"사이트 등록 후 인증 코드를 발급받습니다.",
"인증 코드를 아래에 입력합니다.",
"저장 후 Yahoo에서 인증을 완료합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
 {
 id:"naver",
 name:"Naver Search Advisor",
 settingKey:"SEARCH_NAVER_VERIFICATION",
 metaName:"naver-site-verification",
 color:"bg-green-50 border-green-200",
 logoText:"N",
 consoleUrl:"https://searchadvisor.naver.com/",
 helpUrl:"https://searchadvisor.naver.com/guide/site-register",
 description:"네이버 검색 결과에 사이트를 등록합니다.",
 steps: [
"네이버 서치어드바이저에 접속합니다.",
"웹마스터 도구 → 사이트 등록에서 URL을 입력합니다.",
"HTML 태그 방식을 선택하면 content 값이 표시됩니다.",
"해당 content 값을 아래에 입력합니다.",
"저장 후 소유 확인 버튼을 클릭합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
 {
 id:"baidu",
 name:"Baidu Search",
 settingKey:"SEARCH_BAIDU_VERIFICATION",
 metaName:"baidu-site-verification",
 color:"bg-red-50 border-red-200",
 logoText:"百",
 consoleUrl:"https://ziyuan.baidu.com/",
 helpUrl:"https://ziyuan.baidu.com/site/index",
 description:"바이두(중국) 검색 결과에 사이트를 등록합니다.",
 steps: [
"바이두 자원 플랫폼에 접속합니다.",
"사이트 관리 → 사이트 추가에서 URL을 입력합니다.",
"HTML 태그 방식을 선택하면 content 값이 표시됩니다.",
"해당 content 값을 아래에 입력합니다.",
"저장 후 바이두에서 인증을 완료합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
 {
 id:"yandex",
 name:"Yandex Webmaster",
 settingKey:"SEARCH_YANDEX_VERIFICATION",
 metaName:"yandex-verification",
 color:"bg-orange-50 border-orange-200",
 logoText:"Я",
 consoleUrl:"https://webmaster.yandex.com/",
 helpUrl:"https://yandex.com/support/webmaster/service/rights.html",
 description:"Yandex(러시아) 검색 결과에 사이트를 등록합니다.",
 steps: [
"Yandex Webmaster에 접속합니다.",
"사이트 추가 후 메타 태그 방식을 선택합니다.",
"content 값을 아래에 입력합니다.",
"저장 후 Yandex에서 인증을 완료합니다.",
 ],
 placeholder:"예: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 },
];

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /mypage/
Disallow: /checkout/
Disallow: /cart

Sitemap: https://cocokusuri.com/sitemap.xml`;

export default function SearchConsole() {
 const { data: siteSettings, isLoading, refetch } = trpc.admin.siteSettings.getAll.useQuery();
 const { data: robotsData, refetch: refetchRobots } = trpc.searchConsole.getRobotsTxt.useQuery();
 const { data: sitemapStatus, refetch: refetchSitemapStatus } = trpc.searchConsole.getSitemapStatus.useQuery();

 const updateSiteSetting = trpc.admin.siteSettings.update.useMutation({
 onSuccess: () => {
 toast.success("설정이 저장되었습니다.");
 refetch();
 },
 onError: (error) => {
 toast.error(`저장 실패: ${error.message}`);
 },
 });

 const saveRobotsTxt = trpc.searchConsole.saveRobotsTxt.useMutation({
 onSuccess: () => {
 toast.success("robots.txt가 저장되었습니다.");
 refetchRobots();
 },
 onError: (error) => {
 toast.error(`저장 실패: ${error.message}`);
 },
 });

 const refreshSitemap = trpc.searchConsole.refreshSitemap.useMutation({
 onSuccess: (data) => {
 toast.success(`사이트맵이 갱신되었습니다. (${data.generatedAt ? new Date(data.generatedAt).toLocaleString("ko-KR") :"완료"})`);
 refetchSitemapStatus();
 },
 onError: (error) => {
 toast.error(`갱신 실패: ${error.message}`);
 },
 });

 // Form state for each engine
 const [values, setValues] = useState<Record<string, string>>({});
 const [savedValues, setSavedValues] = useState<Record<string, string>>({});
 const [sitemapUrl, setSitemapUrl] = useState("");
 const [robotsTxtContent, setRobotsTxtContent] = useState("");

 useEffect(() => {
 if (siteSettings) {
 const newValues: Record<string, string> = {};
 SEARCH_ENGINES.forEach((engine) => {
 const found = siteSettings.find((s: { key: string; value: string | null }) => s.key === engine.settingKey);
 newValues[engine.settingKey] = found?.value ||"";
 });
 const sitemapFound = siteSettings.find((s: { key: string; value: string | null }) => s.key ==="SEARCH_GOOGLE_SITEMAP");
 setSitemapUrl(sitemapFound?.value ||"");
 setValues(newValues);
 setSavedValues(newValues);
 }
 }, [siteSettings]);

 useEffect(() => {
 if (robotsData) {
 setRobotsTxtContent(robotsData.content ?? robotsData.defaultContent);
 }
 }, [robotsData]);

 const handleSave = (settingKey: string) => {
 updateSiteSetting.mutate({ key: settingKey, value: values[settingKey] || null });
 };

 const handleSaveSitemap = () => {
 updateSiteSetting.mutate({ key:"SEARCH_GOOGLE_SITEMAP", value: sitemapUrl || null });
 };

 const isSaved = (settingKey: string) => savedValues[settingKey] === values[settingKey];
 const hasValue = (settingKey: string) => !!savedValues[settingKey];

 return (
 <AdminLayout>
 <div className="p-6 space-y-6 max-w-4xl">
 {/* 헤더 */}
 <div>
 <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
 <Search className="w-5 h-5 text-primary"/>
 검색엔진 등록 관리
 </h1>
 <p className="text-xs text-muted-foreground mt-1">
 각 검색엔진에 사이트를 등록하면 검색 결과에 노출될 수 있습니다. 인증 코드를 입력하면 메타태그가 자동으로 삽입됩니다.
 </p>
 </div>

 {/* 안내 배너 */}
 <Alert className="border-blue-200 bg-blue-50">
 <Info className="w-4 h-4 text-blue-600"/>
 <AlertDescription className="text-blue-800 text-xs">
 <strong>사용 방법:</strong> 각 검색엔진 콘솔에서 사이트를 등록한 후 발급받은 인증 코드(content 값)를 아래에 입력하고 저장하세요.
 저장 즉시 사이트 전체 페이지의 &lt;head&gt;에 인증 메타태그가 자동으로 삽입됩니다.
 </AlertDescription>
 </Alert>

 {/* ── 사이트맵 관리 섹션 ── */}
 <Card className="border-gray-200">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Globe className="w-4 h-4 text-gray-600"/>
 사이트맵 관리
 </CardTitle>
 <CardDescription className="text-xs">
 사이트맵은 매일 새벽 2시(JST)에 자동으로 갱신됩니다. 수동 갱신도 가능합니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* 자동 갱신 상태 */}
 <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-gray-500"/>
 <div>
 <p className="text-xs font-medium text-gray-700">마지막 갱신 시각</p>
 <p className="text-xs text-muted-foreground">
 {sitemapStatus?.lastGeneratedAt
 ? new Date(sitemapStatus.lastGeneratedAt).toLocaleString("ko-KR")
 :"아직 갱신되지 않았습니다."}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="outline"className="text-xs text-green-700 border-green-300 bg-green-50">
 매일 02:00 JST 자동 갱신
 </Badge>
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs gap-1"
 onClick={() => refreshSitemap.mutate()}
 disabled={refreshSitemap.isPending}
 >
 {refreshSitemap.isPending ? (
 <Loader2 className="w-3 h-3 animate-spin"/>
 ) : (
 <RefreshCw className="w-3 h-3"/>
 )}
 지금 갱신
 </Button>
 </div>
 </div>

 {/* 사이트맵 URL 미리보기 */}
 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2 font-mono">
 <span className="text-gray-500">URL:</span>
 <a
 href="https://cocokusuri.com/sitemap.xml"
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline flex items-center gap-1"
 >
 https://cocokusuri.com/sitemap.xml
 <ExternalLink className="w-3 h-3"/>
 </a>
 </div>

 {/* 검색엔진 제출용 사이트맵 URL 저장 */}
 <div className="space-y-1.5">
 <Label htmlFor="sitemap-url"className="text-xs font-medium">
 검색엔진 콘솔 제출용 사이트맵 URL
 </Label>
 <div className="flex gap-2 items-center">
 <Input
 id="sitemap-url"
 className="text-xs h-8"
 placeholder="예: https://cocokusuri.com/sitemap.xml"
 value={sitemapUrl}
 onChange={(e) => setSitemapUrl(e.target.value)}
 />
 <Button
 size="sm"
 className="h-8 text-xs shrink-0"
 onClick={handleSaveSitemap}
 disabled={updateSiteSetting.isPending}
 >
 저장
 </Button>
 </div>
 <p className="text-xs text-muted-foreground">
 이 URL을 각 검색엔진 콘솔의 사이트맵 제출 항목에 입력하면 크롤링 속도가 빨라집니다.
 </p>
 </div>

 {/* 포함 페이지 안내 */}
 <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-3 space-y-1">
 <p className="font-medium text-blue-700">자동 생성 사이트맵에 포함되는 페이지:</p>
 <ul className="list-disc list-inside space-y-0.5 text-blue-600">
 <li>홈, 상품 목록, 세일, 랭킹, 신상품 등 주요 정적 페이지</li>
 <li>전체 카테고리 페이지</li>
 <li>전체 상품 상세 페이지 (최종 수정일 포함)</li>
 <li>공지사항 및 이벤트 상세 페이지</li>
 </ul>
 </div>
 </CardContent>
 </Card>

 {/* ── robots.txt 편집 섹션 ── */}
 <Card className="border-gray-200">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <FileText className="w-4 h-4 text-gray-600"/>
 robots.txt 편집
 </CardTitle>
 <CardDescription className="text-xs">
 검색엔진 크롤러의 접근 범위를 제어합니다. 저장 즉시{""}
 <a
 href="https://cocokusuri.com/robots.txt"
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline"
 >
 https://cocokusuri.com/robots.txt
 </a>
 에 반영됩니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 <Textarea
 className="font-mono text-xs min-h-[200px] resize-y"
 value={robotsTxtContent}
 onChange={(e) => setRobotsTxtContent(e.target.value)}
 placeholder={DEFAULT_ROBOTS_TXT}
 />
 <div className="flex items-center justify-between">
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs"
 onClick={() => setRobotsTxtContent(DEFAULT_ROBOTS_TXT)}
 >
 기본값으로 초기화
 </Button>
 <Button
 size="sm"
 className="h-8 text-xs"
 onClick={() => saveRobotsTxt.mutate({ content: robotsTxtContent })}
 disabled={saveRobotsTxt.isPending}
 >
 {saveRobotsTxt.isPending ? (
 <Loader2 className="w-3 h-3 animate-spin mr-1"/>
 ) : null}
 저장
 </Button>
 </div>
 <Alert className="border-yellow-200 bg-yellow-50 py-2">
 <AlertCircle className="w-3 h-3 text-yellow-600"/>
 <AlertDescription className="text-yellow-800 text-xs">
 <strong>주의:</strong> /admin/, /api/, /mypage/ 등 민감한 경로는 반드시 Disallow 처리하세요.
 잘못된 설정은 검색엔진이 중요 페이지를 크롤링하지 못하게 할 수 있습니다.
 </AlertDescription>
 </Alert>
 </CardContent>
 </Card>

 {/* ── 검색엔진별 인증 설정 ── */}
 {SEARCH_ENGINES.map((engine) => (
 <Card key={engine.id} className={`border ${engine.color}`}>
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-sm font-bold">
 {engine.logoText}
 </div>
 <div>
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 {engine.name}
 {hasValue(engine.settingKey) && (
 <Badge variant="outline"className="text-xs text-green-700 border-green-300 bg-green-50 gap-1 py-0">
 <CheckCircle className="w-3 h-3"/> 등록됨
 </Badge>
 )}
 </CardTitle>
 <CardDescription className="text-xs mt-0.5">{engine.description}</CardDescription>
 </div>
 </div>
 <a
 href={engine.consoleUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
 >
 콘솔 열기 <ExternalLink className="w-3 h-3"/>
 </a>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* 등록 방법 안내 */}
 <details className="group">
 <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1 select-none">
 <AlertCircle className="w-3 h-3"/>
 등록 방법 보기
 </summary>
 <ol className="mt-2 space-y-1 pl-4 list-decimal text-xs text-muted-foreground">
 {engine.steps.map((step, i) => (
 <li key={i}>{step}</li>
 ))}
 </ol>
 </details>

 {/* 인증 코드 입력 */}
 <div className="space-y-1.5">
 <Label htmlFor={`engine-${engine.id}`} className="text-xs font-medium">
 인증 코드 (content 값)
 </Label>
 <div className="flex gap-2 items-center">
 <Input
 id={`engine-${engine.id}`}
 className="text-xs h-8 font-mono"
 placeholder={engine.placeholder}
 value={values[engine.settingKey] ||""}
 onChange={(e) =>
 setValues((prev) => ({ ...prev, [engine.settingKey]: e.target.value }))
 }
 />
 <Button
 size="sm"
 className="h-8 text-xs shrink-0"
 onClick={() => handleSave(engine.settingKey)}
 disabled={updateSiteSetting.isPending || isSaved(engine.settingKey)}
 variant={isSaved(engine.settingKey) ?"outline":"default"}
 >
 {isSaved(engine.settingKey) ?"저장됨":"저장"}
 </Button>
 </div>
 {/* 삽입될 메타태그 미리보기 */}
 {values[engine.settingKey] && (
 <div className="bg-muted rounded p-2 text-xs font-mono text-muted-foreground break-all">
 &lt;meta name=&quot;{engine.metaName}&quot; content=&quot;{values[engine.settingKey]}&quot; /&gt;
 </div>
 )}
 </div>
 <p className="text-xs text-muted-foreground">
 자세한 등록 방법은{""}
 <a href={engine.helpUrl} target="_blank"rel="noopener noreferrer"className="text-primary hover:underline">
 공식 도움말
 </a>
 을 참고하세요.
 </p>
 </CardContent>
 </Card>
 ))}

 {/* ── 등록 현황 요약 ── */}
 <Card className="border-gray-200">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-semibold">등록 현황 요약</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {SEARCH_ENGINES.map((engine) => (
 <div key={engine.id} className="flex items-center gap-2 text-xs">
 <div className={`w-2 h-2 rounded-full ${hasValue(engine.settingKey) ?"bg-green-500":"bg-gray-300"}`} />
 <span className={hasValue(engine.settingKey) ?"text-foreground font-medium":"text-muted-foreground"}>
 {engine.name.split("")[0]}
 </span>
 {hasValue(engine.settingKey) ? (
 <Badge variant="outline"className="text-xs text-green-700 border-green-300 py-0 px-1">완료</Badge>
 ) : (
 <Badge variant="outline"className="text-xs text-gray-400 border-gray-200 py-0 px-1">미등록</Badge>
 )}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 </AdminLayout>
 );
}
