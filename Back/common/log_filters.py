import logging

from common.masking import mask_pii

_exception_formatter = logging.Formatter()


# 핸들러에 연결 → 메시지·예외 원문 모두 마스킹
class PiiMaskingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except (TypeError, ValueError):
            # 인자 개수 불일치 → 로그 호출부 예외 X
            message = str(record.msg)
        record.msg = mask_pii(message)
        record.args = None
        if record.exc_info and not record.exc_text:
            record.exc_text = _exception_formatter.formatException(record.exc_info)
        if record.exc_text:
            record.exc_text = mask_pii(record.exc_text)
        if record.stack_info:
            record.stack_info = mask_pii(record.stack_info)
        return True
