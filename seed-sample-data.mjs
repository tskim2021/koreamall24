import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ============================================================
// 1. 상품별 이미지 URL 매핑 (CDN 업로드 완료된 이미지)
// ============================================================
const CDN = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663287886477';

const productImages = {
  1:  `${CDN}/cJASxcbdTJSwGWOs.jpg`,   // Minoxidil 5%
  2:  `${CDN}/aVBEIoSrxFGoDLHq.png`,   // Finasteride 1mg
  3:  `${CDN}/sMVdWyprFCsfzfNG.jpg`,   // Biotin Supplement
  4:  `${CDN}/BzDdIhYylGNRiJRH.jpg`,   // Hair Growth Serum (Kaminomoto)
  5:  `${CDN}/XDdvxKKgxpBftGYd.jpg`,   // Tretinoin Cream 0.05%
  6:  `${CDN}/aloquugblFZncHtz.png`,   // Hydroquinone 4%
  7:  `${CDN}/MleAYCnFdszcfwTq.jpg`,   // Vitamin C Serum
  8:  `${CDN}/xavqIsUreJnAMcqi.jpg`,   // Collagen Supplement (Shiseido)
  9:  `${CDN}/UFsWNYEXbBcQIhZQ.jpg`,   // Orlistat 120mg
  10: `${CDN}/BkaHDbcyxCQFWZcK.jpg`,   // Garcinia Cambogia
  11: `${CDN}/yzuHuFfPVdWwJMVc.jpg`,   // Green Tea Extract
  12: `${CDN}/oaNOMHjgHaJIhVUC.jpg`,   // CLA Supplement
  13: `${CDN}/FCfKFoYdYFIpxkep.jpg`,   // Omega-3 Fish Oil
  14: `${CDN}/IFnoxNFFpRTFtNOI.jpg`,   // Multivitamin Complex
  15: `${CDN}/tXCojMgPSqJQFqny.jpg`,   // Probiotics 50 Billion
  16: `${CDN}/zyTTSnxSeRJPPazd.jpg`,   // Vitamin D3 5000IU
  17: `${CDN}/cJASxcbdTJSwGWOs.jpg`,   // Sildenafil 100mg (reuse minoxidil-like)
  18: `${CDN}/cHEzDDwClwHnHqII.jpg`,   // Tadalafil 20mg (Maca-like)
  19: `${CDN}/cHEzDDwClwHnHqII.jpg`,   // Maca Root Extract
  20: `${CDN}/HHCGfxgJmzsKndmz.jpg`,   // L-Arginine 1000mg
  21: `${CDN}/MrYnXYwLxiXiyZcH.jpg`,   // Melatonin 5mg
  22: `${CDN}/mOxcaIxuphGqisQb.jpg`,   // Ashwagandha
  23: `${CDN}/WOgEpngIYpWzkSFA.jpg`,   // GABA 500mg
  24: `${CDN}/xJUgdJQzfoQHRWKj.jpg`,   // 5-HTP 100mg
  25: `${CDN}/dhyHgLfyrRvEZPAK.jpg`,   // Azithromycin 500mg
  26: `${CDN}/zauGDNFNUYutnJam.jpg`,   // Amoxicillin 500mg
  27: `${CDN}/btQFLyKZdyQzMGxR.jpg`,   // Fluconazole 150mg
  28: `${CDN}/YnXVuKfAqUbRIjnq.png`,   // Acyclovir 400mg
  29: `${CDN}/YfIhWEEAYSPjzyjX.jpg`,   // Heartgard Plus
  30: `${CDN}/kiFwaMhbXpceQkch.jpg`,   // Frontline Plus
};

console.log('=== 1. 상품 이미지 URL 업데이트 ===');
for (const [id, url] of Object.entries(productImages)) {
  await conn.execute('UPDATE products SET imageUrl = ? WHERE id = ?', [url, id]);
}
console.log(`  ${Object.keys(productImages).length}개 상품 이미지 업데이트 완료`);


// ============================================================
// 2. 리뷰 생성 (상품당 20개)
// ============================================================
console.log('\n=== 2. 리뷰 생성 ===');

// 기존 리뷰 삭제
await conn.execute('DELETE FROM reviews');
console.log('  기존 리뷰 삭제 완료');

