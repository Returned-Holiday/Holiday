# 백엔드 분담과 구조

백엔드 팀이 10/11에 정리한 분담·구조 문서를 레포로 옮겼다. 원문과 다른 점은 맨 아래 "원문과 달라진 점"에 있다.

백엔드는 기획서 2-1의 기능 영역대로 앱을 나누고, 앱 단위로 **BE-A·BE-B**가 통째로 맡는다.
- **BE-A**: Django 경험을 살려 가장 복잡한 기능(맞춤 대응 가이드)과 인프라
- **BE-B**: 보안 강점을 살려 보안 공통, 패턴이 정해진 기능, BE-A 코드의 보안 검증

## 파트 분배

앱 하나는 한 사람이 통째로 맡는다. 각 앱의 **관리자 API**도 그 앱 담당이 맡는다(관리자 화면은 프론트 FE2).

| 기획서 기능 영역 | 앱 | 담당 | 관리자 API |
|---|---|---|---|
| 계정 관리 | `accounts` | BE-A | 관리자 OTP 인증(계정 비활성화·OTP 기기 등록은 서버 명령) |
| 맞춤 대응 가이드 | `guides` (설문, 체크리스트, OCR) | BE-A | 조치 등록·공개 |
| 인프라·설정 | AWS, nginx, `config` | BE-A | 없음 |
| 사고 조회 | `incidents` | BE-B | 사고·유출 항목 등록, 공개 |
| 사고 제보·검수 | `reports` | BE-B | 제보 검수 |
| 마이페이지 | `mypage` | BE-B | 없음 |
| 보안 공통 | `common`, CI 보안 도구 | BE-B | 없음 |

나눈 기준:
- BE-A는 로직이 가장 복잡한 맞춤 대응 가이드와 인프라를 맡는다. `accounts`는 BE-A가 이미 만든 인증 코드가 있다.
- BE-B는 패턴이 정해진 조회·등록·검수 기능과 여러 앱이 같이 쓰는 보안 공통 함수를 맡는다.
- 둘 다 Claude Code로 개발하므로, 담당 기준은 "코드를 쓰는 사람"이 아니라 **"이해하고 설명할 책임이 있는 사람"**이다.

### BE-B의 검증 역할 (기능 담당과 별도)
- BE-A의 모든 PR을 보안 관점으로 리뷰한다.
- BE-A 기능의 보안 테스트를 작성한다(다른 사람 데이터 접근, 비공개 사고 접근, 다른 사고 조치로 완료 처리 등). 만든 사람이 아닌 사람이 테스트를 써야 놓친 부분이 잡힌다.
- 4주차 진단가이드 기준 전수 점검을 주도한다. 추가 자동 점검은 시간이 남으면 한다.

## 주차별 일정

기획서 5-5의 주차별 작업을 두 사람이 같은 주에 나눠 맡아 서로 기다리는 구간을 줄인다. 팀 전체 일정(10/23 역할 완료, QA, 10/28 제출)은 `docs/project/team.md`.
- BE-A의 2주차(배포 + 체크리스트)가 가장 무겁다. 밀리면 **비밀번호 변경을 3주차 뒤로 미룬다.**

## 디렉토리 구조

기능 앱은 `apps/` 아래에 두고, 설정(`config`)과 보안 공통(`common`)은 그 밖에 둔다. 대괄호는 담당이다.

