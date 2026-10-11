# ERD 설계

10월 7일·11일 팀 논의로 만든 ERD 문서(원본: 팀 Claude Docs)를 레포로 옮기고, 10월 11일 보안 검토 결과를 반영했다. **앞으로는 이 파일이 기준**이다. 모델을 바꾸려면 이 문서를 같은 PR에서 함께 고친다.

## 10/11 검토 반영 내역

| # | 변경 | 이유 | 상태 |
|---|---|---|---|
| 1 | `incidents.notice_revised_at` 추가. "공지 갱신" 배너는 `updated_at` 대신 이 값으로 판단 | 유출 항목은 다른 테이블이라 항목을 고쳐도 `incidents.updated_at`이 바뀌지 않음. 반대로 오타 수정만 해도 배너가 뜸 | 팀 확인 필요 |
| 2 | `actions.published_at` 추가. "새 조치" 표시는 `created_at` 대신 이 값으로 판단 | 조치는 비공개로 만들고 나중에 공개함. 작성일 기준이면 공개 전에 설문한 사용자에게 새 조치로 안 보임 | 팀 확인 필요 |
| 3 | `reports.reviewed_by`를 `SET NULL` → **`PROTECT`**. 관리자 계정은 삭제하지 않고 비활성화만 | 관리자 계정을 지우면 어떤 관리자가 검수했는지 추적이 끊김 | 팀 확인 필요 |
| 4 | `users.password_changed_at`, `password_histories` 테이블 추가 | 비밀번호 90일 변경·최근 4개 재사용 금지·최소 1일(팀 결정) | **확정** |
| 5 | 제보 마스킹 대상에 **카드번호·계좌번호** 추가 | 기반시설 IL 마스킹 기준. 통지문 붙여넣기로 들어올 수 있음 | 팀 확인 필요 |
| 6 | 체크 제약 추가: 상태값 허용값, 검수 완료(승인·반려) 시 `reviewed_by`·`reviewed_at` 필수 | 진단 SR3-1 입력 범위, 추적 | 팀 확인 필요 |
| 7 | 관리자 입력 `TEXT` 컬럼에도 최대 길이 지정(모델·serializer). 값은 "입력 길이 상한" 절 | 진단 SR3-1 | 팀 확인 필요 |
| 8 | 삭제 정책 문구 정정: "제보 → 사고 SET NULL"은 **사고가 삭제될 때** 제보의 연결만 해제하는 동작 | 원문 의도 칸이 반대로 적혀 있었음 | 문구 수정 |
| 9 | "DB 제약으로 강제" 문구 정정: 삭제 동작(CASCADE·SET NULL)은 Django 모델의 `on_delete`가 처리 | Django 5.2는 FK에 ON DELETE 절을 만들지 않음. 유일·체크 제약은 DB가 강제 | 문구 수정 |
| 10 | DDL `users`에 Django가 만드는 `last_login`, `is_superuser` 표시 | 실제 스키마와 그림 일치 | 문구 수정 |
| 11 | 사용자 소유 리소스에 외부용 UUID는 두지 않음 | API가 내 리소스를 URL ID가 아니라 `request.user`로 찾음(`docs/api.md`). 추측할 ID가 노출되지 않음 | 결정 기록 |
| 12 | 관리자 기능은 Django 기본 admin 대신 React 관리자 화면 + 관리자 API. 관리자 변경 이력은 공통 감사 로그로 남김 | 팀 구성 변경(프론트 2명) | **확정** |
| 13 | "항상" 트리거는 특수 조치 전용. 체크리스트 위에 사고의 공지 원문(`source_url`)과 상담 채널(`contact_info`)을 "기본 안내"로 항상 표시 | 모든 사용자에게 보여줄 내용은 사고마다 달라 공통 조치로 만들 수 없음. 걸린 조치가 없어도 볼 안내가 남음 | **확정** |
| 14 | 설문 5문항으로 변경: 2~5번 예/아니요/모름, 5번 `damage_occurred`(이미 겪은 피해) 추가, 1번 "잘 모르겠어요"(`leak_items_unknown`) 추가, 체크리스트에 확실/확인 필요 구분 | 기억하기 어려운 문항에서 "아니요"를 고르면 금전 피해 차단 조치가 빠짐. 이미 피해를 입은 사람에게 구제 절차 안내 필요 | **임시** |

"팀 확인 필요" 항목은 10/12 킥오프에서 확정한다. 반대 의견이 없으면 그대로 구현한다.

**임시** 표시는 설문 명세(Claude Docs "소개딩 설문·대응 연결 명세")가 작성 중이라 바뀔 수 있는 내용이다. 모델은 임시 기준으로 만들되, 명세가 확정되면 이 문서를 먼저 고치고 마이그레이션을 맞춘다. 기획서와 달라진 점은 `docs/project/plan.md`에 모은다.

---

## 개요

소개딩(개인정보 유출 대응 헬프데스크)의 DB는 **테이블 10개**로 구성한다. 이 문서는 ERD 그림에 담기지 않는 규칙과 논의에서 합의한 결정을 정리한다.