const reviewTemplates = [
  // 5점 리뷰 (8개)
  { rating: 5, title: '최고의 제품입니다!', content: '일본 직구로 구매했는데 정품이고 효과가 정말 좋습니다. 배송도 빠르고 포장도 꼼꼼했어요. 재구매 의사 100%입니다!' },
  { rating: 5, title: '리피트 구매 중', content: '벌써 3번째 구매입니다. 일본 약국에서 사는 것보다 편하고 가격도 합리적이에요. 앞으로도 계속 이용할 예정입니다.' },
  { rating: 5, title: '효과 확실해요', content: '사용한 지 2주 정도 됐는데 확실히 효과가 있네요. 일본 제품이라 믿고 사용할 수 있어서 좋습니다.' },
  { rating: 5, title: '가성비 최고', content: 'まとめ買い로 3개 세트 구매했더니 개당 가격이 많이 저렴해졌어요. 대량구매 할인이 정말 좋습니다!' },
  { rating: 5, title: '빠른 배송 감사합니다', content: '주문 후 5일 만에 도착했어요. 일본 직구치고는 정말 빠릅니다. 제품 상태도 완벽했습니다.' },
  { rating: 5, title: '친구 추천으로 구매', content: '친구가 추천해서 구매했는데 정말 만족합니다. 일본 현지에서 인기 있는 제품이라 그런지 품질이 다릅니다.' },
  { rating: 5, title: '정품 확인 완료', content: '일본 약국에서 직접 사본 적이 있는데 동일한 제품입니다. 정품이 확실하고 유통기한도 넉넉합니다.' },
  { rating: 5, title: '가족 모두 사용 중', content: '가족 모두 사용하고 있어서 항상 대량으로 주문합니다. 세트 할인 덕분에 부담 없이 구매할 수 있어요.' },
  // 4점 리뷰 (6개)
  { rating: 4, title: '전반적으로 만족', content: '제품 자체는 매우 좋습니다. 배송이 조금 더 빨랐으면 하는 아쉬움이 있지만, 일본 직구라 이해합니다.' },
  { rating: 4, title: '좋은 제품이에요', content: '효과도 좋고 가격도 합리적입니다. 다만 설명서가 일본어라 처음에 조금 헷갈렸어요. 한국어 안내가 있으면 좋겠습니다.' },
  { rating: 4, title: '재구매 예정', content: '첫 구매인데 만족스럽습니다. 포장이 꼼꼼하고 제품 상태도 좋았어요. 다음에도 구매할 예정입니다.' },
  { rating: 4, title: '기대 이상이에요', content: '솔직히 반신반의했는데 사용해보니 확실히 효과가 있습니다. 별 4개 드립니다.' },
  { rating: 4, title: '일본 약국 품질 그대로', content: '일본 여행 때 약국에서 사던 제품을 집에서 편하게 주문할 수 있어서 좋아요. 품질도 동일합니다.' },
  { rating: 4, title: '포장이 꼼꼼해요', content: '해외 배송이라 걱정했는데 포장이 정말 꼼꼼하게 되어 있었습니다. 제품 손상 없이 잘 도착했어요.' },
  // 3점 리뷰 (4개)
  { rating: 3, title: '보통이에요', content: '기대했던 것보다는 효과가 미미한 것 같습니다. 좀 더 사용해봐야 할 것 같아요. 배송은 빨랐습니다.' },
  { rating: 3, title: '가격이 조금 아쉬워요', content: '제품은 좋은데 일본 현지 가격보다 조금 비싼 것 같아요. 세트 구매하면 괜찮긴 합니다.' },
  { rating: 3, title: '효과는 천천히', content: '아직 큰 효과를 느끼지 못했지만 꾸준히 사용해볼 예정입니다. 일본 제품이라 믿고 사용합니다.' },
  { rating: 3, title: '배송이 좀 걸려요', content: '제품 자체는 좋은데 배송에 10일 정도 걸렸어요. 급하게 필요한 분들은 참고하세요.' },
  // 2점 리뷰 (1개)
  { rating: 2, title: '기대에 못 미쳤어요', content: '개인차가 있는 것 같습니다. 저한테는 큰 효과가 없었어요. 하지만 제품 자체의 품질은 좋습니다.' },
  // 1점 리뷰 (1개)
  { rating: 1, title: '배송 중 파손', content: '배송 중에 제품이 약간 파손되어 도착했습니다. 고객센터에 문의했더니 빠르게 교환 처리해주셨습니다.' },
];

const reviewerNames = [
  '김민수', '이지영', '박서준', '최유나', '정현우',
  '강수진', '윤도현', '한미래', '송지호', '임채원',
  '오승민', '배은지', '조태양', '신하늘', '류다은',
  '문성호', '장예린', '권지민', '홍석현', '남보라',
];

// 모든 상품 가져오기
const [products] = await conn.execute('SELECT id, name FROM products ORDER BY id');

let totalReviews = 0;
for (const product of products) {
  const shuffled = [...reviewTemplates].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 20; i++) {
    const template = shuffled[i % shuffled.length];
    const reviewer = reviewerNames[i];
    // 랜덤 날짜 (최근 6개월)
    const daysAgo = Math.floor(Math.random() * 180);
    const reviewDate = new Date(Date.now() - daysAgo * 86400000);
    
    await conn.execute(
      `INSERT INTO reviews (productId, userId, userName, rating, title, content, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)`,
      [
        product.id,
        1000 + i, // fake userId
        reviewer,
        template.rating,
        template.title,
        template.content,
        reviewDate,
      ]
    );
    totalReviews++;
  }
}
console.log(`  ${totalReviews}개 리뷰 생성 완료 (${products.length}개 상품 x 20개)`);


// ============================================================
// 3. 주문 생성 (10건)
// ============================================================
console.log('\n=== 3. 주문 생성 ===');

