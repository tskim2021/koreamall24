import { useState } from"react";
import { trpc } from"@/lib/trpc";
import AdminLayout from"@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Badge } from"@/components/ui/badge";
import { TrendingUp, Eye, MousePointer, Percent, Package } from"lucide-react";
import { formatPrice } from"@/../../shared/utils/formatPrice";

export default function RecommendationStats() {
 const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});

 const { data: stats, isLoading: statsLoading } = trpc.recommendations.getStats.useQuery(dateRange);

 const { data: tagBasedProducts } = trpc.recommendations.getTopProducts.useQuery({
 recommendationType: 'tag_based',
 limit: 10,
 });

 const { data: collaborativeProducts } = trpc.recommendations.getTopProducts.useQuery({
 recommendationType: 'collaborative',
 limit: 10,
 });

 const { data: categoryProducts } = trpc.recommendations.getTopProducts.useQuery({
 recommendationType: 'category_based',
 limit: 10,
 });

 const getRecommendationTypeLabel = (type: string) => {
 switch (type) {
 case 'tag_based':
 return '태그 기반 추천';
 case 'collaborative':
 return '협업 필터링';
 case 'category_based':
 return '카테고리 기반 추천';
 default:
 return type;
 }
 };

 const getRecommendationTypeColor = (type: string) => {
 switch (type) {
 case 'tag_based':
 return 'bg-blue-500';
 case 'collaborative':
 return 'bg-green-500';
 case 'category_based':
 return 'bg-purple-500';
 default:
 return 'bg-gray-500';
 }
 };

 return (
 <AdminLayout>
 <div className="p-6 space-y-6">
 <div>
 <h1 className="text-3xl font-bold">추천 통계</h1>
 <p className="text-muted-foreground mt-1">
 추천 유형별 성과를 분석합니다
 </p>
 </div>

 {/* Overview Cards */}
 <div className="grid gap-4 grid-cols-3">
 {stats && stats.map((stat) => (
 <Card key={stat.recommendationType}>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {getRecommendationTypeLabel(stat.recommendationType)}
 </CardTitle>
 <div className={`w-3 h-3 rounded-full ${getRecommendationTypeColor(stat.recommendationType)}`} />
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Eye className="w-4 h-4"/>
 <span>표시횟수</span>
 </div>
 <span className="text-2xl font-bold">{stat.impressions.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <MousePointer className="w-4 h-4"/>
 <span>클릭 수</span>
 </div>
 <span className="text-2xl font-bold">{stat.clicks.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between pt-2 border-t">
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Percent className="w-4 h-4"/>
 <span>CTR</span>
 </div>
 <Badge variant={stat.ctr > 5 ?"default":"secondary"}>
 {stat.ctr.toFixed(2)}%
 </Badge>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Top Products by Recommendation Type */}
 <Tabs defaultValue="tag_based"className="space-y-4">
 <TabsList>
 <TabsTrigger value="tag_based">태그 기반</TabsTrigger>
 <TabsTrigger value="collaborative">협업 필터링</TabsTrigger>
 <TabsTrigger value="category_based">카테고리 기반</TabsTrigger>
 </TabsList>

 <TabsContent value="tag_based"className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>태그 기반 추천 - 상위 상품</CardTitle>
 <CardDescription>
 가장 많이 클릭된 추천 상품
 </CardDescription>
 </CardHeader>
 <CardContent>
 {tagBasedProducts && tagBasedProducts.length > 0 ? (
 <div className="space-y-2">
 {tagBasedProducts.map((item, index) => (
 <div
 key={item.product.id}
 className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
 {index + 1}
 </div>
 <div className="flex items-center gap-3">
 {item.product.imageUrl && (
 <img
 src={item.product.imageUrl}
 alt={item.product.nameJa}
 className="w-12 h-12 object-contain rounded"
 />
 )}
 <div>
 <p className="font-medium">{item.product.nameJa}</p>
 <p className="text-sm text-muted-foreground">
 {formatPrice(item.product.price)}
 </p>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4 text-sm">
 <div className="text-center">
 <p className="text-muted-foreground">표시</p>
 <p className="font-bold">{item.impressions}</p>
 </div>
 <div className="text-center">
 <p className="text-muted-foreground">클릭</p>
 <p className="font-bold">{item.clicks}</p>
 </div>
 <Badge variant={item.ctr > 5 ?"default":"secondary"}>
 {item.ctr.toFixed(2)}%
 </Badge>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-muted-foreground">
 <Package className="w-12 h-12 mx-auto mb-2 opacity-50"/>
 <p>데이터가 없습니다</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="collaborative"className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>협업 필터링 추천 - 상위 상품</CardTitle>
 <CardDescription>
 가장 많이 클릭된 추천 상품
 </CardDescription>
 </CardHeader>
 <CardContent>
 {collaborativeProducts && collaborativeProducts.length > 0 ? (
 <div className="space-y-2">
 {collaborativeProducts.map((item, index) => (
 <div
 key={item.product.id}
 className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
 {index + 1}
 </div>
 <div className="flex items-center gap-3">
 {item.product.imageUrl && (
 <img
 src={item.product.imageUrl}
 alt={item.product.nameJa}
 className="w-12 h-12 object-contain rounded"
 />
 )}
 <div>
 <p className="font-medium">{item.product.nameJa}</p>
 <p className="text-sm text-muted-foreground">
 {formatPrice(item.product.price)}
 </p>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4 text-sm">
 <div className="text-center">
 <p className="text-muted-foreground">표시</p>
 <p className="font-bold">{item.impressions}</p>
 </div>
 <div className="text-center">
 <p className="text-muted-foreground">클릭</p>
 <p className="font-bold">{item.clicks}</p>
 </div>
 <Badge variant={item.ctr > 5 ?"default":"secondary"}>
 {item.ctr.toFixed(2)}%
 </Badge>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-muted-foreground">
 <Package className="w-12 h-12 mx-auto mb-2 opacity-50"/>
 <p>데이터가 없습니다</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="category_based"className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>카테고리 기반 추천 - 상위 상품</CardTitle>
 <CardDescription>
 가장 많이 클릭된 추천 상품
 </CardDescription>
 </CardHeader>
 <CardContent>
 {categoryProducts && categoryProducts.length > 0 ? (
 <div className="space-y-2">
 {categoryProducts.map((item, index) => (
 <div
 key={item.product.id}
 className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
 {index + 1}
 </div>
 <div className="flex items-center gap-3">
 {item.product.imageUrl && (
 <img
 src={item.product.imageUrl}
 alt={item.product.nameJa}
 className="w-12 h-12 object-contain rounded"
 />
 )}
 <div>
 <p className="font-medium">{item.product.nameJa}</p>
 <p className="text-sm text-muted-foreground">
 {formatPrice(item.product.price)}
 </p>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4 text-sm">
 <div className="text-center">
 <p className="text-muted-foreground">표시</p>
 <p className="font-bold">{item.impressions}</p>
 </div>
 <div className="text-center">
 <p className="text-muted-foreground">클릭</p>
 <p className="font-bold">{item.clicks}</p>
 </div>
 <Badge variant={item.ctr > 5 ?"default":"secondary"}>
 {item.ctr.toFixed(2)}%
 </Badge>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-muted-foreground">
 <Package className="w-12 h-12 mx-auto mb-2 opacity-50"/>
 <p>데이터가 없습니다</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
