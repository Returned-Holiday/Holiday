# API 공통 규칙

엔드포인트 목록과 엔드포인트별 보안 속성은 `docs/api.md`. 이 문서는 모든 API에 공통으로 적용하는 규칙이다.

## 기본
- 경로: `/api/<앱>/...`, 관리자는 `/api/admin/<앱>/...`. 끝에 `/`를 붙인다
- 형식: JSON만(`Content-Type: application/json`). 파일 업로드만 `multipart/form-data`
- 날짜·시각: ISO 8601. 시각은 UTC로 저장하고 응답에는 타임존을 포함한다(예: `2026-10-11T09:00:00+09:00`)
- 인증: 서버 세션 쿠키. 프론트는 `withCredentials: true`

## 보안 규칙

| 규칙 | 내용 | 근거 |
|---|---|---|
| 기본 거부 | 모든 API는 로그인 필요가 기본. 공개 API만 명시적으로 연다 | 진단 SR2-1 |
| 내 데이터는 URL에 소유자 ID를 받지 않음 | 설문·체크리스트·제보·마이페이지는 `request.user`로 찾는다 | 기반 IN |
| 존재 여부 비노출 | 비공개 사고, 다른 사용자 리소스, 없는 리소스, 관리자가 아닌 사용자의 관리자 API 요청은 모두 **404** | 기반 IN·IL·AE |
| CSRF | 상태를 바꾸는 요청(POST·PUT·PATCH·DELETE)은 `X-CSRFToken` 헤더 필수. 앱 시작 시 `GET /api/auth/csrf/`로 쿠키 발급 | 진단 SR1-6 |
| 허용 메소드 | 엔드포인트마다 필요한 메소드만. 그 외 405 | 기반 WM |
| 목록 크기 | 페이지 크기 20 고정. 클라이언트가 크기를 바꿀 수 없다 | 자원 고갈 방지 |
| 요청 제한 | `docs/api.md`의 범위별 제한. 초과 시 429 | 기반 AU |
| 캐시 | 회원 API 응답은 `Cache-Control: no-store` | 진단 SR2-7 |
| 응답 필드 최소화 | 화면에 필요한 필드만. 다른 사용자 정보·내부 값 금지 | 기반 IL |

## 응답 형식

성공(`Back/config/renderers.py`가 감싼다):
```json
{ "data": { ... } }
```

목록(DRF 페이지네이션, 목록도 `data`로 감싼다):
```json
{ "data": { "count": 134, "next": "...", "previous": null, "results": [ ... ] } }
```

본문 없는 성공(204)은 감싸지 않는다. 에러 응답도 감싸지 않는다.

에러(`Back/config/errors.py`가 만든다):
```json
{ "code": "VALIDATION_ERROR", "message": "입력값을 확인해 주세요.", "fields": { "email": ["올바른 이메일 형식이 아닙니다."] } }
```
- `message`는 사용자에게 그대로 보여줘도 되는 일반 문구만
- `fields`는 입력 검증 에러일 때만. 내부 예외 메시지·스택·쿼리는 절대 넣지 않는다

## 상태 코드

| 코드 | 언제 |
|---|---|
| 200 / 201 / 204 | 조회·수정 / 생성 / 삭제 |
| 400 | 입력 검증 실패 |
| 401 | 로그인 필요, 세션 만료 |
| 403 | 로그인했지만 허용되지 않음(CSRF 실패, 비밀번호 만료로 차단) |
| 404 | 없음, 비공개, 다른 사용자 리소스, 관리자 아님 |
| 405 | 허용되지 않은 메소드 |
| 409 | 중복(이미 가입된 이메일 등), 삭제할 수 없는 항목 |
| 413 | 업로드 크기 초과 |
| 429 | 요청 제한 초과, 로그인 잠금 |
| 500 | 서버 에러(일반 메시지만) |

## 에러 코드

공통 코드는 `Back/config/errors.py`에 이미 있다. 앱별 코드는 각 담당이 10/14 API 동결 전에 확정한다.

| code | HTTP | 의미 | 위치 |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | 입력값 오류 | 공통 |
| `AUTH_REQUIRED` | 401 | 로그인 필요 | 공통 |
| `FORBIDDEN` | 403 | 허용되지 않음(CSRF 실패 포함) | 공통 |
| `NOT_FOUND` | 404 | 없음·비공개·권한 없음 | 공통 |
| `METHOD_NOT_ALLOWED` | 405 | 허용되지 않은 메소드 | 공통 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | 지원하지 않는 형식 | 공통 |
| `RATE_LIMITED` | 429 | 요청 제한 초과 | 공통 |
| `SERVER_ERROR` | 500 | 서버 에러 | 공통 |
| `AUTH_FAILED` | 401 | 이메일 또는 비밀번호 불일치(어느 쪽인지 구분하지 않음) | accounts |
| `ACCOUNT_LOCKED` | 429 | 로그인 잠금(30분) | accounts |
| `PASSWORD_EXPIRED` | 403 | 비밀번호 90일 경과, 변경 필요 | accounts |
| `OTP_FAILED` | 400 | 관리자 OTP 불일치(실패 문구 하나) | accounts |
| `CONFLICT` | 409 | 중복, 삭제할 수 없는 항목 | 각 앱 |
| `FILE_TOO_LARGE` | 413 | 업로드 5MB 초과 | guides |
| `UNSUPPORTED_FILE` | 400 | JPG·PNG 아님 | guides |
| `OCR_UNAVAILABLE` | 503 | 외부 OCR 서비스 실패(일반 문구, 원인은 로그에만) | guides |
