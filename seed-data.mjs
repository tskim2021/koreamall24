import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding categories...");
  
  // Categories
  const categoriesData = [
    { name: "Hair Growth", nameJa: "育毛・ヘアケア", slug: "hair-growth", icon: "Scissors", sortOrder: 1 },
    { name: "Beauty", nameJa: "美容・スキンケア", slug: "beauty", icon: "Sparkles", sortOrder: 2 },
    { name: "Diet", nameJa: "ダイエット", slug: "diet", icon: "Scale", sortOrder: 3 },
    { name: "Health", nameJa: "健康・サプリ", slug: "health", icon: "Heart", sortOrder: 4 },
    { name: "Night Life", nameJa: "ナイトライフ", slug: "night-life", icon: "Moon", sortOrder: 5 },
    { name: "Mental Care", nameJa: "メンタルケア", slug: "mental-care", icon: "Brain", sortOrder: 6 },
    { name: "Infection", nameJa: "感染症・抗生物質", slug: "infection", icon: "Shield", sortOrder: 7 },
    { name: "Pet Medicine", nameJa: "ペットのお薬", slug: "pet", icon: "PawPrint", sortOrder: 8 },
  ];

  for (const cat of categoriesData) {
    await connection.execute(
      "INSERT INTO categories (name, nameJa, slug, icon, sortOrder) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name",
      [cat.name, cat.nameJa, cat.slug, cat.icon, cat.sortOrder]
    );
  }

  console.log("Seeding banners...");
  
  // Banners
  const bannersData = [
    { 
      title: "Summer Special Sale", 
      titleJa: "夏の特別セール", 
      subtitle: "Up to 40% OFF on selected items",
      subtitleJa: "対象商品が最大40%OFF",
      bgColor: "#e0f2fe",
      sortOrder: 1
    },
    { 
      title: "New Arrivals", 
      titleJa: "新商品入荷", 
      subtitle: "Check out our latest products",
      subtitleJa: "最新商品をチェック",
      bgColor: "#fce7f3",
      sortOrder: 2
    },
    { 
      title: "Free Shipping", 
      titleJa: "送料無料キャンペーン", 
      subtitle: "Free shipping on orders over ¥5,000",
      subtitleJa: "5,000円以上のご注文で送料無料",
      bgColor: "#dcfce7",
      sortOrder: 3
    },
  ];

  for (const banner of bannersData) {
    await connection.execute(
      "INSERT INTO banners (title, titleJa, subtitle, subtitleJa, bgColor, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [banner.title, banner.titleJa, banner.subtitle, banner.subtitleJa, banner.bgColor, banner.sortOrder]
    );
  }

  console.log("Seeding products...");
  
  // Products
  const productsData = [
    // Hair Growth (categoryId: 1)
    { categoryId: 1, name: "Minoxidil 5%", nameJa: "ミノキシジル5%", description: "Effective hair growth treatment", descriptionJa: "効果的な育毛治療薬", price: "3980", originalPrice: "4980", isTimeSale: true, isPopular: true, salesCount: 1520, rating: "4.5", reviewCount: 234 },
    { categoryId: 1, name: "Finasteride 1mg", nameJa: "フィナステリド1mg", description: "DHT blocker for hair loss", descriptionJa: "抜け毛防止のDHTブロッカー", price: "4500", originalPrice: "5500", isPopular: true, salesCount: 1230, rating: "4.3", reviewCount: 189 },
    { categoryId: 1, name: "Biotin Supplement", nameJa: "ビオチンサプリ", description: "Hair, skin and nail support", descriptionJa: "髪・肌・爪のサポート", price: "1980", isMonthlySale: true, salesCount: 890, rating: "4.2", reviewCount: 156 },
    { categoryId: 1, name: "Hair Growth Serum", nameJa: "育毛セラム", description: "Natural hair growth formula", descriptionJa: "天然育毛フォーミュラ", price: "2980", salesCount: 670, rating: "4.0", reviewCount: 98 },
    
    // Beauty (categoryId: 2)
    { categoryId: 2, name: "Tretinoin Cream 0.05%", nameJa: "トレチノインクリーム0.05%", description: "Anti-aging skin treatment", descriptionJa: "アンチエイジングスキンケア", price: "2480", originalPrice: "2980", isTimeSale: true, isPopular: true, salesCount: 2100, rating: "4.7", reviewCount: 312 },
    { categoryId: 2, name: "Hydroquinone 4%", nameJa: "ハイドロキノン4%", description: "Skin brightening cream", descriptionJa: "美白クリーム", price: "1980", isPopular: true, salesCount: 1890, rating: "4.4", reviewCount: 267 },
    { categoryId: 2, name: "Vitamin C Serum", nameJa: "ビタミンCセラム", description: "Antioxidant skin serum", descriptionJa: "抗酸化スキンセラム", price: "2280", isMonthlySale: true, salesCount: 1450, rating: "4.6", reviewCount: 198 },
    { categoryId: 2, name: "Collagen Supplement", nameJa: "コラーゲンサプリ", description: "Skin elasticity support", descriptionJa: "肌の弾力サポート", price: "3480", salesCount: 980, rating: "4.3", reviewCount: 145 },
    
    // Diet (categoryId: 3)
    { categoryId: 3, name: "Orlistat 120mg", nameJa: "オルリスタット120mg", description: "Fat absorption blocker", descriptionJa: "脂肪吸収ブロッカー", price: "5980", originalPrice: "7480", isTimeSale: true, isPopular: true, salesCount: 1780, rating: "4.2", reviewCount: 289 },
    { categoryId: 3, name: "Garcinia Cambogia", nameJa: "ガルシニアカンボジア", description: "Natural appetite suppressant", descriptionJa: "天然食欲抑制剤", price: "2480", isPopular: true, salesCount: 1560, rating: "4.0", reviewCount: 234 },
    { categoryId: 3, name: "Green Tea Extract", nameJa: "緑茶エキス", description: "Metabolism booster", descriptionJa: "代謝促進サプリ", price: "1680", isMonthlySale: true, salesCount: 1230, rating: "4.1", reviewCount: 178 },
    { categoryId: 3, name: "CLA Supplement", nameJa: "CLAサプリ", description: "Body fat reduction support", descriptionJa: "体脂肪減少サポート", price: "2180", salesCount: 890, rating: "3.9", reviewCount: 123 },
    
    // Health (categoryId: 4)
    { categoryId: 4, name: "Omega-3 Fish Oil", nameJa: "オメガ3フィッシュオイル", description: "Heart and brain health", descriptionJa: "心臓と脳の健康", price: "2980", isPopular: true, salesCount: 2340, rating: "4.6", reviewCount: 345 },
    { categoryId: 4, name: "Multivitamin Complex", nameJa: "マルチビタミン", description: "Complete daily nutrition", descriptionJa: "毎日の栄養補給", price: "1980", isMonthlySale: true, isPopular: true, salesCount: 2100, rating: "4.5", reviewCount: 312 },
    { categoryId: 4, name: "Probiotics 50 Billion", nameJa: "プロバイオティクス", description: "Gut health support", descriptionJa: "腸内環境サポート", price: "3280", salesCount: 1670, rating: "4.4", reviewCount: 234 },
    { categoryId: 4, name: "Vitamin D3 5000IU", nameJa: "ビタミンD3", description: "Immune system support", descriptionJa: "免疫システムサポート", price: "1480", isTimeSale: true, salesCount: 1450, rating: "4.5", reviewCount: 198 },
    
    // Night Life (categoryId: 5)
    { categoryId: 5, name: "Sildenafil 100mg", nameJa: "シルデナフィル100mg", description: "ED treatment", descriptionJa: "ED治療薬", price: "980", originalPrice: "1480", isTimeSale: true, isPopular: true, salesCount: 3450, rating: "4.7", reviewCount: 456 },
    { categoryId: 5, name: "Tadalafil 20mg", nameJa: "タダラフィル20mg", description: "Long-lasting ED treatment", descriptionJa: "長時間持続ED治療薬", price: "1280", isPopular: true, salesCount: 2890, rating: "4.6", reviewCount: 389 },
    { categoryId: 5, name: "Maca Root Extract", nameJa: "マカエキス", description: "Natural energy booster", descriptionJa: "天然エネルギーブースター", price: "2480", isMonthlySale: true, salesCount: 1560, rating: "4.2", reviewCount: 234 },
    { categoryId: 5, name: "L-Arginine 1000mg", nameJa: "L-アルギニン", description: "Blood flow support", descriptionJa: "血流サポート", price: "1980", salesCount: 1230, rating: "4.1", reviewCount: 178 },
    
    // Mental Care (categoryId: 6)
    { categoryId: 6, name: "Melatonin 5mg", nameJa: "メラトニン5mg", description: "Natural sleep aid", descriptionJa: "天然睡眠補助", price: "1480", isPopular: true, salesCount: 1890, rating: "4.4", reviewCount: 267 },
    { categoryId: 6, name: "Ashwagandha", nameJa: "アシュワガンダ", description: "Stress relief supplement", descriptionJa: "ストレス緩和サプリ", price: "2280", isMonthlySale: true, salesCount: 1560, rating: "4.3", reviewCount: 212 },
    { categoryId: 6, name: "GABA 500mg", nameJa: "GABA", description: "Relaxation support", descriptionJa: "リラックスサポート", price: "1680", salesCount: 1230, rating: "4.2", reviewCount: 178 },
    { categoryId: 6, name: "5-HTP 100mg", nameJa: "5-HTP", description: "Mood support supplement", descriptionJa: "気分サポートサプリ", price: "1980", isTimeSale: true, salesCount: 980, rating: "4.1", reviewCount: 145 },
    
    // Infection (categoryId: 7)
    { categoryId: 7, name: "Azithromycin 500mg", nameJa: "アジスロマイシン500mg", description: "Broad spectrum antibiotic", descriptionJa: "広域抗生物質", price: "2980", isPopular: true, salesCount: 1670, rating: "4.5", reviewCount: 234 },
    { categoryId: 7, name: "Amoxicillin 500mg", nameJa: "アモキシシリン500mg", description: "Common antibiotic", descriptionJa: "一般的な抗生物質", price: "1980", salesCount: 1450, rating: "4.4", reviewCount: 198 },
    { categoryId: 7, name: "Fluconazole 150mg", nameJa: "フルコナゾール150mg", description: "Antifungal treatment", descriptionJa: "抗真菌治療薬", price: "1680", isMonthlySale: true, salesCount: 1230, rating: "4.3", reviewCount: 167 },
    { categoryId: 7, name: "Acyclovir 400mg", nameJa: "アシクロビル400mg", description: "Antiviral medication", descriptionJa: "抗ウイルス薬", price: "2480", salesCount: 980, rating: "4.2", reviewCount: 134 },
    
    // Pet (categoryId: 8)
    { categoryId: 8, name: "Heartgard Plus", nameJa: "ハートガードプラス", description: "Heartworm prevention for dogs", descriptionJa: "犬用フィラリア予防", price: "4980", isPopular: true, salesCount: 1340, rating: "4.7", reviewCount: 189 },
    { categoryId: 8, name: "Frontline Plus", nameJa: "フロントラインプラス", description: "Flea and tick treatment", descriptionJa: "ノミ・ダニ駆除", price: "3980", isMonthlySale: true, salesCount: 1120, rating: "4.6", reviewCount: 156 },
    { categoryId: 8, name: "Pet Probiotics", nameJa: "ペット用プロバイオティクス", description: "Digestive health for pets", descriptionJa: "ペットの消化健康", price: "2480", salesCount: 890, rating: "4.4", reviewCount: 123 },
    { categoryId: 8, name: "Joint Support for Dogs", nameJa: "犬用関節サポート", description: "Glucosamine for dogs", descriptionJa: "犬用グルコサミン", price: "3280", salesCount: 670, rating: "4.3", reviewCount: 98 },
  ];

  for (const product of productsData) {
    await connection.execute(
      `INSERT INTO products (categoryId, name, nameJa, description, descriptionJa, price, originalPrice, isTimeSale, isMonthlySale, isPopular, salesCount, rating, reviewCount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.categoryId, 
        product.name, 
        product.nameJa, 
        product.description, 
        product.descriptionJa, 
        product.price, 
        product.originalPrice || null,
        product.isTimeSale || false,
        product.isMonthlySale || false,
        product.isPopular || false,
        product.salesCount || 0,
        product.rating || "0.0",
        product.reviewCount || 0
      ]
    );
  }

  console.log("Seeding reviews...");
  
  // Sample reviews
  const reviewsData = [
    { productId: 1, userId: 1, userName: "田中太郎", rating: 5, title: "効果抜群！", content: "使い始めて3ヶ月、明らかに髪が増えてきました。副作用もなく安心して使えます。" },
    { productId: 1, userId: 2, userName: "山田花子", rating: 4, title: "期待通り", content: "まだ使い始めて1ヶ月ですが、抜け毛が減った気がします。継続して使っていきたいです。" },
    { productId: 5, userId: 3, userName: "佐藤健", rating: 5, title: "肌がツルツルに", content: "シミが薄くなってきました。毎晩使っています。" },
    { productId: 9, userId: 4, userName: "鈴木美咲", rating: 4, title: "ダイエットに効果的", content: "食事制限と併用して3kg減量できました。" },
    { productId: 17, userId: 5, userName: "高橋誠", rating: 5, title: "即効性あり", content: "30分で効果を実感。コスパも良いです。" },
  ];

  for (const review of reviewsData) {
    await connection.execute(
      "INSERT INTO reviews (productId, userId, userName, rating, title, content) VALUES (?, ?, ?, ?, ?, ?)",
      [review.productId, review.userId, review.userName, review.rating, review.title, review.content]
    );
  }

  console.log("Seed completed!");
  await connection.end();
}

seed().catch(console.error);
