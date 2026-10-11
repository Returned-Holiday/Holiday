import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    # 로컬 개발에서만 .env를 읽는다. 운영 서버는 wsgi.py로 실행되어 이 경로를 거치지 않는다
    load_dotenv(Path(__file__).resolve().parent / ".env")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