- 기준: 개발기획서, 10월 7일·11일 논의, 10월 11일 보안 검토
- 실제 스키마는 Django 마이그레이션이 만든다. 아래 SQL은 ERD Cloud 그림 전용이라 DB에 실행하지 않는다. 실제 테이블명은 Django 규칙(예: `incidents_incident`)을 따른다.
- Django 기본 테이블(권한·그룹, 세션, django-axes, django-otp)은 범위 밖이다. 단 보관 정책은 `docs/security.md` 3-6을 따른다. Django 기본 admin은 설치하지 않는다.
- 운영 DB는 AWS RDS MySQL 8.4를 전제로 한다.

## 테이블 구성

관리자가 관리하는 공식 정보 4개, 사용자 소유 데이터 4개, 계정 2개.

| 테이블 | 역할 | 데이터 소유 | Django 앱 |
|---|---|---|---|
| users | 회원(이메일, 비밀번호 해시, 닉네임만 수집) | 사용자 | accounts |
| password_histories | 최근 비밀번호 해시 4개(재사용 검사용) | 사용자 | accounts |
| companies | 기업명과 별칭 | 관리자 | incidents |
| incidents | 공식 사고 정보 | 관리자 | incidents |
| incident_leak_items | 사고별 유출·미유출 항목(발표 원문) | 관리자 | incidents |
| actions | 대응 조치(공통·특수) | 관리자 | guides |
| survey_responses | 사용자의 사고별 설문 응답 | 사용자 | guides |
| survey_selected_items | 설문에서 고른 유출 항목 | 사용자 | guides |
| action_completions | 조치 완료 기록 | 사용자 | guides |
| reports | 사고 제보와 검수 결과 | 사용자(제보), 관리자(검수) | reports |

통지문 인식(ocr 앱)은 모델이 없다. 이미지와 OCR 원문을 저장할 컬럼 자체가 존재하지 않는다.

## 핵심 설계 결정과 근거

| 결정 | 내용 | 근거 |
|---|---|---|
| 기업 분리와 별칭 | companies 1개에 incidents 여러 개(1:N). 별칭은 기업의 필드 하나로 둔다 | 한 기업에서 사고가 반복될 수 있고, 검색과 OCR에서 표기 차이(예: SKT / SK텔레콤)를 맞춰야 한다 |
| 별칭은 JSON 배열 | `companies.aliases`를 JSON 배열로 저장하고, 저장할 때 공백 제거와 소문자 정규화를 한다. **다른 기업과 별칭이 겹치지 않는지 모델 `clean()`에서 검증**한다 | OCR 매칭 규칙을 명확히 한다. JSON은 기업 간 중복을 DB가 막지 못한다 |
| 사고 표시 이름은 조합 | 제목 컬럼 없이 "기업명 · 공지 연월 · 대표 유출 항목"을 조합해 표시 | 같은 기업의 사고를 목록과 OCR 후보 화면에서 구분. 관리자가 제목을 따로 관리하지 않아도 된다 |
| 유출 항목은 행으로 저장 | 사고별로 발표 원문 표현, 유출 여부, 유형 코드를 한 행씩 저장 | 설문 응답이 항목을 ID로 정확히 가리켜야 한다. JSON은 순서가 바뀌면 엉뚱한 항목을 가리킨다 |
| 선택된 유출 항목은 삭제 막음 | 사용자가 고른 항목은 삭제할 수 없고(RESTRICT), 정정은 수정으로 처리 | 추가 공지로 항목을 고칠 때 사용자 선택이 조용히 사라지는 것을 막는다 |
| 유출 유형은 코드 상수 | 테이블 대신 Django `TextChoices`, DB 체크 제약으로 허용값만 받는다 | 우리가 정하는 고정 목록이고 관리자가 바꿀 일이 없다 |
| 조치는 한 테이블 | `incident_id`가 비면 공통 조치, 있으면 그 사고의 특수 조치 | 화면에 보여줄 항목이 같다. 공통 조치 문구 수정도 한 곳에서 끝난다 |
| 체크리스트는 계산형 | 목록은 볼 때마다 계산하고, 완료 기록만 저장 | 관리자가 나중에 추가한 특수 조치가 기존 사용자에게도 나타나야 한다(기획서 3-2) |
| 기본 안내는 사고 정보로 표시 | 체크리스트 위에 그 사고의 `source_url`과 `contact_info`를 항상 보여준다. 조치가 아니라 진행률에 넣지 않는다. "항상" 트리거는 특수 조치 전용 | 걸린 조치가 없어도 볼 안내가 남는다. 사고마다 다른 정보라 공통 조치로 만들 수 없다 |
| (임시) 설문 답에 "모름" | 설문 2~5번은 예/아니요/모름. 모름도 조건으로 쓰고 "확인 필요"로 표시 | 결제수단 연결처럼 기억하기 어려운 문항에서 "아니요"를 고르면 금전 피해 차단 조치가 빠진다. 보여주는 쪽이 안전하다 |
| (임시) 설문 1번은 세 가지 | 항목 선택 / 잘 모르겠어요 / 해당 없음. 잘 모르겠어요는 선택 항목 없이 `leak_items_unknown`만 저장하고, 계산할 때 그 사고의 현재 유출 항목 전체를 쓴다 | 빈 선택이 "해당 없음"인지 "몰라서 비움"인지 구분해야 한다. 추가 공지로 항목이 늘어도 자동 반영 |
| 출처 테이블 없음 | 사고·조치·제보에 URL 컬럼을 두고 https 검증 함수 하나를 공용으로 쓴다 | 같은 출처를 여러 곳에서 재사용하는 경우가 드물다 |
| 조회수 제거 | 메인 목록은 공지일 최신순. "N명이 대응 중"은 설문 응답 수를 조회 시 집계 | 조회수는 새로고침으로 조작되고 GET마다 DB 쓰기가 생긴다 |
| 상담 채널 위치 | 기업 상담센터는 `incidents.contact_info`. 공통 기관(KISA 118 등)은 FAQ(프론트 정적)와 공통 조치 설명에 넣는다 | 비회원이 보는 사고 상세에도 상담 채널이 필요하다(기획서 2-2) |
| 제보는 자유 텍스트, 저장 전 마스킹 | 유출 항목은 자유 텍스트로 받고, 저장 전에 전화번호·이메일·주민번호·**카드번호·계좌번호**를 마스킹 | 사용자가 통지문을 붙여넣으면 본인 개인정보가 DB로 들어올 수 있다 |
| 검수 기록 유지 | `linked_incident_id`, `reviewed_by`, `reviewed_at`을 남긴다. **관리자 계정은 삭제하지 않는다** | 어떤 제보가 어느 사고에 반영됐는지와 관리자 행위를 추적한다 |
| 조치는 삭제하지 않음 | 문제가 있는 조치는 비공개로 내린다 | 사용자의 완료 기록을 보존한다 |
| 이메일은 평문 저장 | 필드 암호화 대신 RDS 저장소 암호화와 DB 접근 통제로 보호 | 이메일은 로그인 ID라서 암호화하면 유일성 검사와 조회가 복잡해진다. 진단 SR2-7의 암호화 대상(고유식별정보, 비밀번호, 카드·계좌 등)에 해당하지 않는다 |
| 비밀번호 이력 별도 테이블 | 최근 4개 해시만 보관, 탈퇴 시 함께 삭제 | 재사용 금지(진단 SR2-3) |

