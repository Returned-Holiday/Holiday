import re
from getpass import getpass

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.accounts.constants import NICKNAME_PATTERN
from apps.accounts.exceptions import EmailTaken
from apps.accounts.services import create_admin, security_logger


class Command(BaseCommand):
    help = "관리자 계정 생성 (비밀번호는 입력 프롬프트로만)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--email", required=True)
        parser.add_argument("--nickname", required=True)

    def handle(self, *args: object, **options: str) -> None:
        if not re.fullmatch(NICKNAME_PATTERN, options["nickname"]):
            raise CommandError("닉네임은 한글·영문·숫자 2~20자")
        # 인자로 받지 않음 (셸 기록·프로세스 목록에 비밀번호 X)
        password = getpass("비밀번호: ")
        if getpass("비밀번호 확인: ") != password:
            raise CommandError("비밀번호가 서로 다릅니다")
        try:
            user = create_admin(options["email"], options["nickname"], password)
        except ValidationError as error:
            raise CommandError(" ".join(error.messages)) from error
        except EmailTaken as error:
            raise CommandError("이미 가입된 이메일입니다") from error
        security_logger.info("admin created user_id=%s", user.pk)
        self.stdout.write(f"관리자 생성 user_id={user.pk}. 다음: register_otp --email")