```
Back/
├── manage.py                 # 로컬에서만 .env를 읽는다
├── CLAUDE.md                 # [BE-A] 짧은 요약 + 규칙 문서 불러오기
├── .env.example              # 자리만 표시, 실제 값 없음
├── requirements/             # [BE-A] base / dev / prod (.in → 해시 고정 .txt)
├── config/                   # [BE-A] 프로젝트 설정
│   ├── settings/             #   base, local, test, prod
│   ├── urls.py               #   앱별 URL 연결
│   ├── secrets.py            #   Secrets Manager 로더(로컬은 환경변수)
│   ├── errors.py             #   내부 정보 없는 오류 응답
│   └── wsgi.py               #   운영 진입점(prod 설정)
├── common/                   # [BE-B] 보안 공통 (DB 테이블 없음)
│   ├── models.py             #   생성·수정 시각 추상 모델
│   ├── masking.py            #   전화·이메일·주민·카드·계좌번호 마스킹
│   ├── validators.py         #   https URL 검증, 입력 길이 검증
│   ├── permissions.py        #   관리자 전용 등 권한 검사
│   ├── queries.py            #   본인 소유 데이터만 꺼내는 소유 필터
│   ├── middleware.py         #   비밀번호 만료 차단, 관리자 감사 로그, API 캐시 금지
│   ├── log_filters.py        #   로그 개인정보 마스킹 필터
│   ├── passwords.py          #   비밀번호 만료 기준(90일)
│   ├── request.py            #   클라이언트 IP 추출(XFF 신뢰 범위)
│   └── tests/
└── apps/
    ├── accounts/             # [BE-A] 계정 관리
    ├── incidents/            # [BE-B] 사고 조회
    ├── guides/               # [BE-A] 맞춤 대응 가이드
    ├── reports/              # [BE-B] 사고 제보·검수
    └── mypage/               # [BE-B] 마이페이지
```

모든 기능 앱은 같은 틀을 쓴다.
```
apps/<앱>/
├── apps.py          # name="apps.<앱>", label="<앱>"
├── models.py
├── constants.py     # 상태값, 코드 상수
├── services.py      # 비즈니스 로직 (뷰에서 분리)
├── serializers.py
├── views.py
├── urls.py          # 사용자 API
├── admin_urls.py    # 관리자 API (관리자 기능이 있는 앱만)
├── migrations/
└── tests/
    ├── test_api.py
    └── test_security.py
```
`label`을 앱 이름 그대로 두는 이유는 `AUTH_USER_MODEL = "accounts.User"`처럼 짧은 이름으로 앱을 가리켜야 하는 설정이 있어서다.

`guides`는 OCR이 커서 서비스를 폴더로 나눈다.
```
apps/guides/services/
├── checklist.py         # 체크리스트 계산, 진행률
└── ocr/
    ├── image_check.py   # 매직 바이트, 크기, 형식 검증
    ├── client.py        # CLOVA OCR 호출
    └── matching.py      # 마스킹 후 기업·유출 항목 매칭
```

## 앱별 구성

모델은 `docs/erd.md`를 따른다. `mypage`와 `common`만 DB 테이블이 없다.

| 앱 | 담당 | 모델 | 주요 서비스 함수 | 관리자 API |
|---|---|---|---|---|
| `accounts` | BE-A | User, PasswordHistory | 가입, 로그인 잠금, 비밀번호 변경, 탈퇴 | 없음(OTP 인증은 `/api/auth/otp/`) |
| `incidents` | BE-B | Company, Incident, IncidentLeakItem | 공개 사고 조회, 기업명·별칭 검색, 표시 이름 조합 | 사고 등록·공개, 유출 항목 편집, 공지 갱신 시각 기록 |
| `guides` | BE-A | Action, SurveyResponse(선택 항목 포함), ActionCompletion | 체크리스트 계산, 진행률, 완료 검증, OCR | 조치 등록·공개, 공개 시각 기록 |
| `reports` | BE-B | Report | 제보 생성(저장 전 마스킹), 승인·반려 | 제보 검수(반려 사유 필수) |
| `mypage` | BE-B | 없음 | 내 사고별 진행률, 내 제보 상태 모아 보기 | 없음 |

## API 경로

모든 API는 기본으로 로그인이 필요하고, 비회원에게 열 경로만 명시적으로 연다. 엔드포인트별 상세는 `docs/api.md`.

| 앱 | 경로 | 공개 범위 |
|---|---|---|
| `accounts` | `/api/auth/` (csrf, signup, login, logout, me, password, withdraw, otp) | csrf·가입·로그인만 비회원. otp는 관리자 |
| `incidents` | `/api/incidents/`, `/api/incidents/<id>/` (검색은 `?q=`) | 비회원 (공개 사고만) |
| `guides` | `/api/guides/incidents/<id>/survey/`, `.../checklist/`, `.../completions/<action_id>/`, `/api/guides/ocr/` | 회원 |
| `reports` | `/api/reports/` (작성, 내 제보 목록) | 회원 |
| `mypage` | `/api/mypage/` | 회원 |
| 관리자 | `/api/admin/incidents/`, `/api/admin/guides/`, `/api/admin/reports/` | 관리자(허용 IP + `is_staff` + OTP) |

