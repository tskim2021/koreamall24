import { useRef, useState, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/free-mode";
import ProductCard from "./ProductCard";
import type { Product } from "@shared/types";

interface PopularRankingSwiperProps {
  products: Product[];
}

export default function PopularRankingSwiper({ products }: PopularRankingSwiperProps) {
  const [progress, setProgress] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);

  // 최대 10개
  const displayProducts = products.slice(0, 10);

  const handleProgress = useCallback((_: SwiperType, p: number) => {
    setProgress(p);
  }, []);

  // 트랙 너비 120px, 활성 thumb 너비 32px
  const TRACK_W = 120;
  const THUMB_W = 32;
  const thumbLeft = progress * (TRACK_W - THUMB_W);

  return (
    <div className="relative">
      <Swiper
        modules={[FreeMode, Mousewheel]}
        freeMode={{
          enabled: true,
          momentum: true,
          momentumRatio: 0.5,
        }}
        mousewheel={{ forceToAxis: true }}
        grabCursor={true}
        slidesPerView={2.3}
        spaceBetween={8}
        breakpoints={{
          480: { slidesPerView: 3.2, spaceBetween: 10 },
          768: { slidesPerView: 4.2, spaceBetween: 12 },
          1024: { slidesPerView: 5, spaceBetween: 12 },
          1280: { slidesPerView: 5, spaceBetween: 14 },
        }}
        onProgress={handleProgress}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        className="w-full"
      >
        {displayProducts.map((product, index) => (
          <SwiperSlide key={product.id}>
            <ProductCard
              product={product}
              rank={index + 1}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 하단 중앙 스크롤 인디케이터 */}
      <div className="flex justify-center mt-3">
        <div
          className="relative rounded-full bg-gray-200"
          style={{ width: `${TRACK_W}px`, height: "8px" }}
        >
          <div
            className="absolute top-0 rounded-full bg-pink-600 transition-all duration-150"
            style={{
              width: `${THUMB_W}px`,
              height: "8px",
              left: `${thumbLeft}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
