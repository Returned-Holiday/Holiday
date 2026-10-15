# API 명세

공통 규칙(응답 형식, 상태 코드, 에러 코드)은 `docs/rules/api-response.md`. 앱 구성과 담당은 `docs/backend.md`.

- **10/14 동결**. 이후 변경은 PR로만 하고 프론트(FE1·FE2)에게 알린다.
- 코드가 생기면 drf-spectacular 등으로 OpenAPI 스키마를 만들어 요청·응답 필드의 기준으로 삼는다. 이 문서는 목록과 보안 속성의 기준으로 계속 유지한다.
- 모든 경로는 `/api/`로 시작하고 끝에 `/`를 붙인다(Django 규칙).

## 사용자 API

| 메소드 · 경로 | 권한 | 소유·공개 검증 | 요청 제한 | 비고 | 담당 |
|---|---|---|---|---|---|
| `GET /api/auth/csrf/` | 공개 | – | 기본 | CSRF 쿠키 발급 | BE-A |
| `POST /api/auth/signup/` | 공개 | – | `signup` 5/시간/IP | 비밀번호 규칙 검증, 이메일 소문자 정규화 | BE-A |
| `POST /api/auth/login/` | 공개 | – | `login` 10/분/IP | 실패 문구 통일, 5회 30분 잠금, 세션 재발급, 응답에 `passwordExpired` | BE-A |
| `POST /api/auth/logout/` | 회원 | – | 기본 | 세션 전체 삭제 | BE-A |
| `GET /api/auth/me/` | 회원 | 본인 | 기본 | 닉네임, 이메일, 비밀번호 변경일, `isStaff`, `otpVerified` | BE-A |
| `POST /api/auth/password/` | 회원(만료 상태 허용) | 본인 | `sensitive` 5/시간 | 현재 비밀번호 확인 → 최소 1일 → 규칙 → 최근 4개 → 저장 → 다른 세션 무효화 | BE-A |
| `POST /api/auth/withdraw/` | 회원 | 본인 | `sensitive` | 현재 비밀번호 확인 → 개인 데이터 CASCADE 삭제 → 세션 삭제 | BE-A |
| `POST /api/auth/otp/` | 관리자(OTP 전) | 본인 | `otp` 5/분 | TOTP 6자리 확인 → 이 세션에서 관리자 API 허용. 실패 기록 | BE-A |
| `GET /api/incidents/?q=&page=` | 공개 | 공개 사고만 | `search` 60/분/IP | 기업명·별칭 검색, 검색어 50자 제한, 공지일 최신순(다른 정렬 없음) | BE-B |
| `GET /api/incidents/<id>/` | 공개 | 공개 사고만(아니면 404) | 기본 | 유출·미유출 항목, 출처, 상담 채널, 대응 중 인원, 대응 상태(`responseStatus`) | BE-B |
| `GET /api/guides/incidents/<id>/survey/` | 회원 | (본인, 공개 사고) | 기본 | 내 응답. 없으면 빈 응답 | BE-A |
| `PUT /api/guides/incidents/<id>/survey/` | 회원 | (본인, 공개 사고) | 기본 | 선택 항목은 그 사고의 "유출" 항목만. (임시) 2~5번 `YES`/`NO`/`UNKNOWN`, "잘 모르겠어요"와 선택 항목이 함께 오면 400 | BE-A |
| `DELETE /api/guides/incidents/<id>/survey/` | 회원 | 본인(사고 공개 여부 무관) | `sensitive` | 내 설문 응답·선택 항목·그 사고의 완료 기록을 한 트랜잭션으로 삭제. 응답이 없으면 404 | BE-A |
| `GET /api/guides/incidents/<id>/checklist/` | 회원 | (본인, 공개 사고) | 기본 | 공개 조치만으로 계산, 진행률, 새 조치·공지 갱신 표시, 기본 안내(출처·상담 채널). (임시) 조치별 확실/확인 필요 | BE-A |
| `PUT /api/guides/incidents/<id>/completions/<action_id>/` | 회원 | 공통 조치이거나 그 사고의 특수 조치, 공개 상태 | 기본 | 완료 처리 | BE-A |
| `DELETE /api/guides/incidents/<id>/completions/<action_id>/` | 회원 | 위와 같음 | 기본 | 완료 해제 | BE-A |
| `POST /api/guides/ocr/` | 회원 | – | `ocr` 10/시간/사용자 | JPG·PNG 5MB, 메모리 처리, 응답은 사고·항목 ID만 | BE-A |
| `POST /api/reports/` | 회원 | – | `report` 5/일/사용자 | https URL, 길이 제한, 저장 전 마스킹 | BE-B |
| `GET /api/reports/` | 회원 | 본인 | 기본 | 내 제보 목록(상태·반려 사유 포함). 상세 API는 두지 않음 | BE-B |
| `GET /api/mypage/` | 회원 | 본인 | 기본 | 내 사고별 진행률, 내 제보 상태 | BE-B |

