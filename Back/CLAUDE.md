# Back — Django 백엔드

Python + Django 5.2 LTS + Django REST Framework, MySQL 8.4(RDS), Gunicorn. 담당: BE1(리드), BE2.

시큐어코딩 규칙: @../docs/rules/secure-python.md

## 앱 구성 (ERD 기준)
| 앱 | 내용 | 모델 |
|---|---|---|
| `common` | 공통 보안 모듈: 권한 클래스, 공개 매니저, 마스킹, 예외 핸들러, 감사 로그, 입력 검증 함수 | 없음 |
| `accounts` | 회원, 로그인, 잠금, 비밀번호 정책, 재인증, 탈퇴, 관리자 OTP | User, PasswordHistory |
| `incidents` | 기업, 사고, 유출 항목, 검색 | Company, Incident, IncidentLeakItem |
| `guides` | 대응 조치(공통·특수) | Action |
| `checklists` | 설문, 체크리스트 계산, 완료 기록 | SurveyResponse, SurveySelectedItem, ActionCompletion |
| `reports` | 제보, 검수 | Report |
| `ocr` | 통지문 인식(저장 없음) | 없음 |

## 반드시 지킬 것
- **공통 모듈을 쓴다.** 권한은 `common`의 권한 클래스, 사고·조치 조회는 공개 매니저, 마스킹은 `common`의 마스킹 함수, URL 검증은 `common`의 검증 함수. 같은 기능을 앱 안에서 새로 만들지 않는다.
- 공개 API만 `permission_classes = [AllowAny]`를 명시한다. 나머지는 기본값(`IsAuthenticated`)이다.
- 설문·체크리스트·제보는 URL로 ID를 받지 않고 `request.user`로 찾는다.
- 비공개·없음·남의 것은 모두 404.
- 입력은 serializer에서 타입·길이·형식을 검증한다. `TEXT` 필드도 최대 길이를 지정한다.
- 설정 보안값(`DEBUG`, 쿠키, 세션, 업로드 핸들러, axes)은 `docs/security.md` 1장·3장 값을 따른다. settings에 비밀값 기본값을 두지 않는다.
- 업로드는 메모리 핸들러만 쓴다(`FILE_UPLOAD_HANDLERS`). Django 기본값은 2.5MB 초과 파일을 디스크 임시파일로 쓴다.
- 관리자 API는 `/api/v1/admin/` 아래에만 두고, `common`의 관리자 권한 클래스(`is_staff` + 세션 OTP 인증)를 쓴다. 관리자가 아니면 404.
- Django 기본 admin(`django.contrib.admin`)은 설치하지 않는다. 운영 데이터 수정은 관리자 API(관리자 화면)로만 한다. 관리자 계정은 삭제하지 않는다.
- 관리자 API 요청은 모두 감사 로그로 남긴다(`docs/security.md` 3-6).
- 모델을 바꾸면 `docs/erd.md`를 같은 PR에서 고친다. 앱별 모델 담당자만 모델을 수정한다.

## 명령어
TODO(BE1): 골격 생성 후 채운다 — 가상환경, 의존성 설치(`pip install --require-hashes`), 마이그레이션, 개발 서버, 테스트, 린트·보안 점검(Bandit, Semgrep, pip-audit), `manage.py check --deploy`