## 테이블별 상세

이름만으로 의미가 분명한 컬럼(id, 생성·수정 시각 등)은 설명을 생략했다.

### users
- `email` (UNIQUE): 소문자로 정규화해 저장. 대소문자만 다른 중복 가입을 막는다. (Django의 `normalize_email`은 도메인만 소문자로 바꾸므로 직접 처리)
- `password`: PBKDF2 해시만 저장
- `password_changed_at`: 비밀번호 마지막 변경 시각. 90일 경과 시 변경 강제, 최소 사용 1일 판단
- `last_login`: Django 기본. 마이페이지에 "마지막 로그인" 표시
- `is_staff`: 관리자 여부. `is_superuser`는 Django 권한 체계용

### password_histories
- `user_id`, `password`(해시), `created_at`
- 비밀번호를 바꿀 때 새 비밀번호를 최근 4개 해시와 비교하고, 저장 후 4개를 넘는 오래된 행은 지운다

### companies
- `name` (UNIQUE): 대표 기업명
- `aliases`: 검색과 OCR 매칭에 쓸 다른 표기들. JSON 배열, 저장 시 공백 제거·소문자 정규화, 기업 간 중복 금지

### incidents
- `company_id`: 사고를 낸 기업
- `occurred_at`, `notified_at`, `affected_count`: 모두 기업 발표 기준. `notified_at`은 메인 목록 정렬 기준이라 인덱스를 건다
- `summary`: 공지 원문을 바탕으로 관리자가 쓴 요약
- `source_url`: 공식 출처(https만)
- `contact_info`: 기업 전담 상담 채널
- `status`: 공개 / 비공개(신규 등록 기본값은 비공개)
- `notice_revised_at`: 기업 추가 공지로 유출 항목이 바뀐 시각. 유출 항목을 저장할 때와 관리자가 "공지 갱신"을 표시할 때만 갱신. "공지 갱신" 배너 판단 기준

사고 제목 컬럼은 두지 않는다. 화면에는 "SK텔레콤 · 2025.04 공지 · 휴대전화번호, 유심 정보 외 2건"처럼 조합해 표시한다.

### incident_leak_items
- `label`: 기업 발표 원문 표현 그대로(예: "휴대전화번호")
- `is_leaked`: 유출 / 미유출(발표 기준). 사고 상세에서 색으로 구분
- `leak_type`: 유출 유형 코드. 가이드 연결 기준. 사용자가 고른 항목은 삭제할 수 없고 정정은 수정으로 처리

### actions
- `incident_id`: 비어 있으면 공통 조치, 있으면 그 사고 전용 특수 조치
- `trigger_type`: 언제 보여줄지. 유형 / 설문 / 항상 중 하나
- `leak_type`: 트리거가 "유형"일 때의 유형 코드
- `survey_key`: 트리거가 "설문"일 때의 응답 키(결제수단 연결 / 비밀번호 재사용 / 사칭 연락 / 피해 발생(임시)). 피해 발생으로 걸리는 피해 구제 조치는 1순위
- `priority`: 1~5 (1 금전 피해 차단 → 5 장기적 도용 예방)
- `steps`: 단계별 설명. 공통 기관 연락처는 여기에 쓴다
- `status`: 공개 / 비공개
- `published_at`: 처음 공개로 바뀐 시각. 사용자의 `survey_responses.updated_at`보다 최신이면 체크리스트에 "새 조치"로 표시

