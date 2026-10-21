# infra — nginx·AWS

담당: BE-A(구성), BE-B(검토). 근거는 기반시설 가이드 웹 서비스(WEB)·DBMS(D)·클라우드(CA) 항목과 `docs/security.md` 3-7.

## 구성
```
사용자 ─HTTPS─▶ Route 53 ─▶ Internet Gateway ─▶ EC2 (Public Subnet)
                                              nginx(TLS 종료, 정적 파일) ─▶ Gunicorn 127.0.0.1:8000 ─▶ Django
                                                                                         │
                                         RDS MySQL 8.4 (Private Subnet) ◀── 3306 ────────┘
EC2 ─IAM Role─▶ Secrets Manager(DB 계정, SECRET_KEY, OCR 키), CloudWatch Logs
EC2 ─HTTPS─▶ 네이버 클로바 OCR (통지문 분석 시에만)
```

## 파일
| 파일 | 서버 위치 |
|---|---|
| `nginx/returnedholiday.conf`, `nginx/proxy-params.conf` | `/etc/nginx/conf.d/`, `/etc/nginx/returnedholiday/` |
| `nginx/_error.html` | `/srv/returnedholiday/nginx/` |
| `systemd/*` | `/etc/systemd/system/` |
| `cloudwatch/agent.json` | CloudWatch 에이전트 설정 |
| `deploy.md` | 배포 순서·확인 체크리스트 |

도메인·리전·시크릿 이름은 `<...>` 자리표시자. 서버에서 치환하고 레포에는 실제 값을 쓰지 않는다.

## nginx 기준값
| 설정 | 값 | 근거 |
|---|---|---|
| 버전 노출 | `server_tokens off;` | WEB-16, 기반 EP |
| 디렉터리 목록 | `autoindex off;` (가이드 WEB-24 예시의 `on`은 따르지 않음) | WEB-04, 기반 DI |
| SSI | `ssi off;` | WEB-19 |
| 심볼릭 링크 | `disable_symlinks on;` | WEB-12 |
| 업로드 크기 | `client_max_body_size 5M;` | WEB-08 |
| 실행 계정 | root가 아닌 전용 계정 | WEB-09 |
| TLS | `ssl_protocols TLSv1.2 TLSv1.3;` | WEB-20, 기반 SN |
| HTTP | 80 → `return 301 https://$host$request_uri;` | WEB-21 |
| 에러 페이지 | 4xx·5xx 공통 페이지, `internal;` | WEB-22, 기반 EP |
| WebDAV·불필요 메소드 | `dav_methods` 사용 안 함, 불필요 메소드 차단 | WEB-18, 기반 WM |
| 보안 헤더 | HSTS, CSP(`script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`), `X-Content-Type-Options nosniff`, Referrer-Policy | `docs/security.md` 3-4 |
| 불필요 경로 | 기본 index.html, 불필요한 `alias`·`location` 제거 | WEB-07, WEB-17 |
| 로그 권한 | 디렉터리 750, 파일 640, 서버 내부 7일 순환 | WEB-26 |

## 관리자 접근
- 관리자 화면은 React SPA의 일부라 같은 출처(443)를 쓴다. 그래야 세션 쿠키와 CSRF 보호를 그대로 쓸 수 있다
- **`location /api/admin/`은 허용 IP(팀원)만** `allow`하고 나머지는 `deny`한다. 서버도 `is_staff` + OTP를 다시 검사한다
- Django 기본 admin은 설치하지 않으므로 `/admin/` 경로는 존재하지 않는다
- 허용 IP 목록: TODO(BE-A, 배포 준비 시) — 레포에 쓰지 말고 서버의 별도 설정 파일로 관리하고 팀 비공개 채널로 공유

## 보안그룹
| 그룹 | 인바운드 |
|---|---|
| SG-web (EC2) | 443, 80(리다이렉트용) 전체 / SSH는 팀원 IP만 |
| SG-db (RDS) | 3306은 SG-web에서만 (IP가 아니라 보안그룹 참조) |

## DB
- RDS는 Private Subnet, 퍼블릭 접근 끔, 저장소 암호화 켬, 자동 백업 켬
- **계정 분리**: 앱 계정은 `SELECT, INSERT, UPDATE, DELETE`만. 마이그레이션 계정은 별도(DDL 권한). 마스터 계정은 앱이 쓰지 않음 (D-04, D-06)
- 문자셋 `utf8mb4`
- 에러 로그를 CloudWatch로 내보내기(90일)

## 비밀값
- `SECRET_KEY`, DB 계정, OCR 키는 Secrets Manager. EC2는 IAM 역할로 시작 시 조회
- 코드·환경변수 파일·user data에 평문으로 두지 않는다

## 로그 (CloudWatch Logs)
| 로그 그룹 | 보관 | 수집 대상 |
|---|---|---|
| 관리자 접속·처리 기록 | 365일 | `/var/log/returnedholiday/audit.log` |
| 사용자 보안 이벤트 | 90일 | `/var/log/returnedholiday/security.log` |
| nginx 접근·에러 | 90일 | nginx 로그 |
| RDS 에러 | 90일 | RDS 로그 내보내기 |
| 일반 앱 로그 | 30일 | `/var/log/returnedholiday/app.log` |

- `/var/log/returnedholiday`는 서비스 계정 소유, 디렉터리 750·파일 640. 없으면 Django 시작 실패

- EC2 IAM 역할에는 로그 **쓰기 권한만**(`logs:CreateLogStream`, `logs:PutLogEvents` 등). 삭제·보관 정책 변경 권한은 주지 않는다
- 세션 정리: `manage.py clearsessions`를 매일 실행(cron 또는 systemd timer)

## AWS 계정
- 루트 계정은 일상 작업에 쓰지 않는다. 팀원별 IAM 사용자 + MFA (CA-01~04)
- 최소 권한 정책, 쓰지 않는 계정·키 삭제
- 리소스 이름·리전: TODO(BE-A)
