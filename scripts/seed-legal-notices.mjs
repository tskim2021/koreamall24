/**
 * 법적 고지 페이지 4종 실제 내용 DB 저장 스크립트
 * 사업자 정보: IS GLOBAL LIMITED
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const legalData = [
  {
    key: "tokushoho",
    titleJa: "特定商取引法に基づく表記",
    contentJa: `<div class="legal-content">
<h2>特定商取引法に基づく表記</h2>
<table class="legal-table">
  <tbody>
    <tr><th>販売業者</th><td>IS GLOBAL LIMITED</td></tr>
    <tr><th>運営責任者</th><td>ケイシーキム</td></tr>
    <tr><th>所在地</th><td>Rm 901&amp;902 9/F Taurus Bldg 21A&amp;B Granville Road Tsim Sha Tsui KL</td></tr>
    <tr><th>電話番号</th><td>090-8440-2679<br><small>（受付時間：平日10:00〜18:00）</small></td></tr>
    <tr><th>メールアドレス</th><td><a href="mailto:info@yakurishop.net">info@yakurishop.net</a></td></tr>
    <tr><th>販売URL</th><td><a href="https://yakurishop.net">https://yakurishop.net</a></td></tr>
    <tr><th>商品代金以外の必要料金</th><td>全商品送料無料（消費税込み）</td></tr>
    <tr><th>お支払い方法</th><td>クレジットカード決済（VISA・Mastercard・JCB・American Express）</td></tr>
    <tr><th>商品の引渡時期</th><td>ご注文確認後、3〜7営業日以内に発送いたします。<br>※海外からの発送となるため、お届けまでに7〜21日程度かかる場合がございます。</td></tr>
    <tr><th>返品・交換について</th><td>商品到着後7日以内にご連絡ください。未開封の商品に限り返品・交換を承ります。<br>ただし、お客様都合による返品の場合、返送料はお客様のご負担となります。<br>医薬品の性質上、開封済み商品の返品・交換はお受けできません。</td></tr>
    <tr><th>個人輸入について</th><td>当サイトで取り扱う医薬品は、お客様個人の使用を目的とした個人輸入代行サービスです。<br>医薬品の個人輸入は、輸入者自身の個人的な使用を目的とする範囲でのみ認められています。<br>第三者への転売・譲渡は法律により禁止されています。</td></tr>
  </tbody>
</table>
</div>`,
  },
  {
    key: "privacy_policy",
    titleJa: "プライバシーポリシー",
    contentJa: `<div class="legal-content">
<h2>プライバシーポリシー</h2>
<p>IS GLOBAL LIMITED（以下「当社」）は、お客様の個人情報の保護を重要な責務と認識し、以下のプライバシーポリシーに基づき、個人情報を適切に取り扱います。</p>

<h3>1. 収集する個人情報</h3>
<p>当社は、サービス提供のために以下の個人情報を収集することがあります。</p>
<ul>
  <li>氏名、住所、電話番号、メールアドレス等の連絡先情報</li>
  <li>クレジットカード情報等の決済情報（当社サーバーには保存せず、決済代行会社が管理）</li>
  <li>購入履歴、閲覧履歴等のサービス利用情報</li>
  <li>IPアドレス、Cookie情報等のアクセスログ</li>
</ul>

<h3>2. 個人情報の利用目的</h3>
<p>収集した個人情報は、以下の目的のために利用します。</p>
<ul>
  <li>商品の注文処理・発送・配送状況のご連絡</li>
  <li>お問い合わせへの対応</li>
  <li>サービスの改善・新サービスの開発</li>
  <li>キャンペーン・お得な情報のご案内（メールマガジン等）</li>
  <li>不正利用の防止・セキュリティ確保</li>
</ul>

<h3>3. 個人情報の第三者提供</h3>
<p>当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。</p>
<ul>
  <li>お客様の同意がある場合</li>
  <li>商品の配送のために配送業者へ必要な情報を提供する場合</li>
  <li>決済処理のために決済代行会社へ必要な情報を提供する場合</li>
  <li>法令に基づき開示が必要な場合</li>
</ul>

<h3>4. 個人情報の管理</h3>
<p>当社は、個人情報への不正アクセス・紛失・破損・改ざん・漏洩等を防止するため、適切なセキュリティ対策を実施します。SSL暗号化通信を使用し、お客様の情報を安全に保護します。</p>

<h3>5. Cookieの使用について</h3>
<p>当サイトでは、サービス向上のためCookieを使用しています。Cookieはブラウザの設定により無効化することができますが、一部機能が利用できなくなる場合があります。</p>

<h3>6. 個人情報の開示・訂正・削除</h3>
<p>お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除を請求することができます。ご請求の際は、<a href="mailto:info@yakurishop.net">info@yakurishop.net</a>までご連絡ください。</p>

<h3>7. プライバシーポリシーの変更</h3>
<p>当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更後のポリシーは、当サイトに掲載した時点から効力を生じるものとします。</p>

<h3>8. お問い合わせ</h3>
<p>個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
<p>
  IS GLOBAL LIMITED<br>
  メール：<a href="mailto:info@yakurishop.net">info@yakurishop.net</a><br>
  電話：090-8440-2679（平日10:00〜18:00）
</p>

<p class="updated-at">制定日：2024年1月1日<br>最終改定日：2025年4月1日</p>
</div>`,
  },
  {
    key: "terms_of_service",
    titleJa: "利用規約",
    contentJa: `<div class="legal-content">
<h2>利用規約</h2>
<p>本利用規約（以下「本規約」）は、IS GLOBAL LIMITED（以下「当社」）が運営するYakuri Shop（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただく前に、本規約をよくお読みください。</p>

<h3>第1条（適用）</h3>
<p>本規約は、本サービスの利用に関して、当社とお客様との間に適用されます。お客様が本サービスを利用した時点で、本規約に同意したものとみなします。</p>

<h3>第2条（個人輸入の性質）</h3>
<p>本サービスは、お客様個人の使用を目的とした医薬品の個人輸入代行サービスです。以下の事項をご理解・ご承諾の上、ご利用ください。</p>
<ul>
  <li>医薬品の個人輸入は、輸入者自身の個人的な使用を目的とする範囲でのみ認められています。</li>
  <li>第三者への転売・譲渡は薬機法により禁止されています。</li>
  <li>輸入した医薬品は、日本国内の薬事承認を受けていない場合があります。</li>
  <li>医師の指示なく医薬品を使用することによるリスクはお客様自身が負うものとします。</li>
</ul>

<h3>第3条（会員登録）</h3>
<p>本サービスの一部機能は、会員登録が必要です。会員登録の際は、正確な情報を入力してください。虚偽の情報を登録した場合、当社はアカウントを停止することがあります。</p>

<h3>第4条（禁止事項）</h3>
<p>お客様は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
<ul>
  <li>法令または公序良俗に違反する行為</li>
  <li>購入した医薬品の第三者への転売・譲渡</li>
  <li>当社または第三者の知的財産権を侵害する行為</li>
  <li>本サービスの運営を妨害する行為</li>
  <li>他のお客様への迷惑行為</li>
  <li>不正アクセスその他の不正行為</li>
</ul>

<h3>第5条（注文・決済）</h3>
<p>ご注文は、お客様が注文を確定した時点で成立します。決済はクレジットカードにより行われ、注文確定後にご請求されます。</p>

<h3>第6条（返品・キャンセル）</h3>
<p>商品到着後7日以内に未開封の状態でご連絡いただいた場合に限り、返品・交換を承ります。医薬品の性質上、開封済み商品の返品はお受けできません。なお、お客様都合による返品の場合、返送料はお客様のご負担となります。</p>

<h3>第7条（免責事項）</h3>
<p>当社は、本サービスを通じて購入した医薬品の使用による効果・副作用等について、法令の定める範囲を超えた責任を負いません。医薬品の使用に際しては、必ず添付文書をよく読み、用法・用量を守ってご使用ください。</p>

<h3>第8条（サービスの変更・終了）</h3>
<p>当社は、お客様への事前通知なく、本サービスの内容を変更または終了することがあります。</p>

<h3>第9条（準拠法・管轄裁判所）</h3>
<p>本規約は日本法に準拠し、本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>

<p class="updated-at">制定日：2024年1月1日<br>最終改定日：2025年4月1日</p>
</div>`,
  },
  {
    key: "first_time_customer",
    titleJa: "初めてのお客様へ",
    contentJa: `<div class="legal-content">
<h2>初めてのお客様へ</h2>
<p>Yakuri Shopへようこそ！当サイトは、日本国内では入手が難しい海外の医薬品・健康商品を、個人輸入代行という形でお届けするサービスです。初めてご利用のお客様に向けて、サービスの概要と安全なご利用方法をご説明します。</p>

<h3>個人輸入とは？</h3>
<p>個人輸入とは、海外で販売されている商品を、個人が自分自身で使用する目的で日本に輸入することです。日本の薬機法では、個人が自己使用を目的として医薬品を輸入することは認められています。</p>
<div class="notice-box">
  <strong>⚠ 重要なご注意</strong>
  <ul>
    <li>輸入した医薬品は、ご自身の使用のみに限られます。第三者への転売・譲渡は法律により禁止されています。</li>
    <li>医師の処方箋または指示を伴わない医薬品の使用はお控えください。</li>
    <li>持病のある方、妊娠中・授乳中の方は、必ず医師にご相談の上ご使用ください。</li>
  </ul>
</div>

<h3>ご注文の流れ</h3>
<ol>
  <li><strong>商品を選ぶ</strong>：カテゴリーから商品を探すか、検索機能をご利用ください。</li>
  <li><strong>カートに追加</strong>：ご希望の商品・数量を選択してカートに追加します。</li>
  <li><strong>会員登録・ログイン</strong>：初めてのご注文には会員登録が必要です。</li>
  <li><strong>配送先・決済情報の入力</strong>：お届け先住所とクレジットカード情報を入力します。</li>
  <li><strong>注文確定</strong>：内容を確認して注文を確定します。確認メールが届きます。</li>
  <li><strong>発送・お届け</strong>：通常3〜7営業日で発送。お届けまで7〜21日程度かかります。</li>
</ol>

<h3>お支払い方法</h3>
<p>クレジットカード（VISA・Mastercard・JCB・American Express）でのお支払いに対応しています。全商品送料無料でお届けします。</p>

<h3>配送について</h3>
<p>商品は海外の正規薬局から直接発送されます。発送後、追跡番号をメールでお知らせします。税関検査等により、お届けが遅れる場合がございますが、ご了承ください。</p>

<h3>返品・交換について</h3>
<p>商品到着後7日以内に未開封の状態でご連絡いただいた場合、返品・交換を承ります。医薬品の性質上、開封済み商品の返品はお受けできません。</p>

<h3>よくあるご質問</h3>
<dl>
  <dt>Q. 処方箋は必要ですか？</dt>
  <dd>A. 個人輸入の場合、処方箋は不要ですが、医師の指示のもとでご使用されることを強くお勧めします。</dd>
  <dt>Q. 税関で止められることはありますか？</dt>
  <dd>A. 個人使用の範囲内であれば、通常は問題なく通関します。ただし、税関の判断により検査が行われる場合があります。</dd>
  <dt>Q. 副作用が出た場合はどうすればいいですか？</dt>
  <dd>A. 直ちに使用を中止し、医師または薬剤師にご相談ください。</dd>
</dl>

<h3>お問い合わせ</h3>
<p>ご不明な点は、お気軽にお問い合わせください。</p>
<p>
  メール：<a href="mailto:info@yakurishop.net">info@yakurishop.net</a><br>
  電話：090-8440-2679（平日10:00〜18:00）
</p>
</div>`,
  },
];

async function main() {
  const url = new URL(DATABASE_URL);
  const connection = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected to database");

  for (const item of legalData) {
    const [existing] = await connection.execute(
      "SELECT id FROM legalNotices WHERE `key` = ?",
      [item.key]
    );

    if (existing.length > 0) {
      await connection.execute(
        "UPDATE legalNotices SET titleJa = ?, contentJa = ?, isPublished = 1 WHERE `key` = ?",
        [item.titleJa, item.contentJa, item.key]
      );
      console.log(`✅ Updated: ${item.key} - ${item.titleJa}`);
    } else {
      await connection.execute(
        "INSERT INTO legalNotices (`key`, titleJa, contentJa, isPublished) VALUES (?, ?, ?, 1)",
        [item.key, item.titleJa, item.contentJa]
      );
      console.log(`✅ Inserted: ${item.key} - ${item.titleJa}`);
    }
  }

  await connection.end();
  console.log("Done!");
}

main().catch(console.error);