### survey_responses
- (user_id, incident_id)당 하나
- (임시) `payment_linked`, `reused_password`, `impersonation_contact`, `damage_occurred`: 설문 2~5번 응답. 값은 `YES` / `NO` / `UNKNOWN`
- (임시) `leak_items_unknown`: 설문 1번 "잘 모르겠어요". 참이면 선택 항목을 저장하지 않는다. 거짓이고 선택 항목이 없으면 "해당 없음"
- 문항과 선택지 문구는 `docs/features.md` 상황 설문

### survey_selected_items
- 설문 1번 문항("유출 항목 중 본인에게 해당하는 것")의 선택 결과. 응답과 유출 항목을 잇는 연결 테이블
- ERD에서는 (응답, 항목) 복합 PK로 그렸지만, Django에서는 ManyToManyField 연결 테이블(id + 유일 제약)로 구현한다. 의미는 같다. 선택 항목 FK는 `on_delete=RESTRICT`가 필요하므로 through 모델을 직접 정의한다

### action_completions
- (user_id, incident_id, action_id)당 하나. 같은 공통 조치라도 사고별로 따로 완료 처리
- 체크를 해제하면 행을 삭제

### reports
- `reporter_id`: 제보자
- `company_name`, `source_url`, `notified_at`: 제보 내용. 출처는 https 필수
- `leak_items_text`: 유출 항목 자유 텍스트. 저장 전 마스킹, 길이 제한
- `status`: 대기 / 승인 / 반려
- `reject_reason`: 반려 시 필수. 제보자 마이페이지에 텍스트로 표시
- `linked_incident_id`: 승인 시 반영한 사고(선택)
- `reviewed_by`, `reviewed_at`: 검수자와 검수 시각. 승인·반려 시 필수

## 체크리스트 계산 규칙

체크리스트는 저장하지 않고 화면을 열 때마다 계산한다. 저장하는 것은 설문 응답과 완료 기록뿐이다.

계산 순서 (1·2·4번의 "모름"·"잘 모르겠어요" 처리는 임시):
1. 설문 1번 → 유형 집합. 항목을 골랐으면 고른 항목의 유형, "잘 모르겠어요"면 그 사고의 **현재** 유출 항목 전체의 유형, "해당 없음"이면 빈 집합
2. 설문 2~5번 응답 중 "예" 또는 "모름"인 것 → 응답 조건 집합
3. 공개된 조치 중에서 고른다
    - 사고 조건: 공통 조치이거나, 이 사고의 특수 조치
    - 트리거 조건: 유형이 1번 집합에 있거나, 설문 키가 2번 집합에 있거나, 트리거가 "항상"
4. 중복을 빼고 우선순위(1~5) 순으로 정렬. 같은 순위 안에서는 확실 → 확인 필요 순
5. 진행률 = 현재 목록 중 완료 기록이 있는 조치 수 ÷ 현재 목록의 조치 수 (확실·확인 필요 모두 포함, 기본 안내 제외)

**기본 안내**: 설문 결과와 상관없이 체크리스트 위에 사고의 `source_url`과 `contact_info`를 보여준다. 걸린 조치가 하나도 없으면 "선택한 내용으로는 추가 조치가 없어요"와 기본 안내만 보여준다.

**(임시) 확실 / 확인 필요**: 조치마다 계산하는 값이고 DB에 저장하지 않는다.
- 확실: 유형으로 걸림(1번에서 항목을 고른 경우), 설문 "예"로 걸림, 특수 조치의 "항상"
- 확인 필요: 설문 "모름"으로만 걸림, 또는 1번 "잘 모르겠어요"로 유형에 걸림. 화면에 "해당되는지 먼저 확인하세요"를 단다
- 같은 조치가 여러 조건에 걸리면 가장 확실한 쪽을 따른다
- 우선순위가 먼저다. 모름으로 걸린 1순위 조치는 확실한 5순위 조치보다 위에 온다

예시: A사 사고에서 연락처만 유출됐고, 사용자가 "결제수단 연결함, 비밀번호 재사용함, 사칭 연락 없음"으로 답한 경우. 확실/확인 필요가 섞인 예시는 설문 명세의 예시 시나리오를 본다

| 조치 | 사고 | 트리거 | 순위 | 결과 |
|---|---|---|---|---|
| 카드 이용내역 확인·재발급 | 공통 | 설문: 결제수단 연결 | 1 | 포함 |
| 유심 보호 서비스 가입 | 공통 | 유형: 인증수단 | 2 | 제외 |
| 사칭 연락 대응, 118 신고 | 공통 | 설문: 사칭 연락 | 3 | 제외 |
| A사 보상 신청 | A사 | 항상 | 3 | 포함 |
| 다른 사이트 비밀번호 변경 | 공통 | 설문: 비밀번호 재사용 | 4 | 포함 |
| 스미싱 주의 안내 | 공통 | 유형: 연락처 | 5 | 포함 |

"스미싱 주의 안내" 같은 공통 조치는 한 번만 저장되고, 연락처가 유출된 모든 사고에 자동으로 붙는다.

### 예외 규칙

