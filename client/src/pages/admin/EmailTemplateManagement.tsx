import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, Plus } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface EmailTemplate {
  id?: number;
  templateKey: string;
  templateName: string;
  subject: string;
  bodyText: string;
  isActive: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function EmailTemplateManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<EmailTemplate>({
    templateKey: "",
    templateName: "",
    subject: "",
    bodyText: "",
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch templates
  const { data: templatesData, isLoading, refetch } = trpc.notification.emailTemplates.list.useQuery();
  const upsertMutation = trpc.notification.emailTemplates.upsert.useMutation();
  const deleteMutation = trpc.notification.emailTemplates.delete.useMutation();

  useEffect(() => {
    if (templatesData) {
      setTemplates(templatesData as EmailTemplate[]);
    }
  }, [templatesData]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData(template);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      templateKey: "",
      templateName: "",
      subject: "",
      bodyText: "",
      isActive: true,
    });
  };

  const handleSave = async () => {
    if (!formData.templateKey.trim() || !formData.templateName.trim() || !formData.subject.trim() || !formData.bodyText.trim()) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        templateKey: formData.templateKey,
        templateName: formData.templateName,
        subject: formData.subject,
        bodyText: formData.bodyText,
        isActive: formData.isActive,
        description: formData.description,
      });
      toast.success("템플릿이 저장되었습니다.");
      await refetch();
      setSelectedTemplate(null);
    } catch (error) {
      toast.error("저장에 실패했습니다.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateKey: string) => {
    if (!confirm("이 템플릿을 삭제하시겠습니까?")) return;

    try {
      await deleteMutation.mutateAsync({ templateKey });
      toast.success("템플릿이 삭제되었습니다.");
      await refetch();
      setSelectedTemplate(null);
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">메일 템플릿 관리</h1>
          <Button onClick={handleNewTemplate} className="gap-2">
            <Plus className="w-4 h-4" />
            새 템플릿
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">템플릿 목록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">템플릿이 없습니다.</p>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.templateKey}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.templateKey === template.templateKey
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted border-border"
                    }`}
                  >
                    <div className="font-medium text-sm">{template.templateName}</div>
                    <div className="text-xs text-muted-foreground">{template.templateKey}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedTemplate ? "템플릿 수정" : "새 템플릿 생성"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate || formData.templateKey ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">템플릿 키</label>
                    <Input
                      value={formData.templateKey}
                      onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
                      placeholder="retry_payment"
                      disabled={!!selectedTemplate}
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      시스템에서 사용되는 고유 식별자입니다. 변경할 수 없습니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">템플릿 이름 (한글)</label>
                    <Input
                      value={formData.templateName}
                      onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                      placeholder="결제 재시도"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">메일 제목</label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="【お支払い再手続き】koreamall24"
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      변수 사용 가능: {'{'}customerName{'}'}, {'{'}orderAmount{'}'} 등
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">메일 본문</label>
                    <Textarea
                      value={formData.bodyText}
                      onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                      placeholder="메일 본문 텍스트를 입력하세요..."
                      rows={8}
                      className="text-xs resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      순수 텍스트만 입력하세요. HTML 태그는 자동으로 제거됩니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">설명</label>
                    <Textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="이 템플릿의 용도와 사용 가능한 변수를 설명하세요."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                      활성화
                    </label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="gap-2 flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      저장
                    </Button>
                    {selectedTemplate && (
                      <Button
                        onClick={() => handleDelete(selectedTemplate.templateKey)}
                        variant="destructive"
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        삭제
                      </Button>
                    )}
                    <Button
                      onClick={handleNewTemplate}
                      variant="outline"
                    >
                      취소
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  왼쪽에서 템플릿을 선택하거나 새 템플릿을 생성하세요.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
