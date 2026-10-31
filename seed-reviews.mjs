import { db } from './server/_core/db.ts';
import { reviews, products } from './drizzle/schema.ts';

async function seedReviews() {
  try {
    // Get some products to review
    const allProducts = await db.select().from(products).limit(10);
    
    if (allProducts.length === 0) {
      console.log('No products found. Please add products first.');
      process.exit(1);
    }

    const reviewData = [];
    const reviewTexts = [
      '本当に良い商品です。効果が実感できました。',
      '価格の割に品質が良い。リピート確定です。',
      '配送も早くて、梱包も丁寧でした。',
      '期待以上の効果があります。友人にも勧めました。',
      '使い続けて1ヶ月、肌の調子が良くなりました。',
      'コスパ最高です。毎月購入しています。',
      '効果が出るまで時間がかかりましたが、今は手放せません。',
      'このお値段でこの品質は素晴らしい。',
      '敏感肌ですが、問題なく使用できました。',
      'パッケージも可愛くて、プレゼントにも最適です。',
      '毎日使うものなので、コスパが重要。この商品は大満足。',
      '効果を実感するまで3週間かかりましたが、確実に効きます。',
      '家族全員で使っています。みんな気に入ってます。',
      'この商品に出会えて本当に良かった。',
      '品質が安定していて、いつも同じ効果が得られます。',
      '初めて購入しましたが、期待を上回る商品でした。',
      '毎日のルーティンに欠かせない商品になりました。',
      'サプリメントは色々試しましたが、これが一番効きます。',
      '値段は少し高めですが、その価値は十分あります。',
      '友人の勧めで購入。本当に感謝しています。',
    ];

    const ratings = [5, 5, 4, 5, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5];

    for (let i = 0; i < 20; i++) {
      const product = allProducts[i % allProducts.length];
      reviewData.push({
        productId: product.id,
        userId: 1, // Test user ID
        rating: ratings[i],
        title: `レビュー ${i + 1}`,
        content: reviewTexts[i],
        images: null,
        isBest: i < 3, // Mark first 3 as best reviews
        status: 'approved',
        createdAt: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000), // Spread over 20 days
        updatedAt: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000),
      });
    }

    await db.insert(reviews).values(reviewData);
    console.log('✅ Successfully seeded 20 reviews');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    process.exit(1);
  }
}

seedReviews();