| 상황 | 처리 |
|---|---|
| 설문 재응답 | 완료 기록을 초기화하지 않는다. 새 목록에 남은 조치는 완료 상태 유지 |
| 재응답으로 목록에서 빠진 조치 | 완료 기록은 남기되 화면과 진행률에서 제외 |
| 관리자가 조치를 비공개로 전환 | 화면과 진행률에서 제외. 완료 기록은 보존 |
| 관리자가 특수 조치 추가·공개 | 미완료로 나타나 진행률이 내려간다. `actions.published_at`이 `survey_responses.updated_at`보다 최신이면 "새 조치" 표시 |
| 기업 추가 공지로 유출 항목 추가·정정 | `incidents.notice_revised_at`이 `survey_responses.updated_at`보다 최신이면 "공지 내용이 갱신됐어요. 설문을 다시 확인해 주세요" 배너 |
| 사용자가 체크 해제 | 허용(완료 기록 행 삭제) |
| 같은 조치가 여러 조건에 걸림 | 한 번만 표시 |
| 사고가 비공개로 전환 | 사용자 화면에서 숨김 |

## 상태 값 정의

상태는 세 테이블에만 있고, 모든 상태 변경은 관리자만 할 수 있다(서버에서 권한 검사).

| 대상 | 값 | 의미 |
|---|---|---|
| 제보(reports) | 대기 | 아직 확인하지 못했거나 검토 중 |
| 제보(reports) | 승인 | 확인했고, 내용의 일부 또는 전체를 관리자가 직접 입력한 사고에 반영함 |
| 제보(reports) | 반려 | 부적절한 제보. 사유 필수, 제보자 마이페이지에 표시 |
| 사고(incidents) | 비공개 | 작성 중이거나 내린 상태. 신규 등록 기본값 |
| 사고(incidents) | 공개 | 사용자에게 노출 |
| 조치(actions) | 비공개 | 작성 중, 내부 검토 필요, 또는 내린 상태 |
| 조치(actions) | 공개 | 체크리스트 계산 대상 |

- 같은 사고에 대한 중복 제보도 기존 사고에 반영했다면 "승인"이다. 별도 "중복" 상태는 두지 않는다.
- 제보 승인과 사고 공개는 별개다. 승인 후 관리자가 사고를 정리하고, 검토를 마친 뒤 공개로 바꾼다.
- 조치에 "작성중"과 "내림"을 구분하지 않는 이유: 사용자 입장에서는 둘 다 안 보이고, 완료 기록도 똑같이 보존된다.
- 공통 조치를 비공개로 바꾸면 모든 사고에서 동시에 사라진다. 특정 사고에서만 빼는 기능은 MVP에서 제외한다.

## 무결성 제약과 삭제 정책

유일 제약과 체크 제약은 DB가 강제한다. 삭제 동작(CASCADE, SET NULL, RESTRICT, PROTECT)은 Django 모델의 `on_delete`로 정의하며 ORM이 처리한다. 그래서 **운영 데이터의 수정은 관리자 API(관리자 화면)로만 한다**(셸·직접 SQL 금지).

### 유일 제약
- `users.email`, `companies.name`
- `survey_responses` (사용자, 사고)
- `action_completions` (사용자, 사고, 조치)
- `survey_selected_items` (응답, 유출 항목)

### 체크 제약 (Django 모델에서 정의)
- `leak_type`: 코드 상수에 정의된 값만
- `status`: 테이블별 허용값만
- 트리거가 "유형"이면 `leak_type` 필수, `survey_key`는 비움
- 트리거가 "설문"이면 `survey_key` 필수. 값은 결제수단 연결 / 비밀번호 재사용 / 사칭 연락 / 피해 발생(임시) 중 하나
- 트리거가 "항상"이면 `incident_id` 필수(특수 조치 전용, 확정)
- `priority`는 1~5
- 반려 상태의 제보는 `reject_reason` 필수
- 승인·반려 상태의 제보는 `reviewed_by`, `reviewed_at` 필수
- (임시) 설문 응답 4개 컬럼(`payment_linked`, `reused_password`, `impersonation_contact`, `damage_occurred`)은 `YES` / `NO` / `UNKNOWN`만

### 입력 길이 상한 (팀 확인 필요)

`TEXT` 컬럼은 DB가 길이를 막지 않으므로 모델과 serializer에서 검증한다(진단 SR3-1).

| 컬럼 | 최대 길이 |
|---|---|
| `incidents.summary` | 2,000자 |
| `incidents.contact_info` | 500자 |
| `actions.steps` | 5,000자 |
| `reports.leak_items_text` | 1,000자 |
| `reports.reject_reason` | 500자 |

### 삭제 정책

| 관계 | 삭제 시 동작 | 의도 |
|---|---|---|
| 사용자 → 설문 응답, 선택 항목, 완료 기록, 제보, 비밀번호 이력 | 함께 삭제(CASCADE) | 탈퇴 시 개인 데이터 즉시 삭제 |
| 사고 → 제보의 반영 사고 연결 | 연결만 해제(SET NULL) | 사고가 삭제되면 제보는 남고 연결만 끊긴다 |
| 검수자 → 제보 | 삭제 막음(PROTECT) | 관리자 계정은 삭제하지 않고 비활성화한다 |
| 사고 → 유출 항목 | 함께 삭제(CASCADE) | 항목은 사고의 일부 |
| 유출 항목 → 설문 선택 항목 | 삭제 막음(RESTRICT) | 사용자가 고른 항목이 조용히 사라지지 않게. 정정은 수정으로 |
| 사고 → 설문 응답, 완료 기록, 특수 조치 | 삭제 막음(RESTRICT) | 사용자 데이터가 있는 사고는 비공개로 처리 |
| 조치 → 완료 기록 | 삭제 막음(RESTRICT) | 조치는 비공개로 내린다 |
| 기업 → 사고 | 삭제 막음(RESTRICT) | 사고가 있는 기업은 지울 수 없다 |

