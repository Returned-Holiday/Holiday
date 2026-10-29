PASSWORD_INPUT_MAX_LENGTH = 64
# \Z: 끝 개행 허용 X
NICKNAME_PATTERN = r"\A[가-힣A-Za-z0-9]{2,20}\Z"
NICKNAME_MAX_LENGTH = 20
EMAIL_MAX_LENGTH = 254
OTP_CODE_PATTERN = r"\A\d{6}\Z"
OTP_DEVICE_NAME = "admin"
CURRENT_MISMATCH_ERROR = "현재 비밀번호가 일치하지 않습니다."
MIN_AGE_ERROR = "비밀번호를 바꾼 지 1일이 지나야 다시 바꿀 수 있어요."
REUSE_ERROR = "최근에 사용한 비밀번호는 다시 쓸 수 없어요."
