CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(50),
	`recipientNameKanji` varchar(100) NOT NULL,
	`recipientNameHiragana` varchar(100) NOT NULL,
	`postalCode` varchar(10) NOT NULL,
	`prefecture` varchar(50) NOT NULL,
	`city` varchar(100) NOT NULL,
	`address1` varchar(255) NOT NULL,
	`address2` varchar(255),
	`phone` varchar(20) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcement_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcement_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleJa` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`contentJa` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`isPinned` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleJa` varchar(255) NOT NULL,
	`subtitle` varchar(255),
	`subtitleJa` varchar(255),
	`imageUrl` varchar(500),
	`linkUrl` varchar(500),
	`bgColor` varchar(50) DEFAULT '#f0f9ff',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`priceTierId` int,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameJa` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `chatbotBlockedKeywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(200) NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatbotBlockedKeywords_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatbotBlockedKeywords_keyword_unique` UNIQUE(`keyword`)
);
--> statement-breakpoint
CREATE TABLE `chatbotConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(100) NOT NULL,
	`pageContext` varchar(50),
	`productId` int,
	`messageCount` int NOT NULL DEFAULT 0,
	`faqMatchCount` int NOT NULL DEFAULT 0,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `chatbotConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbotFaqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionJa` text,
	`questionKo` text,
	`answerJa` text,
	`answerKo` text,
	`category` enum('product','order_shipping','payment','member_points','other') NOT NULL DEFAULT 'other',
	`keywords` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`matchCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbotFaqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbotMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`isFaqMatch` tinyint NOT NULL DEFAULT 0,
	`faqId` int,
	`tokenCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatbotMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbotSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbotSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatbotSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `checkout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`userEmail` varchar(320) NOT NULL,
	`shippingName` varchar(100) NOT NULL,
	`shippingPostalCode` varchar(20) NOT NULL,
	`shippingPrefecture` varchar(50) NOT NULL,
	`shippingCity` varchar(100) NOT NULL,
	`shippingAddress1` varchar(255) NOT NULL,
	`shippingAddress2` varchar(255),
	`shippingPhone` varchar(20) NOT NULL,
	`itemsJson` text NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`shippingFee` decimal(10,2) NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`status` enum('pending','completed','expired','failed') NOT NULL DEFAULT 'pending',
	`failureReason` text,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkout_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `checkout_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`discountAmount` decimal(10,2) NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`nameJa` varchar(255) NOT NULL,
	`description` text,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL,
	`minOrderAmount` decimal(10,2) DEFAULT '0.00',
	`maxDiscountAmount` decimal(10,2),
	`maxUses` int,
	`maxUsesPerUser` int DEFAULT 1,
	`currentUses` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customer_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`adminId` int NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleJa` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`descriptionJa` text NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(255) NOT NULL,
	`questionJa` varchar(255) NOT NULL,
	`answer` text NOT NULL,
	`answerJa` text NOT NULL,
	`category` varchar(100),
	`categoryJa` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleJa` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`contentJa` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`isPrivate` boolean NOT NULL DEFAULT false,
	`userId` int,
	`image_urls` text,
	`status` enum('pending','answered') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiry_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`imageUrl` varchar(1024),
	`image_urls` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiry_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legalNotices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`titleJa` varchar(200) NOT NULL,
	`contentJa` text NOT NULL,
	`isPublished` tinyint NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legalNotices_id` PRIMARY KEY(`id`),
	CONSTRAINT `legalNotices_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productNameJa` varchar(255) NOT NULL,
	`productImageUrl` varchar(500),
	`priceTierId` int,
	`tierName` varchar(255),
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`reviewEligible` tinyint NOT NULL DEFAULT 0,
	`reviewId` int,
	`reviewSubmitted` timestamp,
	`reviewReminderSent` timestamp,
	`cancelledAt` timestamp,
	`cancelReason` varchar(500),
	`sellerOptionCode` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`status` enum('pending','paid','confirmed','processing','shipped','delivered','cancelled','partially_cancelled') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2) NOT NULL,
	`shippingFee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`couponDiscount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`pointsUsed` int NOT NULL DEFAULT 0,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`shippingName` varchar(100) NOT NULL,
	`shippingPostalCode` varchar(10) NOT NULL,
	`shippingAddress` text NOT NULL,
	`shippingPhone` varchar(20),
	`trackingNumber` varchar(50),
	`shippedAt` timestamp,
	`deliveredAt` timestamp,
	`paymentMethod` varchar(50),
	`paymentStatus` varchar(50),
	`stripePaymentId` varchar(255),
	`adminNotes` text,
	`bankTransferConfirmedAt` timestamp,
	`bankTransferConfirmedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `paymentSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('stripe','airwallex','2checkout','payoneer','bank_transfer') NOT NULL,
	`isActive` int NOT NULL DEFAULT 0,
	`displayName` varchar(100),
	`publicKey` text,
	`secretKey` text,
	`webhookSecret` text,
	`extraConfig` json,
	`mode` enum('test','live') NOT NULL DEFAULT 'test',
	`supportedCurrencies` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentSettings_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('stripe','airwallex','2checkout','payoneer','bank_transfer') NOT NULL,
	`status` enum('pending','processing','succeeded','failed','cancelled','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KRW',
	`externalPaymentId` varchar(255),
	`externalSessionId` varchar(255),
	`paymentMethod` varchar(64),
	`cardLast4` varchar(4),
	`cardBrand` varchar(32),
	`refundAmount` decimal(12,2),
	`refundReason` text,
	`metadata` json,
	`errorMessage` text,
	`paidAt` timestamp,
	`refundedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`type` enum('earn','spend','admin_add','admin_deduct') NOT NULL,
	`amount` int NOT NULL,
	`balance` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `point_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_image_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`imageUrlMedium` varchar(500),
	`imageUrlThumb` varchar(500),
	`blurDataUrl` text,
	`sortOrder` int NOT NULL,
	`isThumbnail` boolean NOT NULL DEFAULT false,
	`width` int,
	`height` int,
	`fileSize` int,
	`optimized` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_image_order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_price_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`discountPercent` int NOT NULL DEFAULT 0,
	`stock` int NOT NULL DEFAULT 0,
	`isPopular` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_price_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_promotion_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`discountPercent` int NOT NULL,
	`maxUses` int,
	`currentUses` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_promotion_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_promotion_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `product_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int,
	`question` text NOT NULL,
	`answer` text,
	`answeredBy` int,
	`answeredAt` timestamp,
	`isPublic` boolean NOT NULL DEFAULT true,
	`answerImageUrl` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_sales_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`cost` decimal(10,2),
	`marginPercent` decimal(5,2),
	`timeSaleStartAt` timestamp,
	`timeSaleEndAt` timestamp,
	`timeSaleDiscountPercent` int,
	`monthlySaleDiscountPercent` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_sales_info_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_sales_info_productId_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
