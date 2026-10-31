import { useState, useEffect } from"react";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Loader2, Save } from"lucide-react";
import { toast } from"sonner";
import AdminLayout from"@/components/AdminLayout";

type LegalKey ="tokushoho"|"privacy_policy"|"terms_of_service"|"first_time_customer";

const LEGAL_CONFIGS = {
 tokushoho: {
 title:"특정상거래법에 기반한 표기",
 description:"특정상거래법에 기반한 표기 내용을 편집합니다",
 defaultTitle:"특정상거래법에 기반한 표기",
 },
 privacy_policy: {
 title:"개인정보처리방침",
 description:"개인정보처리방침 내용을 편집합니다",
 defaultTitle:"개인정보처리방침",
 },
 terms_of_service: {
 title:"이용약관",
 description:"이용약관 내용을 편집합니다",
 defaultTitle:"이용약관",
 },
 first_time_customer: {
 title:"처음 오신 고객님께",
 description:"회사 소개/안내 페이지 내용을 편집합니다",
 defaultTitle:"처음 방문하시는 고객님께",
 },
};

function LegalEditor({ legalKey }: { legalKey: LegalKey }) {
 const config = LEGAL_CONFIGS[legalKey];
 const { data: notice, isLoading } = trpc.legalNotice.get.useQuery({ key: legalKey });
 const utils = trpc.useUtils();
 
 const [titleJa, setTitleJa] = useState("");
 const [contentJa, setContentJa] = useState("");
 const [isPublished, setIsPublished] = useState<boolean>(true);

 useEffect(() => {
 if (notice) {
 setTitleJa(notice.titleJa);
 setContentJa(notice.contentJa);
 setIsPublished(notice.isPublished === 1);
 }
 }, [notice]);

 const updateMutation = trpc.legalNotice.adminUpsert.useMutation({
 onSuccess: () => {
 utils.legalNotice.get.invalidate({ key: legalKey });
 toast.success("저장되었습니다");
 },
 onError: (error) => {
 toast.error(`저장에 실패했습니다: ${error.message}`);
 },
 });

 const handleSave = () => {
 if (!titleJa.trim() || !contentJa.trim()) {
 toast.error("제목과 내용을 입력해주세요");
 return;
 }

 updateMutation.mutate({
 key: legalKey,
 titleJa,
 contentJa,
 isPublished: isPublished ? 1 : 0,
 });
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary"/>
 </div>
 );
 }

 return (
 <Card>
 <CardHeader>
 <CardTitle>{config.title}</CardTitle>
 <CardDescription>{config.description}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <label className="text-sm font-medium mb-2 block">제목 (일본어)</label>
 <Input
 value={titleJa}
 onChange={(e) => setTitleJa(e.target.value)}
 placeholder={config.defaultTitle}
 />
 </div>

 <div>
 <label className="text-sm font-medium mb-2 block">내용 (일본어)</label>
 <Textarea
 value={contentJa}
 onChange={(e) => setContentJa(e.target.value)}
 placeholder="내용을 입력해주세요"
 rows={20}
 className="font-mono text-sm"
 />
 <p className="text-xs text-muted-foreground mt-2">
 줄바꿈은 자동으로 반영됩니다.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id={`published-${legalKey}`}
 checked={isPublished}
 onChange={(e) => setIsPublished(e.target.checked)}
 className="w-4 h-4"
 />
 <label htmlFor={`published-${legalKey}`} className="text-sm">
 공개
 </label>
 </div>

 <Button
 onClick={handleSave}
 disabled={updateMutation.isPending}
 className="w-full"
 >
 {updateMutation.isPending ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
 저장 중...
 </>
 ) : (
 <>
 <Save className="w-4 h-4 mr-2"/>
 저장
 </>
 )}
 </Button>
 </CardContent>
 </Card>
 );
}

export default function AdminLegalNotice() {
 return (
 <AdminLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">법적 문서 관리</h2>
 <p className="text-xs text-muted-foreground mt-0.5">특정상거래법 표기, 개인정보처리방침, 이용약관, 첫음 오신 고객님께 페이지를 관리합니다.</p>
 </div>
 </div>

 <Tabs defaultValue="tokushoho"className="w-full">
 <TabsList className="grid w-full grid-cols-4">
 <TabsTrigger value="tokushoho">특정상거래법</TabsTrigger>
 <TabsTrigger value="privacy_policy">개인정보처리방침</TabsTrigger>
 <TabsTrigger value="terms_of_service">이용약관</TabsTrigger>
 <TabsTrigger value="first_time_customer">처음 오신 고객님께</TabsTrigger>
 </TabsList>

 <TabsContent value="tokushoho"className="mt-6">
 <LegalEditor legalKey="tokushoho"/>
 </TabsContent>

 <TabsContent value="privacy_policy"className="mt-6">
 <LegalEditor legalKey="privacy_policy"/>
 </TabsContent>

 <TabsContent value="terms_of_service"className="mt-6">
 <LegalEditor legalKey="terms_of_service"/>
 </TabsContent>

 <TabsContent value="first_time_customer"className="mt-6">
 <LegalEditor legalKey="first_time_customer"/>
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
