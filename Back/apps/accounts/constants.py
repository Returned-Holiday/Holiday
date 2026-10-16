from datetime import timedelta

PASSWORD_MAX_AGE = timedelta(days=90)
PASSWORD_INPUT_MAX_LENGTH = 64
# \Z: 끝 개행 허용 X
NICKNAME_PATTERN = r"\A[가-힣A-Za-z0-9]{2,20}\Z"
NICKNAME_MAX_LENGTH = 20
EMAIL_MAX_LENGTH = 254
