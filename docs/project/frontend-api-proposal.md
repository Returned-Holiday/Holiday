# 프론트가 기대하는 API 필드 (제안)

프론트 화면 구현(브랜치 `feat/front-design-system`)에서 쓰는 요청·응답 필드다. `docs/api.md`의 "엔드포인트 상세"가 비어 있어 프론트가 먼저 정했다. **10/14 API 동결 전에 각 담당이 확인**하고, 다르게 정하면 이 문서와 프론트 `features/*/api.ts`·`types.ts`를 같이 고친다.

- 공통: 성공 `{ "data": ... }`, 목록 `{ count, next, previous, results }`, 에러 `{ code, message, fields }`(`docs/rules/api-response.md`)
- 필드 이름은 camelCase(프론트 기준). 백엔드가 snake_case로 내면 serializer에서 맞추거나 프론트에서 변환 계층을 둔다(결정 필요)
- 날짜는 `YYYY-MM-DD`, 시각은 ISO 8601
- 프론트는 모든 응답을 형식 검사(타입 가드)한 뒤 쓴다. 형식이 다르면 "불러오지 못했어요" 화면이 뜬다

## 인증 (BE-A)

| API | 요청 | 응답 `data` |
|---|---|---|
| `GET /auth/me/` | – | `nickname, email, passwordChangedAt, passwordExpired, isStaff, otpVerified` (`lastLogin` 없음) |
| `POST /auth/login/` | `email, password` | 내용 무관(성공 후 `/auth/me/` 다시 조회) |
| `POST /auth/signup/` | `email, password, nickname, agreeTerms, agreePrivacy, confirmAge` | – |
| `POST /auth/password/` | `currentPassword, newPassword` | – (에러 `fields.currentPassword`, `fields.newPassword`) |
| `POST /auth/withdraw/` | `currentPassword` | – |
| `POST /auth/otp/` | `code` | – |

- 401은 세션 만료로 보고 화면 데이터를 비운다. 단 `/auth/me/`, `/auth/login/`, `/auth/csrf/`의 401은 제외
- 로그인 잠금은 `ACCOUNT_LOCKED`(429) `message`를 그대로 보여준다

## 사고 (BE-B)

| API | 응답 |
|---|---|
| `GET /incidents/?q=&page=` | `results[]`: `id, companyName, notifiedAt, responseStatus, leakedLabels[]` |
| `GET /incidents/<id>/` | `id, companyName, notifiedAt, responseStatus, occurredAt, affectedCount, summary, sourceUrl, contactInfo, activeCount, leakItems[]: { id, label, isLeaked }` |

- `responseStatus`: `ONGOING` / `CLOSED`
- `leakedLabels`: 목록 카드에 보여줄 "유출" 항목 이름들
- `activeCount`: "지금 N명이 대응 중"(설문 응답 수)

## 설문·체크리스트·OCR (BE-A)

| API | 요청 | 응답 `data` |
|---|---|---|
| `GET /guides/incidents/<id>/survey/` | – | `null` 또는 아래 설문 객체 |
| `PUT /guides/incidents/<id>/survey/` | 설문 객체 | – |
| `DELETE /guides/incidents/<id>/survey/` | – | – (204) |
| `GET /guides/incidents/<id>/checklist/` | – | 아래 체크리스트 객체 |
| `PUT·DELETE /guides/incidents/<id>/completions/<actionId>/` | 본문 없음 | – (204) |
| `POST /guides/ocr/` | multipart `image` | `incident: { id, companyName } \| null, matchedItems[]: { id, label }` |

설문 객체:
```
leakItemsAnswer: "SELECTED" | "UNKNOWN" | "NONE"   // 1번 (erd 미정 사항의 추천안)
selectedItemIds: number[]                           // SELECTED일 때만, 그 외 []
paymentLinked, reusedPassword, impersonationContact, damageOccurred: "YES" | "NO" | "UNKNOWN"
```

체크리스트 객체:
```
incidentId, companyName, sourceUrl, contactInfo,
noticeRevised: boolean,          // "공지 갱신" 배너
leakItemsUnknown: boolean,       // 1번 "잘 모르겠어요" 안내
completedCount, totalCount,      // 진행률 (서버 계산)
actions[]: { id, priority(1~5), title, summary(null 가능), steps, sourceUrl(null 가능),
             reason("설문: 결제수단 연결" 같은 표시 문구), certainty("CERTAIN"|"CHECK_NEEDED"),
             isNew, completed }
```
- 1~3순위는 "지금 바로 하세요", 4~5순위는 "여유가 될 때 하세요"로 묶는다
- `summary`는 ERD에 없는 컬럼이다(디자인의 한 줄 설명). 추가 여부 결정 필요. 없으면 줄을 생략한다
- `reason` 문구는 서버가 만든다(트리거 종류·키를 프론트가 해석하지 않음)

## 제보·마이페이지 (BE-B)

| API | 요청 | 응답 |
|---|---|---|
| `POST /reports/` | `companyName, sourceUrl, notifiedAt(null 가능), leakItemsText` | – |
| `GET /reports/` | – | `results[]`: `id, companyName, createdAt, status(PENDING·APPROVED·REJECTED), rejectReason, reviewedAt` |
| `GET /mypage/` | – | `incidents[]`: `incidentId, companyName, completedCount, totalCount, urgentRemaining, nextUrgentTitle` |

## 관리자 (BE-A·BE-B)

| API | 요청·응답 |
|---|---|
| `GET /admin/incidents/?q=&status=` | `results[]`: `id, companyName, notifiedAt, leakItemCount, status(PUBLIC·PRIVATE), responseStatus` |
| `GET·PATCH /admin/incidents/<id>/`, `POST /admin/incidents/` | `id, companyId, occurredAt, notifiedAt, affectedCount, sourceUrl, contactInfo, summary, status, responseStatus, leakItems[]` (POST·PATCH 응답도 같은 객체) |
| 유출 항목 `POST·PATCH` | `label, isLeaked, leakType` / 응답 `leakItems[]`에 `leakType, selectedByUsers` 포함 |
| `GET·POST /admin/incidents/companies/`, `PATCH .../<id>/` | `id, name, aliases[]` (목록은 페이지 형식) |
| `GET·POST /admin/guides/actions/`, `PATCH .../<id>/` | `id, incidentId(null=공통), triggerType(LEAK_TYPE·SURVEY·ALWAYS), leakType, surveyKey, priority, title, steps, sourceUrl, status` |
| `GET /admin/reports/?status=` | `results[]`: `id, companyName, reporterNickname, createdAt, status` |
| `GET /admin/reports/<id>/` | 위 + `sourceUrl, notifiedAt, leakItemsText(마스킹된 값), rejectReason` |
| `POST /admin/reports/<id>/approve/` | `incidentId(null 가능)` |
| `POST /admin/reports/<id>/reject/` | `reason` |

- `surveyKey` 값: `PAYMENT_LINKED`, `REUSED_PASSWORD`, `IMPERSONATION_CONTACT`, `DAMAGE_OCCURRED`
- `leakType` 값: `apps/incidents/constants.py`의 `LeakType` 7개
