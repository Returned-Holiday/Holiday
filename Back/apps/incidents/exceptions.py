from config.errors import Conflict


class CompanyKeyConflict(Conflict):
    default_detail = "다른 기업의 이름이나 별칭과 겹쳐요."


# 사용자 선택 항목 (guides RESTRICT) → 삭제 대신 수정으로 정정
class LeakItemInUse(Conflict):
    default_detail = "사용자가 선택한 항목은 삭제할 수 없어요. 내용을 수정해 주세요."
