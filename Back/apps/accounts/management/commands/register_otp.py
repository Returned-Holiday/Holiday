from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.accounts.services import get_active_admin, register_otp_device, security_logger


class Command(BaseCommand):
    help = "관리자 TOTP 기기 등록 (기존 기기 교체)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--email", required=True)

    def handle(self, *args: object, **options: str) -> None:
        user = get_active_admin(options["email"])
        if user is None:
            raise CommandError("활성 관리자 계정이 없습니다")
        device = register_otp_device(user)
        security_logger.info("otp device registered user_id=%s", user.pk)
        # 비밀값 포함 → 터미널에 한 번만, 로그 X
        self.stdout.write(device.config_url)
        self.stdout.write("인증 앱에 등록 후 터미널 기록을 지우세요")
