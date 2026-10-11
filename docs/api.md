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
| `GET /api/auth/me/` | 회원 | 본인 | 기본 | 닉네임, 이메일, 마지막 로그인, 비밀번호 변경일, `isStaff`, `otpVerified` | BE-A |
| `POST /api/auth/password/` | 회원(만료 상태 허용) | 본인 | `sensitive` 5/시간 | 현재 비밀번호 확인 → 최소 1일 → 규칙 → 최근 4개 → 저장 → 다른 세션 무효화 | BE-A |
| `POST /api/auth/withdraw/` | 회원 | 본인 | `sensitive` | 현재 비밀번호 확인 → 개인 데이터 CASCADE 삭제 → 세션 삭제 | BE-A |
| `POST /api/auth/otp/` | 관리자(OTP 전) | 본인 | `otp` 5/분 | TOTP 6자리 확인 → 이 세션에서 관리자 API 허용. 실패 기록 | BE-A |
| `GET /api/incidents/?q=&page=` | 공개 | 공개 사고만 | `search` 60/분/IP | 기업명·별칭 검색, 검색어 50자 제한, 공지일 최신순 | BE-B |
| `GET /api/incidents/<id>/` | 공개 | 공개 사고만(아니면 404) | 기본 | 유출·미유출 항목, 출처, 상담 채널, 대응 중 인원 | BE-B |
| `GET /api/guides/incidents/<id>/survey/` | 회원 | (본인, 공개 사고) | 기본 | 내 응답. 없으면 빈 응답 | BE-A |
| `PUT /api/guides/incidents/<id>/survey/` | 회원 | (본인, 공개 사고) | 기본 | 선택 항목은 그 사고의 "유출" 항목만 | BE-A |
| `GET /api/guides/incidents/<id>/checklist/` | 회원 | (본인, 공개 사고) | 기본 | 공개 조치만으로 계산, 진행률, 새 조치·공지 갱신 표시 | BE-A |
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
| `GET /api/admin/accounts/users/` | 회원 목록 | 이메일은 마스킹해서 보여준다 | BE-A |
| `POST /api/admin/accounts/users/<id>/deactivate/` | 관리자 계정 비활성화 | 삭제 대신 비활성화 | BE-A |
| `GET·POST /api/admin/incidents/companies/` | 기업 목록·등록 | 별칭 정규화, 기업 간 중복 금지 | BE-B |
| `PATCH /api/admin/incidents/companies/<id>/` | 기업 수정 | | BE-B |
| `GET·POST /api/admin/incidents/` | 사고 목록(공개·비공개 모두)·등록 | 신규는 비공개 | BE-B |
| `GET·PATCH /api/admin/incidents/<id>/` | 사고 조회·수정·공개 전환 | https URL 검증 | BE-B |
| `POST /api/admin/incidents/<id>/leak-items/` | 유출 항목 추가 | `notice_revised_at` 갱신 | BE-B |
| `PATCH·DELETE /api/admin/incidents/<id>/leak-items/<item_id>/` | 유출 항목 수정·삭제 | 사용자가 고른 항목 삭제는 409(수정으로 정정). 수정 시 `notice_revised_at` 갱신 | BE-B |
| `GET·POST /api/admin/guides/actions/` | 조치 목록·등록(공통·특수) | 트리거별 필수값 검증 | BE-A |
| `GET·PATCH /api/admin/guides/actions/<id>/` | 조치 수정·공개 전환 | 처음 공개 시 `published_at` 기록 | BE-A |
| `GET /api/admin/reports/?status=` | 제보 목록 | | BE-B |
| `GET /api/admin/reports/<id>/` | 제보 상세 | 자유 텍스트는 이미 마스킹된 값 | BE-B |
| `POST /api/admin/reports/<id>/approve/` | 승인, 반영한 사고 연결(선택) | 검수자·시각 기록 | BE-B |
| `POST /api/admin/reports/<id>/reject/` | 반려, 사유 필수 | 검수자·시각 기록 | BE-B |

- 사고·조치·기업 삭제 API는 두지 않는다. 내릴 때는 비공개로 전환한다.

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

TODO(각 담당, 10/14). 엔드포인트마다 아래 양식으로 채운다.

```
### POST /api/auth/signup/
- 권한: 공개 / 요청 제한: signup
- 요청: { "email": string(최대 254), "password": string(8~64), "nickname": string(2~20) }
- 검증: 이메일 형식·소문자 정규화, 비밀번호 KISA 규칙, 닉네임 허용 문자
- 응답 201: { "data": { "nickname": string } }
- 에러: 400 VALIDATION_ERROR, 409 CONFLICT, 429 RATE_LIMITED
- 보안 이벤트 로그: 가입(user_id, IP)
- 테스트: 약한 비밀번호 거부, 대소문자만 다른 이메일 중복 거부
```
