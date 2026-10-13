import { HOME_PATH, INCIDENTS_PATH } from "../../app/paths";
import { ButtonLink } from "../../shared/ui/Button";
import { StatusScreen } from "../../shared/ui/StatusScreen";

// 비공개·없는 사고·관리자 화면 모두 같은 문구 (존재 여부 비노출)
export function NotFoundPage() {
  return (
    <StatusScreen
      illustration="peek"
      illustrationWidth={149}
      code="404"
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 없는 페이지예요."
      actions={
        <>
          <ButtonLink to={HOME_PATH} variant="tertiary">
            메인으로
          </ButtonLink>
          <ButtonLink to={INCIDENTS_PATH}>기업 이름으로 검색하기</ButtonLink>
        </>
      }
    />
  );
}