관리자 화면에서 삭제가 막힌 항목을 지우려 하면 관리자 API가 409로 거부하고, 화면은 "비공개로 전환"을 안내한다. 사고·조치·기업은 삭제 API 자체를 두지 않는다.

### 탈퇴 시 동작
비밀번호를 재확인한 뒤 사용자를 삭제한다. 설문 응답, 선택 항목, 완료 기록, 제보, 비밀번호 이력이 함께 삭제되고, 기업·사고·조치는 그대로 남는다(사용자 FK가 없음). 기획서 5-3("제보 내역은 삭제, 검수로 등록된 사고는 유지")과 같은 동작이다.

## 서버 코드에서 검증할 보안 규칙

DB 제약으로 표현할 수 없는 규칙은 서버 코드에서 검증하고, 각 규칙은 테스트로 고정한다. 소스코드 진단에서 확인될 수 있는 지점이다.

- **공개 필터**: 사용자에게 보이는 모든 사고·조치 조회는 서버에서 "공개"만 거른다. URL을 직접 입력해도 비공개는 404(기획서 5-2-3)
- **소유 필터**: 설문 응답, 완료 기록, 제보는 항상 `user = 요청자`로 조회(IDOR 방지). 이 리소스들은 URL에 ID를 받지 않는다
- **설문 선택 항목 검증**: 고른 항목은 그 사고의 항목이고 "유출" 항목이어야 한다. (임시) "잘 모르겠어요"(`leak_items_unknown`)와 선택 항목이 함께 오면 거부한다
- **완료 처리 검증**: 완료하려는 조치는 공통 조치이거나 그 사고의 특수 조치이고, 공개 상태여야 한다. 이게 없으면 다른 사고의 특수 조치 ID로 완료 처리하는 요청을 막지 못한다
- **상태 변경 권한**: 제보 검수와 공개 전환은 관리자만
- **URL 검증**: 공용 검증 함수로 https만 허용하고 길이 제한. 서버는 이 URL에 접속하지 않는다(SSRF 방지). 프론트는 외부 링크를 `rel="noopener noreferrer"`로 연다
- **제보 마스킹**: 저장 전 전화번호·이메일·주민번호·카드번호·계좌번호 마스킹, 길이 제한. 입력 화면에 "개인정보를 입력하지 마세요" 안내
- **텍스트 출력**: 자유 텍스트는 어디서든 텍스트로만 출력. 사용자 화면과 관리자 화면 모두 React의 기본 이스케이프를 우회하지 않는다
- **OCR 미저장**: 이미지와 OCR 원문은 저장하지 않고 분석 후 폐기. 응답에는 DB에 있는 값(사고·항목 ID 등)만
- **관리자 변경 이력**: 관리자 API 요청(조회 포함)은 공통 감사 로그로 남긴다: 시각, 관리자, IP, 대상, 행위. 변경 전후 값은 남기지 않는다(`docs/security.md` 3-6)

## ERD에 반영된 보안 요소

| 보안 요소 | ERD 반영 방식 |
|---|---|
| 개인정보 최소 수집 | users는 이메일, 비밀번호 해시, 닉네임만 저장 |
| 저장하지 않기 | 통지문 이미지·OCR 원문 컬럼이 없음 |
| 파기 | 탈퇴 시 개인 데이터 CASCADE 삭제. 공식 정보(기업·사고·조치)는 사용자 FK가 없어 그대로 남음 |
| 접근 통제 근거 | `status`(공개 필터), `user_id`(소유 필터, IDOR 방지) |
| 무결성 | 유일 제약, 체크 제약, RESTRICT로 "삭제 대신 비공개" 강제 |
| 추적 | `reviewed_by`(PROTECT), `reviewed_at`, 관리자 감사 로그, 관리자 계정 삭제 금지 |
| 입력 데이터 | 제보 자유 텍스트는 저장 전 마스킹 |
| 비밀번호 정책 | `password_changed_at`, `password_histories` |

DB 계정 분리(앱 계정은 데이터 조회·수정만)는 `infra/CLAUDE.md`, 로그 보관은 `docs/security.md` 3-6.

## ERD Cloud 가져오기용 SQL

ERD Cloud에서 그림을 그리기 위한 MySQL DDL이다. 10월 11일 검토 반영본. `survey_responses`는 임시 설문 기준이다.

- 그림 전용이다. 실제 테이블은 Django 마이그레이션이 만들므로 운영 DB에 실행하지 않는다.
- 체크 제약(유형 코드, 트리거별 필수 컬럼, 우선순위 범위, 상태값)은 ERD 도구가 잘 읽지 못해 넣지 않았다. 실제로는 Django 모델에서 건다.
- 가져오기에서 JSON 타입 오류가 나면 `aliases`를 VARCHAR(500)으로 바꿔 가져온 뒤 화면에서 타입을 고친다.

