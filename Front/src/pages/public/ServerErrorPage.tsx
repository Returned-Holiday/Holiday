import { Button } from "../../shared/ui/Button";
import { StatusScreen } from "../../shared/ui/StatusScreen";

// 오류 원문·코드 노출 X
export function ServerErrorPage() {
  return (
    <StatusScreen
      illustration="nosignal"
      illustrationWidth={222}
      title="잠시 문제가 생겼어요"
      description={"인터넷 연결을 확인한 뒤 다시 시도해 주세요.\n문제가 계속되면 잠시 후에 다시 들어와 주세요."}
      actions={<Button onClick={() => window.location.reload()}>다시 시도</Button>}
      note="급한 사칭 문자 신고는 KISA 118에서 바로 할 수 있어요"
    />
  );
}
