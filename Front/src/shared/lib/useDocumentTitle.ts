import { useEffect } from "react";

export const SITE_TITLE = "SEALD 유출 개인정보 대응 헬프데스크";

// 탭 제목 = 화면 제목 (null이면 그대로 둠: 안쪽 404 화면 등이 정함)
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title === null) {
      return;
    }
    document.title = title === "" ? SITE_TITLE : `${title} | SEALD`;
  }, [title]);
}