- 조치 목록을 직접 조회하는 경로는 두지 않는다. 조치는 체크리스트 계산 결과로만 나간다.
- 비밀번호가 만료된 세션은 `/api/auth/password/`, `/api/auth/logout/`, `/api/auth/me/` 외 모든 회원 API가 403 `PASSWORD_EXPIRED`.

## 관리자 API

`/api/admin/` 아래에 두고 세 겹으로 막는다: **nginx 허용 IP** → **`is_staff`** → **이번 세션의 OTP 인증**(`common.permissions.IsStaffWithOtp`). 하나라도 아니면 404(존재를 드러내지 않음). 모든 요청은 관리자 접속·처리 기록으로 남는다(1년). 관리자는 모든 데이터를 다루므로 URL에 ID를 받는다. 각 앱 담당이 자기 앱의 관리자 API를 만든다.

| 메소드 · 경로 | 내용 | 비고 | 담당 |
|---|---|---|---|
| `GET·POST /api/admin/incidents/companies/` | 기업 목록·등록 | 별칭 정규화, 기업 간 중복 금지 | BE-B |
| `PATCH /api/admin/incidents/companies/<id>/` | 기업 수정 | | BE-B |
| `GET·POST /api/admin/incidents/` | 사고 목록(공개·비공개 모두)·등록 | 신규는 비공개·대응 진행 중. 기업 ID 필수 | BE-B |
| `GET·PATCH /api/admin/incidents/<id>/` | 사고 조회·수정·공개 전환·대응 상태 변경 | https URL 검증, `responseStatus`는 `ONGOING`/`CLOSED`만 | BE-B |
| `POST /api/admin/incidents/<id>/leak-items/` | 유출 항목 추가 | 유출 유형(`leakType`) 필수. `notice_revised_at` 갱신 | BE-B |
| `PATCH·DELETE /api/admin/incidents/<id>/leak-items/<item_id>/` | 유출 항목 수정·삭제 | 사용자가 고른 항목 삭제는 409(수정으로 정정). 수정 시 `notice_revised_at` 갱신 | BE-B |
| `GET·POST /api/admin/guides/actions/` | 조치 목록·등록(공통·특수) | 트리거별 필수값 검증 | BE-A |
| `GET·PATCH /api/admin/guides/actions/<id>/` | 조치 수정·공개 전환 | 처음 공개 시 `published_at` 기록 | BE-A |
| `GET /api/admin/reports/?status=` | 제보 목록 | | BE-B |
| `GET /api/admin/reports/<id>/` | 제보 상세 | 자유 텍스트는 이미 마스킹된 값 | BE-B |
| `POST /api/admin/reports/<id>/approve/` | 승인, 반영한 사고 연결(선택) | 검수자·시각 기록 | BE-B |
| `POST /api/admin/reports/<id>/reject/` | 반려, 사유 필수 | 검수자·시각 기록 | BE-B |