```sql
CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '사용자 ID',
  email VARCHAR(254) NOT NULL COMMENT '이메일(소문자 저장)',
  password VARCHAR(128) NOT NULL COMMENT '비밀번호 해시(PBKDF2)',
  password_changed_at DATETIME NOT NULL COMMENT '비밀번호 마지막 변경(90일 강제, 최소 1일)',
  nickname VARCHAR(20) NOT NULL COMMENT '닉네임',
  last_login DATETIME NULL COMMENT '마지막 로그인(Django 기본)',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성 여부(관리자는 삭제 대신 비활성화)',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE COMMENT '관리자 여부',
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE COMMENT '최고 관리자(Django 기본)',
  date_joined DATETIME NOT NULL COMMENT '가입일',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) COMMENT '사용자';

CREATE TABLE password_histories (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '이력 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  password VARCHAR(128) NOT NULL COMMENT '이전 비밀번호 해시',
  created_at DATETIME NOT NULL COMMENT '저장 시각',
  PRIMARY KEY (id),
  KEY ix_pwhist_user_created (user_id, created_at),
  CONSTRAINT fk_pwhist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT '비밀번호 이력(최근 4개)';

CREATE TABLE companies (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '기업 ID',
  name VARCHAR(100) NOT NULL COMMENT '기업명',
  aliases JSON NULL COMMENT '별칭 배열(공백 제거, 소문자 정규화, 기업 간 중복 금지)',
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_name (name)
) COMMENT '기업';

CREATE TABLE incidents (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '사고 ID',
  company_id BIGINT NOT NULL COMMENT '기업 ID',
  occurred_at DATE NULL COMMENT '발생일(기업 발표 기준)',
  notified_at DATE NOT NULL COMMENT '공지일(목록 정렬 기준)',
  affected_count INT NULL COMMENT '영향 인원(기업 발표 기준)',
  summary TEXT NOT NULL COMMENT '공지 요약(최대 2,000자)',
  source_url VARCHAR(500) NOT NULL COMMENT '공식 출처(https만)',
  contact_info TEXT NULL COMMENT '기업 전담 상담 채널(최대 500자)',
  status VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' COMMENT '공개/비공개',
  notice_revised_at DATETIME NULL COMMENT '공지 갱신 시각(유출 항목 변경 시, 배너 판단)',
  created_at DATETIME NOT NULL COMMENT '등록일',
  updated_at DATETIME NOT NULL COMMENT '수정일',
  PRIMARY KEY (id),
  KEY ix_incidents_notified_at (notified_at),
  CONSTRAINT fk_incidents_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT
) COMMENT '사고';

CREATE TABLE incident_leak_items (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '유출 항목 ID',
  incident_id BIGINT NOT NULL COMMENT '사고 ID',
  leak_type VARCHAR(30) NOT NULL COMMENT '유출 유형 코드(코드 상수)',
  label VARCHAR(100) NOT NULL COMMENT '발표 원문 표현',
  is_leaked BOOLEAN NOT NULL COMMENT '유출/미유출',
  PRIMARY KEY (id),
  CONSTRAINT fk_leak_items_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
) COMMENT '사고별 유출 항목';

CREATE TABLE actions (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '조치 ID',
  incident_id BIGINT NULL COMMENT '사고 ID(비면 공통 조치)',
  trigger_type VARCHAR(20) NOT NULL COMMENT '트리거 종류(유형/설문/항상)',
  leak_type VARCHAR(30) NULL COMMENT '유형 트리거 값',
  survey_key VARCHAR(30) NULL COMMENT '설문 트리거 값',
  priority INT NOT NULL COMMENT '우선순위(1~5)',
  title VARCHAR(200) NOT NULL COMMENT '조치 제목',
  steps TEXT NOT NULL COMMENT '단계별 설명(기관 연락처 포함, 최대 5,000자)',
  source_url VARCHAR(500) NULL COMMENT '공식 출처(https만)',
  status VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' COMMENT '공개/비공개',
  published_at DATETIME NULL COMMENT '처음 공개된 시각(새 조치 표시 판단)',
  created_at DATETIME NOT NULL COMMENT '등록일',
  updated_at DATETIME NOT NULL COMMENT '수정일',
  PRIMARY KEY (id),
  CONSTRAINT fk_actions_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE RESTRICT
) COMMENT '대응 조치(공통/특수)';

CREATE TABLE survey_responses (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '설문 응답 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  incident_id BIGINT NOT NULL COMMENT '사고 ID',
  payment_linked VARCHAR(10) NOT NULL COMMENT '결제수단 연결 여부(YES/NO/UNKNOWN, 임시)',
  reused_password VARCHAR(10) NOT NULL COMMENT '비밀번호 재사용 여부(YES/NO/UNKNOWN, 임시)',
  impersonation_contact VARCHAR(10) NOT NULL COMMENT '사칭 연락 수신 여부(YES/NO/UNKNOWN, 임시)',
  damage_occurred VARCHAR(10) NOT NULL COMMENT '피해 발생 여부(YES/NO/UNKNOWN, 임시)',
  leak_items_unknown BOOLEAN NOT NULL DEFAULT FALSE COMMENT '설문 1번 잘 모르겠어요(참이면 선택 항목 없음, 임시)',
  updated_at DATETIME NOT NULL COMMENT '응답 수정일',
  PRIMARY KEY (id),
  UNIQUE KEY uq_survey_user_incident (user_id, incident_id),
  CONSTRAINT fk_survey_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_survey_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE RESTRICT
) COMMENT '설문 응답';

CREATE TABLE survey_selected_items (
  survey_response_id BIGINT NOT NULL COMMENT '설문 응답 ID',
  leak_item_id BIGINT NOT NULL COMMENT '선택한 유출 항목 ID',
  PRIMARY KEY (survey_response_id, leak_item_id),
  CONSTRAINT fk_selected_survey FOREIGN KEY (survey_response_id) REFERENCES survey_responses (id) ON DELETE CASCADE,
  CONSTRAINT fk_selected_item FOREIGN KEY (leak_item_id) REFERENCES incident_leak_items (id) ON DELETE RESTRICT
) COMMENT '설문에서 선택한 유출 항목';

CREATE TABLE action_completions (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '완료 기록 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  incident_id BIGINT NOT NULL COMMENT '사고 ID',
  action_id BIGINT NOT NULL COMMENT '조치 ID',
  completed_at DATETIME NOT NULL COMMENT '완료 시각',
  PRIMARY KEY (id),
  UNIQUE KEY uq_completion (user_id, incident_id, action_id),
  CONSTRAINT fk_completion_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_completion_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE RESTRICT,
  CONSTRAINT fk_completion_action FOREIGN KEY (action_id) REFERENCES actions (id) ON DELETE RESTRICT
) COMMENT '조치 완료 기록';

CREATE TABLE reports (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '제보 ID',
  reporter_id BIGINT NOT NULL COMMENT '제보자 ID',
  company_name VARCHAR(100) NOT NULL COMMENT '제보 기업명',
  source_url VARCHAR(500) NOT NULL COMMENT '공식 출처(https만)',
  notified_at DATE NULL COMMENT '공지일',
  leak_items_text TEXT NOT NULL COMMENT '유출 항목(자유 텍스트, 저장 전 마스킹, 최대 1,000자)',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '대기/승인/반려',
  reject_reason TEXT NULL COMMENT '반려 사유(반려 시 필수, 제보자에게 표시, 최대 500자)',
  linked_incident_id BIGINT NULL COMMENT '반영된 사고 ID',
  reviewed_by BIGINT NULL COMMENT '검수자 ID(승인·반려 시 필수)',
  reviewed_at DATETIME NULL COMMENT '검수 시각(승인·반려 시 필수)',
  created_at DATETIME NOT NULL COMMENT '제보일',
  PRIMARY KEY (id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_incident FOREIGN KEY (linked_incident_id) REFERENCES incidents (id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT
) COMMENT '사고 제보';
```

