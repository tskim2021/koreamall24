/**
 * 금액을 "5,000 円" 형식으로 포맷팅하는 함수
 * @param price - 포맷팅할 금액 (숫자 또는 문자열)
 * @returns 포맷팅된 금액 문자열 (예: "5,000 円")
 */
export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "0 円";
  return `${Math.round(num).toLocaleString()} 円`;
}

/**
 * 금액을 "¥5,000" 형식으로 포맷팅하는 함수 (레거시)
 * @deprecated formatPrice 함수를 사용하세요
 * @param price - 포맷팅할 금액 (숫자 또는 문자열)
 * @returns 포맷팅된 금액 문자열 (예: "¥5,000")
 */
export function formatPriceLegacy(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "¥0";
  return `¥${Math.round(num).toLocaleString()}`;
}