`guides`에는 조치 목록을 직접 조회하는 경로를 두지 않는다. 조치는 체크리스트 계산 결과로만 내보내서, 비공개 조치나 다른 사고의 특수 조치가 새는 경로를 줄인다.

## 앱 사이 규칙

두 사람이 서로 기다리거나 서로의 코드를 깨지 않도록 네 가지를 지킨다.

1. **의존 방향은 한쪽으로만.** `common ← accounts ← incidents ← guides ← mypage`, 그리고 `reports`는 `incidents`만 참조하고 `mypage`가 `reports`를 읽는다. 반대 방향 import는 금지한다(순환 import 방지).
2. **다른 앱은 `services`의 함수로만 호출한다.** 다른 앱의 뷰나 serializer를 가져다 쓰지 않는다. 담당자가 자기 앱 내부를 바꿔도 남의 코드가 깨지지 않는다.
3. **보안 판단은 `common` 함수로만 한다.** 공개 필터, 소유 필터, 마스킹, URL 검증을 앱마다 따로 짜지 않는다.
4. **모델은 담당자만 고친다.** 뼈대에서 BE-A가 전체 모델을 한 번에 만들고, 이후 다른 사람 앱의 모델을 바꿔야 하면 PR로 담당자 리뷰를 받는다. 마이그레이션 충돌을 막는 가장 확실한 방법이다.

## 뼈대 단계에서 고정한 함수

껍데기와 이름부터 정해 두면 서로 기다리지 않는다. 지금은 모두 `NotImplementedError`를 내는 껍데기다.

| 제공 앱 | 함수 | 쓰는 곳 |
|---|---|---|
| `incidents` (BE-B) | `services.get_public_incidents()`, `services.get_public_incident_or_404(incident_id)`, 유출 유형 상수 `constants.LeakType` | guides, reports |
| `guides` (BE-A) | `services.get_progress(user)` | mypage |
| `common` (BE-B) | `masking.mask_pii()`, `validators.validate_https_url()`, `queries.get_owned_or_404()`, `request.client_ip()`, `passwords.is_password_expired()` | 전체 |

`common/permissions.py`의 `IsStaffWithOtp`(관리자 API 권한)는 정책이 확정되어 구현까지 해 두었다.

## 골격 현황 (10/11)

| 항목 | 상태 |
|---|---|
| 폴더·파일 구조, 앱 설정 | 완료 |
| settings(base/local/test/prod) 보안 기본값 | 완료. `check`, 운영 설정 `check --deploy` 경고 0건 |
| 의존성 해시 고정(`requirements/*.txt`) | 완료 |
| `accounts.User` | ERD 필드로 작성. BE-A의 기존 인증 코드로 바꿔도 되며, ERD 필드만 맞춘다 |
| 나머지 모델, 마이그레이션 | 앱 담당자가 작성. `incidents`·`reports` 완료(BE-B) |
| 고정 함수 | 이름과 형태만 있음 |
| 뷰·serializer·URL | 비어 있음 |

## 원문과 달라진 점

| 원문 | 레포 문서 | 이유 |
|---|---|---|
| 관리자 화면은 Django admin(경로는 환경변수), 앱마다 `admin.py` | 관리자 화면은 React(FE2), 각 앱은 `admin_urls.py`로 **관리자 API**를 제공. Django admin은 설치하지 않음 | 팀 결정(10/11): 프론트 2명이 관리자 화면까지 맡기로 함 |
| 담당 표기 A, B | BE-A, BE-B | 프론트(FE1, FE2)와 구분 |
| `accounts` 모델 User | User, PasswordHistory | 비밀번호 최근 4개 재사용 금지 결정 |
| `/api/auth/`에 otp 없음 | otp 추가 | 관리자 2차 인증 결정 |
| 3라운드 관련 문장 | 삭제 | 2라운드만 다루기로 함 |
