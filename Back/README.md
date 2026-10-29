# Back — Django 백엔드

Python 3.12+ · Django 5.2 LTS · Django REST Framework · MySQL 8.4(RDS) · Gunicorn. 담당: BE-A, BE-B.
분담·구조·앱 사이 규칙 전문은 `docs/backend.md`.

시큐어코딩 규칙: [docs/rules/secure-python.md](../docs/rules/secure-python.md)

## 앱과 담당
| 앱 | 담당 | 내용 |
|---|---|---|
| `config` | BE-A | 설정, URL, Secrets 로더, 오류 응답 |
| `common` | BE-B | 권한, 마스킹, URL 검증, 소유 필터, 시각 추상 모델, 보안 미들웨어(만료 차단·감사 로그·캐시 금지), 로그 마스킹 필터 (DB 테이블 없음) |
| `apps.accounts` | BE-A | 회원, 로그인 잠금, 비밀번호 정책, 탈퇴, 관리자 OTP |
| `apps.incidents` | BE-B | 기업, 사고, 유출 항목, 검색 |
| `apps.guides` | BE-A | 조치, 설문, 체크리스트, OCR(`services/ocr/`) |
| `apps.reports` | BE-B | 제보, 검수 |
| `apps.mypage` | BE-B | 진행률·제보 모아 보기 (DB 테이블 없음) |

앱 파일 틀: `models` · `constants` · `services` · `serializers` · `views` · `urls`(사용자 API) · `admin_urls`(관리자 API) · `tests/test_api.py` · `tests/test_security.py`

## 앱 사이 규칙
1. 의존 방향: `common ← accounts ← incidents ← guides ← mypage`, `reports`는 `incidents`만 참조, `mypage`가 `reports`를 읽는다. 반대 방향 import 금지.
2. 다른 앱은 그 앱의 `services` 함수로만 호출한다. 다른 앱의 뷰·serializer·모델 내부를 직접 쓰지 않는다.
3. 보안 판단(공개 필터, 소유 필터, 마스킹, URL 검증, 관리자 권한)은 `common` 함수로만 한다.
4. 모델은 그 앱 담당자만 고친다. 바꾸면 `docs/erd.md`를 같은 PR에서 고친다.

## 반드시 지킬 것
- 공개 API만 `permission_classes = [AllowAny]`를 명시한다. 기본값은 `IsAuthenticated`다.
- 설문·체크리스트·제보·마이페이지는 URL로 소유자 ID를 받지 않고 `request.user`로 찾는다. 비공개·없음·남의 것은 모두 404.
- 관리자 API는 각 앱의 `admin_urls.py`에 두고 `common.permissions.IsStaffWithOtp`를 쓴다. Django 기본 admin은 설치하지 않는다.
- `guides`에는 조치 목록을 직접 조회하는 경로를 두지 않는다(체크리스트 계산 결과로만 내보낸다).
- 요청 제한이 필요한 뷰는 `throttle_scope`를 지정한다(`login`, `signup`, `sensitive`, `search`, `ocr`, `report`, `otp`, `admin` — 값은 `config/settings/base.py`).
- 입력은 serializer에서 타입·길이·형식을 검증한다. `TEXT` 필드도 최대 길이를 지정한다.
- 업로드는 메모리 핸들러만 쓴다(설정 완료). 이미지·OCR 원문은 저장·로그 금지.
- 설정 보안값은 `config/settings/base.py`에 이미 들어 있다. 바꿀 때는 `docs/security.md`부터 고친다. 설정에 비밀값 기본값을 두지 않는다.
- 운영 데이터 수정은 관리자 API로만 한다. 관리자 계정은 삭제하지 않고 비활성화한다.

## 명령어 (Back/ 폴더에서)
```bash
python -m venv .venv                      # Windows: .venv\Scripts\activate / macOS·Linux: source .venv/bin/activate
pip install --require-hashes -r requirements/base.txt -r requirements/dev.txt
cp .env.example .env                      # 값을 채운다. .env는 커밋하지 않는다
python manage.py migrate
python manage.py runserver                # http://127.0.0.1:8000 (프론트 개발 서버가 /api를 여기로 보냄)
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py test
python manage.py check --deploy --settings=config.settings.prod   # 운영 값이 환경변수에 있어야 함
bandit -q -r . -x ./requirements,./.venv  # 보안 정적분석
pip-audit -r requirements/base.txt        # 의존성 취약점
```
의존성 추가: `requirements/*.in`을 고친 뒤 `pip-compile --generate-hashes --allow-unsafe --strip-extras --no-header requirements/base.in`으로 `.txt`를 다시 만들고 둘 다 커밋한다(BE-B 승인).
