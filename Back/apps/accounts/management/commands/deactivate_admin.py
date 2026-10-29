from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.accounts.services import deactivate_admin, get_active_admin, security_logger


class Command(BaseCommand):
    help = "관리자 비활성화 (삭제 X, OTP 기기·세션 종료)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--email", required=True)

    def handle(self, *args: object, **options: str) -> None:
        user = get_active_admin(options["email"])
        if user is None:
            raise CommandError("활성 관리자 계정이 없습니다")
        deactivate_admin(user)
        security_logger.info("admin deactivated user_id=%s", user.pk)
        self.stdout.write(f"비활성화 user_id={user.pk}")