CREATE TABLE `product_seo_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`metaDescription` text,
	`keywords` text,
	`urlSlug` varchar(255),
	`ogTitle` varchar(255),
	`ogDescription` text,
	`ogImage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_seo_metadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_seo_metadata_productId_unique` UNIQUE(`productId`),
	CONSTRAINT `product_seo_metadata_urlSlug_unique` UNIQUE(`urlSlug`)
);
--> statement-breakpoint
CREATE TABLE `product_shipping_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`weight` decimal(8,3),
	`width` decimal(8,2),
	`height` decimal(8,2),
	`depth` decimal(8,2),
	`shippingCost` decimal(10,2),
	`supplierId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_shipping_info_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_shipping_info_productId_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
CREATE TABLE `product_stock_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`previousStock` int NOT NULL,
	`newStock` int NOT NULL,
	`changeReason` varchar(100) NOT NULL,
	`orderId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_stock_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`categoryId` int NOT NULL,
	`viewCount` int NOT NULL DEFAULT 1,
	`lastViewedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`categoryIds` text,
	`name` varchar(255) NOT NULL,
	`nameJa` varchar(255) NOT NULL,
	`description` text,
	`descriptionJa` text,
	`price` int NOT NULL,
	`originalPrice` int,
	`imageUrl` varchar(500),
	`imageUrls` text,
	`stock` int NOT NULL DEFAULT 100,
	`trackInventory` boolean NOT NULL DEFAULT false,
	`isTimeSale` boolean NOT NULL DEFAULT false,
	`isMonthlySale` boolean NOT NULL DEFAULT false,
	`isPopular` boolean NOT NULL DEFAULT false,
	`salesCount` int NOT NULL DEFAULT 0,
	`rating` decimal(2,1) DEFAULT '0.0',
	`reviewCount` int NOT NULL DEFAULT 0,
	`activeIngredient` varchar(255),
	`activeIngredientJa` varchar(255),
	`volume` varchar(100),
	`brand` varchar(255),
	`brandJa` varchar(255),
	`shippingFrom` varchar(100),
	`deliveryDays` varchar(50) DEFAULT '10-14',
	`usageMethod` text,
	`usageMethodJa` text,
	`sideEffects` text,
	`sideEffectsJa` text,
	`precautions` text,
	`precautionsJa` text,
	`contraindications` text,
	`contraindicationsJa` text,
	`setPricing` text,
	`baseDiscountRate` int DEFAULT 0,
	`discountTiers` text,
	`pointsPercent` int DEFAULT 1,
	`searchTags` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`recommendedProductId` int NOT NULL,
	`recommendationType` enum('tag_based','collaborative','category_based') NOT NULL,
	`eventType` enum('impression','click') NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registered_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255) NOT NULL,
	`nameKanji` varchar(100) NOT NULL,
	`nameHiragana` varchar(100) NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`phone` varchar(20),
	`address` text,
	`points` int NOT NULL DEFAULT 500,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isEmailVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registered_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `registered_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `related_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`relatedProductId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `related_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`reporterUserId` int NOT NULL,
	`reason` enum('spam','inappropriate','offensive','fake','other') NOT NULL,
	`comment` text,
	`status` enum('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int,
	`userName` varchar(100),
	`rating` int NOT NULL,
	`title` varchar(255),
	`content` text,
	`images` json,
	`isBest` tinyint NOT NULL DEFAULT 0,
	`bestSelectedAt` timestamp,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
	`rejectionReason` text,
	`reportCount` int NOT NULL DEFAULT 0,
	`isVerifiedPurchase` boolean NOT NULL DEFAULT false,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seoSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page` varchar(100) NOT NULL,
	`title` varchar(255),
	`description` text,
	`keywords` text,
	`ogImage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seoSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `seoSettings_page_unique` UNIQUE(`page`)
);
--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipmentId` int NOT NULL,
	`eventType` enum('order_placed','payment_confirmed','processing','picked_up','departed','in_transit','out_for_delivery','delivered','failed','returned') NOT NULL,
	`location` varchar(255),
	`locationJa` varchar(255),
	`description` varchar(255),
	`descriptionJa` varchar(255),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int,
	`trackingNumber` varchar(50),
	`carrier` varchar(50) DEFAULT 'Japan Post',
	`status` enum('pending','picked_up','in_transit','out_for_delivery','delivered','failed','returned') NOT NULL DEFAULT 'pending',
	`estimatedDeliveryDate` timestamp,
	`actualDeliveryDate` timestamp,
	`currentLocation` varchar(255),
	`currentLocationJa` varchar(255),
	`notes` text,
	`notesJa` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`nameKanji` varchar(100),
	`nameHiragana` varchar(100),
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`points` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_product_idx` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `addresses` (`userId`);--> statement-breakpoint
CREATE INDEX `chatbot_session_idx` ON `chatbotConversations` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chatbot_user_idx` ON `chatbotConversations` (`userId`);--> statement-breakpoint
CREATE INDEX `chatbot_conv_idx` ON `chatbotMessages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `session_idx` ON `checkout_sessions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `checkout_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `checkout_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `customer_idx` ON `customer_notes` (`customerId`);--> statement-breakpoint
CREATE INDEX `payment_order_idx` ON `payments` (`orderId`);--> statement-breakpoint
CREATE INDEX `payment_user_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `point_transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `point_transactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `point_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `review_idx` ON `reviewReports` (`reviewId`);--> statement-breakpoint
CREATE INDEX `reporter_idx` ON `reviewReports` (`reporterUserId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `reviewReports` (`status`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `wishlists` (`userId`);--> statement-breakpoint
CREATE INDEX `product_idx` ON `wishlists` (`productId`);