// 기존 주문 삭제
await conn.execute('DELETE FROM order_items');
await conn.execute('DELETE FROM orders');
console.log('  기존 주문 삭제 완료');

const orderStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'delivered', 'delivered', 'delivered'];
const shippingNames = ['김민수', '이지영', '박서준', '최유나', '정현우', '강수진', '윤도현', '한미래', '송지호', '임채원'];
const addresses = [
  { postal: '06134', addr: '서울특별시 강남구 테헤란로 123', phone: '010-1234-5678' },
  { postal: '04524', addr: '서울특별시 중구 세종대로 110', phone: '010-2345-6789' },
  { postal: '13494', addr: '경기도 성남시 분당구 판교로 256', phone: '010-3456-7890' },
  { postal: '48058', addr: '부산광역시 해운대구 센텀중앙로 79', phone: '010-4567-8901' },
  { postal: '61186', addr: '광주광역시 북구 용봉로 77', phone: '010-5678-9012' },
  { postal: '34134', addr: '대전광역시 유성구 대학로 99', phone: '010-6789-0123' },
  { postal: '41566', addr: '대구광역시 북구 대학로 80', phone: '010-7890-1234' },
  { postal: '21999', addr: '인천광역시 연수구 송도과학로 32', phone: '010-8901-2345' },
  { postal: '63197', addr: '제주특별자치도 제주시 첨단로 242', phone: '010-9012-3456' },
  { postal: '24341', addr: '강원도 춘천시 강원대학길 1', phone: '010-0123-4567' },
];

for (let i = 0; i < 10; i++) {
  const status = orderStatuses[i % orderStatuses.length];
  const daysAgo = Math.floor(Math.random() * 60) + 1;
  const orderDate = new Date(Date.now() - daysAgo * 86400000);
  const orderNumber = `KM${String(Date.now()).slice(-8)}${String(i).padStart(2, '0')}`;
  
  // 주문당 1~4개 상품 랜덤 선택
  const itemCount = Math.floor(Math.random() * 4) + 1;
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);
  
  let totalAmount = 0;
  const orderItems = [];
  
  for (const prod of shuffledProducts) {
    const qty = Math.floor(Math.random() * 3) + 1;
    const [priceRows] = await conn.execute('SELECT price FROM products WHERE id = ?', [prod.id]);
    const unitPrice = parseFloat(priceRows[0].price);
    const subtotal = unitPrice * qty;
    totalAmount += subtotal;
    orderItems.push({ productId: prod.id, productName: prod.name, qty, unitPrice, subtotal });
  }
  
  const shippingFee = totalAmount >= 10000 ? 0 : 500;
  totalAmount += shippingFee;
  const addr = addresses[i];
  
  // 배송 관련 날짜
  let shippedAt = null;
  let deliveredAt = null;
  let trackingNumber = null;
  
  if (['shipped', 'delivered'].includes(status)) {
    shippedAt = new Date(orderDate.getTime() + 2 * 86400000);
    trackingNumber = `JP${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`;
  }
  if (status === 'delivered') {
    deliveredAt = new Date(orderDate.getTime() + 7 * 86400000);
  }
  
  const [orderResult] = await conn.execute(
    `INSERT INTO orders (userId, orderNumber, status, totalAmount, shippingFee, pointsUsed, pointsEarned, 
     shippingName, shippingPostalCode, shippingAddress, shippingPhone, trackingNumber, shippedAt, deliveredAt, createdAt) 
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1, // admin user
      orderNumber,
      status,
      totalAmount,
      shippingFee,
      Math.floor(totalAmount / 100), // 1% 포인트
      shippingNames[i],
      addr.postal,
      addr.addr,
      addr.phone,
      trackingNumber,
      shippedAt,
      deliveredAt,
      orderDate,
    ]
  );
  
  const orderId = orderResult.insertId;
  
  // 주문 아이템 추가
  for (const item of orderItems) {
    const imgUrl = productImages[item.productId] || null;
    await conn.execute(
      `INSERT INTO order_items (orderId, productId, productName, productNameJa, productImageUrl, quantity, unitPrice, subtotal) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, item.productId, item.productName, item.productName, imgUrl, item.qty, item.unitPrice, item.subtotal]
    );
  }
  
  console.log(`  주문 #${orderNumber} 생성 (${status}, ${orderItems.length}개 상품, ¥${totalAmount})`);
}

console.log('\n=== 완료 ===');
const [reviewCount] = await conn.execute('SELECT COUNT(*) as cnt FROM reviews');
const [orderCount] = await conn.execute('SELECT COUNT(*) as cnt FROM orders');
const [orderItemCount] = await conn.execute('SELECT COUNT(*) as cnt FROM order_items');
console.log(`  총 리뷰: ${reviewCount[0].cnt}개`);
console.log(`  총 주문: ${orderCount[0].cnt}건`);
console.log(`  총 주문 아이템: ${orderItemCount[0].cnt}개`);

await conn.end();
console.log('\n시드 데이터 생성 완료!');