## 미정 사항과 다음 단계

- **설문 구성(임시)**: 설문 명세 작성 중. 확정되면 "임시" 표시를 지우고 `docs/features.md`, `docs/api.md`, `docs/project/plan.md`를 함께 고친다. 남은 것: 같은 순위·같은 확실 여부 안의 순서, 피해 구제 조치 내용, 연락처(`CONTACT`) 유형에 연결할 조치
- **설문 1번 "해당 없음" 저장 방식**: 지금은 `leak_items_unknown = false` + 선택 항목 0개. 이러면 1번을 비워 보낸 요청과 구분이 안 돼 "빈 선택 금지"를 서버가 강제할 수 없다. 후보는 API 요청에서 1번 답을 `SELECTED` / `UNKNOWN` / `NONE`으로 명시하게 하는 것, 또는 컬럼을 bool 대신 이 선택값으로 바꾸는 것
- **유출 유형 목록**: 기획서의 5대 유형(연락처, 계정정보, 주민등록번호, 금융정보, 위치정보)에는 유심·인증키 같은 인증수단 정보가 들어갈 곳이 없다(기획서 우선순위 2순위와 충돌). 후보는 인증수단 정보 추가, 위치정보 재검토(대응 행동이 불분명하면 "기타"로 흡수), "기타" 추가. 실제 유출 공지 5~10건을 매핑해 기타가 많이 쌓이면 유형을 조정한다. 백엔드 골격의 `apps/incidents/constants.py`의 `LeakType`에는 후보 7개(5대 유형 + 인증수단 정보 + 기타)를 넣어 두었다.

- [ ] 10/11 검토 반영 내역 중 "팀 확인 필요" 항목 확정 (10/12 킥오프)
- [ ] 설문 명세 확정 후 "임시" 항목 정리
- [ ] 실제 유출 공지 5~10건을 모아 유형 매핑으로 검증
- [x] "항상" 트리거 범위 결정: 특수 조치 전용 (검토 13번)
- [ ] ERD Cloud 그림을 영역별(공식 정보 / 사용자 진행 / 제보 / 계정)로 재배치하고 위 SQL로 갱신
- [x] 기능별 앱(accounts, incidents, guides, reports, mypage)으로 Django 뼈대 구성(`docs/backend.md`). 모델은 BE-A가 작성
- [ ] 앱별 모델 담당자 지정, 모델 변경은 PR로만 받기(마이그레이션 충돌 방지)
- [ ] 11월 2일 소스코드 진단 전까지 스키마 안정화
