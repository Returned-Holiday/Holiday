# QA1 보안 점검 (10/23–24, BE-B 주관)

QA1 보안 점검의 기준표와 실행 목록이다. 10/21에 코드 기준 사전 점검을 마쳤고(아래 1·2절), QA1 당일에는 미구현 기능 점검과 스테이징 공격 테스트(3절)만 하면 된다. 결과는 각 표의 "결과" 칸에 적고, 조치는 PR로 남긴다. 이 문서가 서비스 개요서 보안 부분의 원본이다.

- 기준: 진단가이드 구현 단계 49개(`docs/rules/secure-python.md`, `secure-ts.md`), 기반시설 웹 21개(`docs/security.md` 5장)
- 사전 점검 범위: dev(`2f494fb`) + guides 모델·API(#26·#28)
- 상태 표기: **적용**(근거 있음) / **조치**(고칠 것) / **미구현**(기능이 아직 없음, 구현 PR에서 점검) / **스테이징**(서버에서만 확인 가능) / **해당 없음**

## 1. 자동 점검 (CI와 같은 명령, QA1 첫날 전체 1회)

| 도구 | 명령 (`Back/`, `Front/`) | 10/21 결과 |
|---|---|---|
| Semgrep(공개 규칙 + 금지 API 규칙 18개, tests 포함) | CI `semgrep` 잡 | 0건 |
| Bandit | `bandit -q -r . -x ./requirements,./.venv` | 0건 |
| pip-audit | `pip-audit -r requirements/base.txt -r requirements/prod.txt` | 0건 |
| npm audit | `npm audit --omit=dev` | 0건 |
| 테스트 | `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py test` | 203개 통과(#26·#28 포함) |
| 마이그레이션 누락 | `python manage.py makemigrations --check --dry-run` | 변경 없음 |
| 운영 설정 | `python manage.py check --deploy --settings=config.settings.prod` | 스테이징에서 실행 |

## 2. 진단가이드 49개 항목 현황 (백엔드 기준, 프론트는 2-8)

### 2-1. 입력데이터 검증 및 표현 (17)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | SQL 삽입 | 적용 | ORM만, Semgrep `rh-raw-sql`. 검색어 `' OR '1'='1`·`%`·`_` 테스트(`incidents/tests/test_security.py`) |
| 2 | 코드 삽입 | 적용 | Semgrep `rh-code-exec`, 템플릿 미사용 |
| 3 | 경로 조작·자원 삽입 | 적용 | 입력으로 파일 경로·호스트를 만드는 코드 없음(10/21 검색 0건) |
| 4 | XSS | 적용 | API는 JSON만, `rh-mark-safe`. 프론트 `dangerouslySetInnerHTML` 0건 |
| 5 | OS 명령어 삽입 | 적용 | `rh-os-command`(`subprocess` import 자체 금지) |
| 6 | 위험한 형식 파일 업로드 | 미구현 | OCR API(BE-A). 메모리 핸들러·5MB 설정은 완료. 구현 시 확장자·시그니처·픽셀 상한 확인 |
| 7 | 신뢰되지 않는 URL 자동접속 | 적용 | 서버 리다이렉트 0건, `APPEND_SLASH=False`(#30), 외부 링크는 `SafeExternalLink` |
| 8 | XXE | 해당 없음 | XML 미사용, `rh-xml-parsing` |
| 9 | XML 삽입 | 해당 없음 | 위와 같음 |
| 10 | LDAP 삽입 | 해당 없음 | LDAP 미사용 |
| 11 | CSRF | 적용 | `rh-csrf-disabled`, 비로그인 POST `csrf_protect`. 테스트 `accounts`·`guides`의 `test_requires_csrf*` |
| 12 | SSRF | 적용 | `validate_https_url`(IP·localhost·계정정보 거부), 서버는 URL에 접속 X. OCR 외부 주소 고정은 구현 시 확인 |
| 13 | HTTP 응답분할 | 적용 | 헤더·쿠키에 입력값을 넣는 코드 0건 |
| 14 | 정수형 오버플로 | 적용 | `10**30` 입력 시 SQLite·MySQL 모두 404/400(500 없음). **권고**: `max_value` 미지정 2곳(F4) |
| 15 | 보안기능 결정에 쓰는 입력값 | 적용 | 역할·상태·제보자·신규 사고 비공개를 서버가 결정. `test_ignores_client_role`, `test_server_fields_not_client_controlled`, `test_create_always_private` |
| 16 | 메모리 버퍼 오버플로 | 해당 없음 | Python |
| 17 | 포맷 스트링 삽입 | 적용 | `rh-log-format`(로그 f-string·format·`%` 결합 금지) |

### 2-2. 보안기능 (16)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | 인증 없는 중요기능 | 미구현 일부 | 기본 `IsAuthenticated`, 관리자 API는 `IsStaffWithOtp`(OTP 인증 세션만). OTP 등록·검증 API, 비밀번호 변경·탈퇴(현재 비밀번호 확인) API 미구현(BE-A) |
| 2 | 부적절한 인가 | 적용 | 소유 필터 `common.queries`, 공개 필터, `IsStaffWithOtp`, 404 통일. guides 뷰 3개 권한 클래스 미명시(F3, 기본값이라 동작은 안전) |
| 3 | 자원 권한 설정 | 스테이징 | 전용 계정·`UMask=0027`·로그 디렉터리 750(`infra/systemd`) |
| 4 | 취약한 암호 알고리즘 | 적용 | `rh-weak-hash`, Bandit |
| 5 | 암호화되지 않은 중요정보 | 적용·스테이징 | PBKDF2, 운영 `Secure` 쿠키·HSTS·SSL 리다이렉트. TLS는 서버에서 확인 |
| 6 | 하드코드된 중요정보 | 적용 | `p/secrets`, 테스트 비밀번호는 실행마다 랜덤, 비밀값은 Secrets Manager. 10/21 IP·키 검색 0건 |
| 7 | 키 길이 | 해당 없음 | 직접 암호화 없음(TLS는 nginx) |
| 8 | 적절하지 않은 난수 | 적용 | `rh-insecure-random`, 프론트 `Math.random` 0건 |
| 9 | 취약한 비밀번호 허용 | 미구현 일부 | KISA 검증기 가입 적용(테스트 있음). 비밀번호 변경 API 미구현 |
| 10 | 전자서명 확인 | 해당 없음 | |
| 11 | 인증서 유효성 검증 | 적용 | `rh-tls-verify-disabled`. OCR 외부 호출 구현 시 재확인 |
| 12 | 하드디스크에 저장되는 쿠키 | 적용 | 세션 15분·요청마다 갱신·브라우저 종료 시 만료, HttpOnly·SameSite=Lax, 세션에 민감정보 없음 |
| 13 | 주석 속 시스템 주요정보 | 적용 | 인프라 값은 `<...>` 자리표시자, 10/21 검색 0건 |
| 14 | 솔트 없는 일방향 해시 | 적용 | Django 해셔만 |
| 15 | 무결성 검사 없는 코드 다운로드 | 적용 | pip 해시 고정, `npm ci`, Actions 커밋 해시·Semgrep 이미지 digest 고정. 의존성 변경은 해시를 PyPI와 대조(#25) |
| 16 | 반복 인증시도 제한 | 미구현 일부 | axes 5회 30분(대소문자 우회 테스트), 로그인 10/분, 제보 5/일 적용. OTP 5/분은 설정만 있고 OTP API 미구현(BE-A) |

### 2-3. 시간 및 상태 (2)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | TOCTOU | 적용 | 이메일 유일 제약, 제보 검수 조건부 UPDATE(MySQL 동시 요청 5/5 한 번만 반영), 설문 `update_or_create`, 완료 `get_or_create`, 기업 저장 행 잠금(빈 테이블 첫 등록은 한계, `docs/erd.md`) |
| 2 | 종료되지 않는 반복문 | 적용 | 재귀 없음, 페이지 20 고정, 별칭 20·선택 항목 50 상한. 문서의 "페이지 50"은 20으로 정정(F5) |

### 2-4. 에러처리 (3)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | 오류 메시지 정보노출 | 적용 | 공통 예외 핸들러, `DEBUG=False`, 모든 404 바이트 동일(`config/tests/test_not_found.py`), 선택지 에러에 입력값 X |
| 2 | 오류 상황 대응 부재 | 적용 | `rh-except-pass` |
| 3 | 부적절한 예외 처리 | 적용 | `rh-broad-except`(튜플 형태 포함) |

### 2-5. 코드오류 (5)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | Null 역참조 | 적용 | `get_object_or_404`, `.first()` 결과 확인 |
| 2 | 부적절한 자원 해제 | 적용 | 파일 열기 0건. OCR 구현 시 이미지 `with` 확인 |
| 3 | 해제된 자원 사용 | 적용 | 위와 같음 |
| 4 | 초기화되지 않은 변수 | 적용 | Bandit·Semgrep 0건, 리뷰 |
| 5 | 신뢰할 수 없는 역직렬화 | 적용 | `rh-unsafe-deserialization`, 세션 JSON 직렬화 기본값 |

### 2-6. 캡슐화 (4)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | 잘못된 세션에 의한 정보 노출 | 적용 | 클래스 속성·전역 변수에 요청 데이터 저장 없음 |
| 2 | 남은 디버그 코드 | 적용 | `rh-debug-code`, `rh-debug-setting`, 프론트 `console`·`debugger` 0건 |
| 3 | Private 배열 반환 | 적용 | 상수는 `frozenset`·튜플, 체크리스트 항목은 튜플 |
| 4 | Private 배열에 Public 데이터 할당 | 적용 | 위와 같음 |

### 2-7. API 오용 (2)
| # | 약점 | 상태 | 근거 |
|---|---|---|---|
| 1 | DNS lookup 의존 보안 결정 | 적용 | 관리자 허용 IP는 nginx `geo`, XFF는 nginx가 덮어씀 + `NUM_PROXIES=1` |
| 2 | 취약한 API | 적용 | 금지 API 규칙, `assert`·`sys.exit` 0건 |

### 2-8. 프론트(TypeScript) 요약
`dangerouslySetInnerHTML`·`innerHTML`·`eval`·`localStorage`·`document.cookie`·`Math.random`·`console`·빈 `catch`·API 클라이언트 밖 `fetch` 모두 0건. `_blank` 링크는 전부 `noopener noreferrer`, 운영 소스맵 끔. 에러 화면은 서버 공통 문구만 표시.

## 3. 발견 사항과 조치

| # | 내용 | 심각도 | 담당 | 상태 |
|---|---|---|---|---|
| F1 | 403·429가 `django.request` → 일반 로그(30일)로만 감. `security.md` 3-6은 보안 이벤트(90일) | 중 | BE-B | 조치 PR(`fix/security-log-denied`) |
| F2 | 미구현 기능 점검 대기: 비밀번호 변경·탈퇴·OTP, OCR, 조치 관리자 API(BE-A), 마이페이지(BE-B) | – | 각 담당 | 구현 PR 리뷰 때 점검 |
| F3 | guides 뷰 3개 `permission_classes` 미명시(#28) | 낮음 | BE-A | #28 코멘트 |
| F4 | 정수 입력 `max_value` 미지정: 제보 승인 `incident_id`(BE-B), 설문 `selected_item_ids`(BE-A) | 낮음 | BE-B·BE-A | 권고 |
| F5 | `secure-python.md` 시간 및 상태 2번 "페이지 50" → 실제 20 | 문서 | BE-B | 정정 완료 |
| F6 | 설문 저장 시 검증 후 유출 항목 삭제 경합 → FK 오류 500 가능 | 낮음 | BE-A | 조치 완료(#28 `16e29d7`, 잠금 후 재확인 → 400) |
| F7 | `SurveyKey.REUSED_PASSWORD` 같은 이름이 진단 도구에 "하드코드 비밀번호"로 오탐될 수 있음(실제 값은 선택지 키) | 관찰 | BE-A | QA1에서 도구 결과 확인 |
| F8 | `OPTIONS` 요청에 DRF 기본 메타데이터가 200 + 입력 필드 정보로 응답(정보 누출). 운영은 nginx가 `OPTIONS` 405로 막지만 앱에서도 차단 필요 | 중 | BE-A | `DEFAULT_METADATA_CLASS=None` 별도 PR |

## 4. 웹 21개 항목 공격 테스트 (스테이징, QA1 당일)

준비: 테스트 계정 2개(회원 A·B), OTP 등록된 관리자 1개(OTP API 머지 후), 공개·비공개 사고 각 1개, B의 제보 1개. 계정 정보는 문서·채팅에 적지 않는다.

```bash
BASE=https://<도메인>
curl -s -c jar -b jar "$BASE/api/auth/csrf/" -o /dev/null
CSRF=$(awk '/csrftoken/{print $7}' jar)
H=(-b jar -c jar -H "X-CSRFToken: $CSRF" -H "Referer: $BASE/" -H "Content-Type: application/json")
# 로그인: 비밀번호는 표준입력으로만 (명령 기록·프로세스 목록 X). 테스트 계정 비밀번호에 " \ 없게
read -rs PW
printf '{"email":"<회원A>","password":"%s"}' "$PW" | curl -s "${H[@]}" --data-binary @- "$BASE/api/auth/login/"
unset PW
# 테스트 끝나면
rm -f jar
```

| 코드 | 항목 | 요청 | 기대 결과 | 자동 테스트 근거 | 결과 |
|---|---|---|---|---|---|
| CI | 코드 인젝션 | 제보 `leak_items_text`에 `{{7*7}}`, `; ls` | 201, 텍스트 그대로 저장 | Semgrep 금지 규칙 | |
| SI | SQL 인젝션 | `GET /api/incidents/?q=' OR '1'='1`, 로그인 email에 같은 값 | 200 빈 목록 / 401 | `test_injection_strings_are_plain_text` | |
| DI | 디렉터리 인덱싱 | `GET /assets/`, `GET /api/` | 404(목록 X) | nginx `autoindex off` | |
| EP | 에러 페이지 | 없는 URL, 잘못된 JSON POST, 응답 `Server` 헤더 | 공통 형식, 버전 X | `test_not_found.py` | |
| IL | 정보 누출 | 응답·번들·HTML 주석, `/.env`·`/.git/config`, `/index.html.bak`, `/assets/*.map` | 내부 정보 X. 숨김 파일·`/assets/` 없는 파일은 404, 그 외 경로는 프론트 404 화면(파일 내용 X) | 소스맵 끔 | |
| XS | XSS | 제보에 `<img src=x onerror=alert(1)>` → 관리자 화면에서 열람 | 텍스트로 표시 | React 이스케이프 | |
| CF | CSRF | 토큰 없이·변조해서 로그인·제보 POST | 403 | `test_requires_csrf*` | |
| SF | SSRF | 제보 `source_url`에 `https://127.0.0.1/`, `https://169.254.169.254/`, `file:///etc/passwd` | 400 | `common/tests/test_validators.py` | |
| BF | 약한 비밀번호 | `abc12345`로 가입, 6회 연속 로그인 실패 | 400 / 429 잠금 | `test_rejects_weak_password`, `test_locks_after_five_failures` | |
| IA | 불충분한 인증 | 쿠키 없이 `/api/reports/`·`/api/mypage/`, 현재 비밀번호 없이 탈퇴·비밀번호 변경 | 401 / 400 (마이페이지·탈퇴·비밀번호 변경은 구현 후, 지금은 404) | `test_anonymous_rejected` | |
| IN | 불충분한 권한 검증 | A로 B의 제보·설문 접근, 다른 사고의 조치 ID로 완료, 비공개 사고 ID | 404 | `test_only_own_reports_and_no_detail_api`, guides `OwnershipSecurityTests` | |
| PR | 비밀번호 복구 | – | 기능 없음 | – | 해당 없음 |
| PV | 프로세스 검증 | 설문 없이 `PUT .../completions/<id>/`, 만료 계정으로 `/api/incidents/` | 404 / 403 `PASSWORD_EXPIRED` | `test_requires_survey`, `test_expired_user_blocked` | |
| FU | 악성 파일 업로드 | `.png`로 바꾼 텍스트 파일, 6MB 이미지 | 400 / 413 | OCR 구현 후 | |
| FD | 파일 다운로드 | – | 기능 없음 | – | 해당 없음 |
| IS | 세션 관리 | 로그인 전후 `sessionid` 비교, 15분 대기 후 요청 | 값 다름 / 401 | `test_rotates_session_on_login` | |
| SN | 평문 전송 | `http://` 접속, `openssl s_client -tls1_1` | 301 https / 연결 거부 | nginx TLS 1.2+ | |
| CC | 쿠키 변조 | `sessionid` 임의 값·다른 계정 값 일부 변경 | 401 | 서버 세션 | |
| AE | 관리자 페이지 노출 | `/admin/`, 허용 외 IP에서 `/api/admin/incidents/`, OTP 없이 관리자 API, 회원으로 `/manage` | `/admin/`·`/manage`는 프론트 404 화면(Django admin 없음), 관리자 API는 404(없는 경로와 본문 동일) | `test_not_found.py`, `AdminAccessTests` | |
| AU | 자동화 공격 | 로그인 11회/분(**없는 이메일로**, 실제 계정은 5회에서 axes 잠금이 먼저 걸림), 제보 6회/일, 검색 61회/분 | 429 | `test_create_limited_per_day` | |
| WM | 불필요한 메소드 | 읽기 API에 `PUT`·`DELETE`, 아무 경로에 `TRACE`·`OPTIONS` | 405 (`OPTIONS`는 F8 조치 후 앱에서도 405) | `test_put_and_delete_not_allowed` | |
