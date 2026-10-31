/**
 * useKatakanaInput
 * 히라가나(ひらがな)를 입력하면 자동으로 카타카나(カタカナ)로 변환하는 훅
 *
 * 변환 방식:
 * - 히라가나 유니코드 범위: U+3041–U+3096
 * - 카타카나 유니코드 범위: U+30A1–U+30F6
 * - 오프셋 차이: 0x60 (96)
 */

/**
 * 문자열 내 히라가나를 카타카나로 변환
 */
export function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/**
 * input onChange 핸들러에서 사용할 카타카나 변환 래퍼
 * 사용 예:
 *   <input onChange={handleKatakanaChange(setLastNameKatakana)} />
 */
export function handleKatakanaChange(
  setter: (value: string) => void
): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return (e) => {
    setter(hiraganaToKatakana(e.target.value));
  };
}