- 사고·조치·기업 삭제 API는 두지 않는다. 내릴 때는 비공개로 전환한다.
- 회원 목록·관리자 계정 비활성화 API는 두지 않는다. 관리자 계정 비활성화와 OTP 기기 등록은 화면·API 없이 서버 명령으로만 한다(10/13 결정).

## 요청 제한

값은 `Back/config/settings/base.py`의 `DEFAULT_THROTTLE_RATES`. 뷰에서 `throttle_scope`로 지정한다.

| 범위 | 값 | 적용 |
|---|---|---|
| `anon` / `user` (기본) | 60/분 / 120/분 | 모든 API |
| `login` | 10/분 | 로그인(IP 기준. 계정 잠금은 django-axes 5회 30분) |
| `signup` | 5/시간 | 가입 |
| `sensitive` | 5/시간 | 비밀번호 변경, 탈퇴 |
| `search` | 60/분 | 사고 검색 |
| `ocr` | 10/시간 | 통지문 인식 |
| `report` | 5/일 | 제보 작성 |
| `otp` | 5/분 | 관리자 OTP |
| `admin` | 120/분 | 관리자 API |

수치는 QA에서 시연·테스트에 지장이 없는지 확인한 뒤 확정한다(BE-B).

## 엔드포인트 상세

엔드포인트마다 아래 양식으로 채운다. **(미정)** 표시는 구현 전에 확정하고, 바뀌면 PR로 고친 뒤 프론트에 알린다.

- 필드 이름은 백엔드 기준 snake_case로 적는다. 프론트는 `apiClient`에서 camelCase로 변환한다(요청·응답·에러 `fields` 키 모두). **(미정: FE1 확인)**
- 성공 응답은 목록을 포함해 전부 `{ "data": ... }`로 감싼다. 204는 본문 없음.
- 공통 에러(401 `AUTH_REQUIRED`, 403 `FORBIDDEN`·`PASSWORD_EXPIRED`, 405, 429 `RATE_LIMITED`, 500)는 항목마다 다시 적지 않는다.

### 인증 (BE-A)

#### GET /api/auth/csrf/
- 권한: 공개 / 요청 제한: 기본
- 응답 204. `csrftoken` 쿠키 발급. 프론트는 앱 시작 시 한 번 호출

#### POST /api/auth/signup/
- 권한: 공개 / 요청 제한: signup
- 요청: `{ email: string(최대 254), password: string(8~64), nickname: string(2~20), agree_terms: bool, agree_privacy: bool, confirm_age: bool }`
- 검증: 이메일 형식·소문자 정규화, 비밀번호 KISA 규칙(`docs/security.md` 1), 닉네임 한글·영문·숫자만 **(미정)**, 동의 3개 모두 `true`
- 동의 값은 검증만 하고 저장하지 않음 **(미정: ERD에 컬럼 없음)**
- 응답 201: `{ data: { nickname } }`. 자동 로그인 없음, 로그인 화면으로 이동
- 에러: 400 `VALIDATION_ERROR`(`fields.email`·`password`·`nickname`·`agree_*`), 409 `CONFLICT`(이미 가입된 이메일)
- 보안 이벤트 로그: 가입(user_id, IP)
- 테스트: `abc12345` 거부, 대소문자만 다른 이메일 409, 동의 누락 400

#### POST /api/auth/login/
- 권한: 공개 / 요청 제한: login(IP) + 계정 잠금(axes 5회 30분)
- 요청: `{ email, password }`
- 응답 200: `{ data: { password_expired: bool } }`. 세션 ID 재발급. `true`면 비밀번호 변경 화면으로
- 에러: 401 `AUTH_FAILED`(이메일·비밀번호 중 무엇이 틀렸는지 구분 X), 429 `ACCOUNT_LOCKED`
- 보안 이벤트 로그: 로그인 성공·실패·잠금(user_id 또는 마스킹 이메일, IP). 비밀번호 기록 X
- 테스트: 없는 이메일·틀린 비밀번호 같은 응답, 5회 실패 후 잠금, 세션 ID 변경

