from config.errors import Conflict


# 완료 기록이 옛 사고·조건에 묶인 채 대상만 바뀌는 것 방지
class ActionScopeLocked(Conflict):
    default_detail = "완료 기록이 있는 조치는 대상 사고·트리거를 바꿀 수 없어요. 새 조치로 등록하고 기존 조치는 비공개로 내려 주세요."
