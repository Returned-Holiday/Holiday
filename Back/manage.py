import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    # .env는 로컬에서만 (운영은 wsgi)
    load_dotenv(Path(__file__).resolve().parent / ".env")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