#### POST /api/auth/logout/
- 권한: 회원(만료 상태 허용) / 요청 제한: 기본
- 응답 204. 세션 삭제
- 보안 이벤트 로그: 로그아웃(user_id)

#### GET /api/auth/me/
- 권한: 회원(만료 상태 허용) / 요청 제한: 기본
- 응답 200: `{ data: { nickname, email, password_changed_at, password_expired, is_staff, otp_verified } }`
- `last_login` 없음(10/13 결정). `otp_verified`는 관리자가 아니면 항상 `false`
- 에러: 401 `AUTH_REQUIRED`(프론트는 비로그인으로 처리)

#### POST /api/auth/password/
- 권한: 회원(만료 상태 허용) / 요청 제한: sensitive
- 요청: `{ current_password, new_password }`
- 처리: 현재 비밀번호 확인 → 최소 사용 1일(만료로 강제 변경 중이면 예외) → KISA 규칙 → 최근 4개와 비교 → 저장(`password_changed_at` 갱신, 이력 추가, 4개 초과분 삭제) → 다른 세션 무효화, 현재 세션 유지
- 응답 204
- 에러: 400 `VALIDATION_ERROR`(`fields.current_password` 불일치, `fields.new_password` 규칙·1일·최근 4개)
- 보안 이벤트 로그: 비밀번호 변경 성공·실패(user_id)
- 테스트: 현재 비밀번호 없이·틀리게 거부, 1일 이내 거부, 최근 4개 재사용 거부, 변경 후 다른 세션 401

#### POST /api/auth/withdraw/
- 권한: 회원 / 요청 제한: sensitive
- 요청: `{ current_password }`
- 처리: 현재 비밀번호 확인 → 사용자 삭제(설문 응답·선택 항목·완료 기록·제보·비밀번호 이력 CASCADE) → 세션 삭제
- 응답 204
- 에러: 400 `VALIDATION_ERROR`(`fields.current_password`), 403 `FORBIDDEN`(관리자 계정은 탈퇴 X, 비활성화만)
- 보안 이벤트 로그: 탈퇴(user_id)
- 테스트: 비밀번호 틀리면 거부, 탈퇴 후 개인 데이터 0건, 관리자 거부

#### POST /api/auth/otp/
- 권한: 관리자(`is_staff`, OTP 전) / 요청 제한: otp
- 요청: `{ code: string(숫자 6자리) }`
- 응답 204. 이 세션에서 관리자 API 허용
- 에러: 400 `OTP_FAILED`(실패 문구 하나), 404(관리자 아님)
- 보안 이벤트 로그: OTP 성공·실패(user_id, IP)

### 설문·체크리스트·OCR (BE-A)

`<id>`가 비공개·없는 사고면 404. 내 데이터는 `request.user`로만 찾는다.

#### GET /api/guides/incidents/<id>/survey/
- 권한: 회원 / 요청 제한: 기본
- 응답 200: `{ data: null }`(응답 없음) 또는 `{ data: 설문 객체 }`
- 설문 객체: `{ leak_items_answer: "SELECTED"|"UNKNOWN"|"NONE", selected_item_ids: number[], payment_linked, reused_password, impersonation_contact, damage_occurred: "YES"|"NO"|"UNKNOWN" }` (임시 설문 기준)

#### PUT /api/guides/incidents/<id>/survey/
- 권한: 회원 / 요청 제한: 기본
- 요청: 설문 객체
- 검증: `selected_item_ids`는 그 사고의 "유출" 항목만, `SELECTED`일 때 1개 이상, 그 외에는 `[]`(아니면 400). 2~5번 값은 세 값만
- 저장: `UNKNOWN` → `leak_items_unknown = true`, `NONE` → 선택 항목 없음. 재응답해도 완료 기록 유지
- 응답 204
- 에러: 400 `VALIDATION_ERROR`
- 테스트: 다른 사고 항목 ID 거부, 미유출 항목 거부, `UNKNOWN` + 항목 거부, 비공개 사고 404

#### DELETE /api/guides/incidents/<id>/survey/
- 권한: 회원 / 요청 제한: sensitive
- 처리: 내 설문 응답·선택 항목·그 사고의 완료 기록을 한 트랜잭션으로 삭제. 사고 공개 여부와 무관
- 응답 204
- 에러: 404(내 응답 없음)
- 테스트: 남의 응답 삭제 불가, 완료 기록 함께 삭제

#### GET /api/guides/incidents/<id>/checklist/
- 권한: 회원 / 요청 제한: 기본
- 응답 200: `{ data: { incident_id, company_name, source_url, contact_info, notice_revised, leak_items_unknown, completed_count, total_count, actions[] } }`
- `actions[]`: `{ id, priority, title, summary, steps, source_url, reason, certainty: "CERTAIN"|"CHECK_NEEDED", is_new, completed }`. 우선순위 → 확실 순, 서버 계산
- `summary`: ERD에 없음. 컬럼 추가 전까지 `null` **(미정)**
- `reason`: 서버가 만든 표시 문구(예: "설문: 결제수단 연결")
- 에러: 404(설문 응답 없음 **(미정)**: 프론트는 설문 화면으로 이동)
- 테스트: 비공개 조치·다른 사고 특수 조치 미포함, 진행률 서버 계산

#### PUT /api/guides/incidents/<id>/completions/<action_id>/
- 권한: 회원 / 요청 제한: 기본
- 검증: 조치가 공개 상태이고, 공통 조치이거나 그 사고의 특수 조치
- 응답 204. 이미 완료면 그대로 204
- 에러: 404(조건 밖의 조치)
- 테스트: 다른 사고 특수 조치 ID 404, 비공개 조치 404

#### DELETE /api/guides/incidents/<id>/completions/<action_id>/
- 권한·검증: PUT과 같음
- 응답 204. 완료 기록이 없어도 204

#### POST /api/guides/ocr/
- 권한: 회원 / 요청 제한: ocr
- 요청: `multipart/form-data`, `image`(JPG·PNG, 5MB 이하)
- 처리: 메모리에서만 처리 → OCR → 마스킹 → 기업·유출 항목 매칭. 이미지·원문 저장·로그 X
- 응답 200: `{ data: { incident: { id, company_name } | null, matched_items: [{ id, label }] } }`. 인식 원문은 내보내지 않음
- 에러: 400 `UNSUPPORTED_FILE`(확장자·시그니처), 413 `FILE_TOO_LARGE`, 503 OCR 서비스 실패 **(미정: 코드)**
- 보안 이벤트 로그: OCR 호출(user_id, 결과 일치 여부만)
- 테스트: 확장자만 바꾼 파일 거부, 5MB 초과 거부, 응답에 원문 없음

### 조치 관리자 API (BE-A)

권한: `IsStaffWithOtp`(아니면 404) / 요청 제한: admin. 삭제 API 없음(405).

#### GET·POST /api/admin/guides/actions/
- GET `?status=&incident_id=`: 응답 200 `{ data: { count, next, previous, results[] } }`, `results[]`는 조치 객체
- POST 요청: `{ incident_id: number|null, trigger_type: "LEAK_TYPE"|"SURVEY"|"ALWAYS", leak_type, survey_key, priority: 1~5, title: string(최대 200), steps: string(최대 5,000), source_url: string|null }`
- 검증: `LEAK_TYPE`면 `leak_type` 필수·`survey_key` 비움, `SURVEY`면 `survey_key` 필수, `ALWAYS`면 `incident_id` 필수. `source_url`은 `validate_https_url`
- POST 응답 201: 조치 객체. 신규는 비공개
- 조치 객체: 위 필드 + `id, status: "PUBLIC"|"PRIVATE", published_at`
- 에러: 400 `VALIDATION_ERROR`

#### GET·PATCH /api/admin/guides/actions/<id>/
- PATCH 요청: POST 필드 일부 + `status`
- 처리: 처음 공개로 바뀔 때만 `published_at` 기록(서버 시각)
- 응답 200: 조치 객체
- 에러: 400 `VALIDATION_ERROR`, 404
