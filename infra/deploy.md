# 스테이징 배포 체크리스트

`<도메인>`, 시크릿 이름, 허용 IP, 비밀번호는 레포에 쓰지 않는다. 서버에서 직접 넣고 팀 비공개 채널로 공유한다. 기준값은 `infra/CLAUDE.md`.

- 계정: 프로젝트 계정(소셜 로그인, 무료 플랜). **리전은 시드니 `ap-southeast-2`로 고정**(아래 `<리전>` 자리)
- 서버 접속: **Session Manager만**(EC2 콘솔 → 인스턴스 → 연결 → Session Manager). 22번 포트를 열지 않고 SSH 키를 만들지 않는다
- 작업 전 콘솔에서 Secrets Manager 테스트 시크릿을 만들었다가 지워 생성 가능 여부 확인

## 0. 도메인 (첫날)
이 계정은 Route 53 도메인 구매가 막혀 있다("Free Tier accounts are not supported"). 외부에서 사서 Route 53으로 연결한다.
- [ ] 외부 등록업체(가비아, Namecheap 등)에서 도메인 구매
- [ ] Route 53 → 호스팅 영역 생성(퍼블릭) → NS 레코드 4개 확인
- [ ] 등록업체 관리 화면에서 네임서버를 위 4개로 변경. 반영은 보통 몇 시간, 최대 하루 이상 → **인증서(7단계)는 반영 후에만 가능**하니 가장 먼저
- [ ] 반영 확인: `nslookup -type=NS <도메인>`에 `awsdns`가 보이면 완료

## 1. 계정·네트워크
- [ ] 팀원은 각자 계정으로 초대 + MFA(공용 로그인 X). 필요한 사람만 초대
- [ ] VPC: 퍼블릭 서브넷 1(EC2), 프라이빗 서브넷 2(RDS 서브넷 그룹은 AZ 2개 필요). NAT 게이트웨이 만들지 않음(비용, 불필요)
- [ ] SG-web: 443·80 전체만. **22번 없음**(Session Manager)
- [ ] SG-db: 3306은 SG-web에서만(보안그룹 참조)

## 2. RDS
- [ ] MySQL 8.4, 프라이빗 서브넷 그룹, 퍼블릭 접근 끔, 저장소 암호화, 자동 백업
- [ ] 파라미터 그룹: `character_set_server=utf8mb4`, `collation_server=utf8mb4_0900_ai_ci`
- [ ] 에러 로그 CloudWatch 내보내기
- [ ] 마스터 계정으로 접속해 DB와 계정 2개 생성. 마스터 계정은 이후 앱이 쓰지 않음

```sql
CREATE DATABASE returnedholiday CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- 앱: 데이터 조회·수정만 (SQL 삽입이 나도 테이블 구조 변경 X)
CREATE USER 'rh_app'@'<VPC 대역>' IDENTIFIED BY '<앱 비밀번호>';
GRANT SELECT, INSERT, UPDATE, DELETE ON returnedholiday.* TO 'rh_app'@'<VPC 대역>';
-- 마이그레이션 전용
CREATE USER 'rh_migrate'@'<VPC 대역>' IDENTIFIED BY '<마이그레이션 비밀번호>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON returnedholiday.* TO 'rh_migrate'@'<VPC 대역>';
```

## 3. Secrets Manager
시크릿 2개, 키는 같고 DB 계정만 다르다(`config/secrets.py`가 `AWS_SECRET_ID`의 시크릿을 읽음).

| 키 | 값 |
|---|---|
| `DJANGO_SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_ALLOWED_HOSTS` | `<도메인>` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://<도메인>` |
| `DB_NAME`, `DB_HOST`, `DB_PORT` | `returnedholiday`, RDS 엔드포인트, `3306` |
| `DB_USER`, `DB_PASSWORD` | 앱 시크릿은 `rh_app`, 마이그레이션 시크릿은 `rh_migrate` |
| `CLOVA_OCR_URL`, `CLOVA_OCR_SECRET` | 클로바 일반 OCR Invoke URL(`https://...apigw.ntruss.com/...`)·Secret Key. 앱 시크릿에만 |

## 4. IAM 역할(EC2)
- [ ] 관리형 정책 `AmazonSSMManagedInstanceCore`(Session Manager 접속용)
- [ ] `secretsmanager:GetSecretValue`: 시크릿 2개 ARN만
- [ ] `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogStreams`: 아래 로그 그룹만
- [ ] 로그 그룹 생성·삭제, 보관 기간 변경 권한은 주지 않음

## 5. CloudWatch 로그 그룹(콘솔에서 직접 생성)
보관 기간은 여기서만 정한다. 에이전트 설정에 보관 기간을 넣으면 보관 정책 변경 권한이 필요해져서 넣지 않았다.

| 그룹 | 보관 |
|---|---|
| `/returnedholiday/admin-audit` | 365일 |
| `/returnedholiday/security` | 90일 |
| `/returnedholiday/nginx` | 90일 |
| `/returnedholiday/app` | 30일 |

## 6. EC2(Amazon Linux 2023)
- [ ] 인스턴스: t3.micro, 루트 디스크 20GB(gp3), 4단계 IAM 역할 연결, 퍼블릭 IP 사용, 키 페어 **없음**
- [ ] 고급 세부 정보 → 크레딧 사양 **Standard**(Unlimited면 CPU 과사용 시 추가 요금)
- [ ] 콘솔 → 연결 → Session Manager로 접속되는지 확인(안 되면 IAM 역할의 SSM 정책, 인스턴스 재시작)

```bash
# 메모리 1GB → 스왑 2GB (의존성 설치·프론트 빌드 대비)
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
sudo dnf install -y python3.12 python3.12-devel gcc pkgconf mariadb105-devel nginx git amazon-cloudwatch-agent nodejs22
sudo useradd --system --no-create-home --shell /sbin/nologin returnedholiday
sudo mkdir -p /srv/returnedholiday/{app,front,nginx} /var/log/returnedholiday /etc/nginx/returnedholiday /var/www/certbot
sudo chown returnedholiday:returnedholiday /var/log/returnedholiday && sudo chmod 750 /var/log/returnedholiday
sudo usermod -aG returnedholiday cwagent   # 앱 로그 읽기
sudo usermod -aG nginx cwagent             # nginx 로그 읽기
```
- [ ] `nodejs22`가 dnf에 없으면 nodejs.org의 22 LTS 리눅스 바이너리 설치. `node --version`으로 22.x 확인
- [ ] 코드 받기: 비공개 레포 → **읽기 전용 Deploy key**(이 레포만, 쓰기 X). 개인 토큰을 서버에 두지 않음
  ```bash
  sudo ssh-keygen -t ed25519 -N "" -f /root/.ssh/holiday_deploy -C holiday-staging
  sudo cat /root/.ssh/holiday_deploy.pub   # GitHub 레포 Settings → Deploy keys에 등록, "Allow write access" 끔
  sudo GIT_SSH_COMMAND="ssh -i /root/.ssh/holiday_deploy" git clone -b dev git@github.com:Returned-Holiday/Holiday.git /srv/returnedholiday/app
  ```
  소유자 root, 서비스 계정은 읽기만
- [ ] 백엔드: `python3.12 -m venv /srv/returnedholiday/venv` → `pip install --require-hashes -r Back/requirements/base.txt -r Back/requirements/prod.txt`
- [ ] 프론트(서버에서 빌드, Session Manager는 파일 업로드가 번거로움): `cd Front && npm ci && npm run build` → `Front/dist`를 `/srv/returnedholiday/front/dist`로 복사, `.map` 파일 없음 확인
- [ ] `infra/nginx/_error.html` → `/srv/returnedholiday/nginx/_error.html`

## 7. nginx·TLS
- [ ] `infra/nginx/returnedholiday.conf` → `/etc/nginx/conf.d/`, `proxy-params.conf` → `/etc/nginx/returnedholiday/`, `<도메인>` 치환
- [ ] `/etc/nginx/returnedholiday/admin-allow.geo`: 팀원 IP만 한 줄씩 `203.0.113.10 1;` 형식(레포 X)
- [ ] 인증서 발급 전에는 443 server 블록을 잠시 빼고 80만 띄움 → `certbot certonly --webroot -w /var/www/certbot -d <도메인>` → 443 블록 복구
- [ ] `sudo nginx -t` 통과 후 `sudo systemctl enable --now nginx`
- [ ] 허용 IP 밖에서 `curl -si https://<도메인>/api/admin/incidents/` → 본문이 `_error.html`이 아닌 JSON(`return 404 '본문'`이 `error_page`에 가로채이지 않는지), `Content-Type: application/json`
- [ ] 인증서 자동 갱신 타이머 확인

## 8. 마이그레이션·앱 시작
```bash
cd /srv/returnedholiday/app/Back
# 마이그레이션 시크릿으로만 실행
sudo -u returnedholiday env DJANGO_SETTINGS_MODULE=config.settings.prod AWS_REGION=<리전> AWS_SECRET_ID=<마이그레이션 시크릿> \
  /srv/returnedholiday/venv/bin/python manage.py migrate
sudo -u returnedholiday env DJANGO_SETTINGS_MODULE=config.settings.prod AWS_REGION=<리전> AWS_SECRET_ID=<앱 시크릿> \
  /srv/returnedholiday/venv/bin/python manage.py check --deploy
```
- [ ] `infra/systemd/*` → `/etc/systemd/system/`, `<리전>`·시크릿 이름 치환
- [ ] `sudo systemctl daemon-reload && sudo systemctl enable --now returnedholiday returnedholiday-clearsessions.timer`
- [ ] `infra/cloudwatch/agent.json` 적용 후 에이전트 시작

## 9. 확인
- [ ] `curl -I http://<도메인>` → 301, `https://`로
- [ ] 응답 헤더: HSTS·CSP·nosniff·X-Frame-Options 각 1개, `Server: nginx`(버전 X)
- [ ] `GET /api/auth/csrf/` → 204, `GET /api/auth/me/` → 401 + `Cache-Control: no-store`
- [ ] 병렬 요청으로 nginx 제한 확인(순서대로 보내면 TLS 연결 시간 때문에 안 걸릴 수 있음): `seq 60 | xargs -P 30 -I{} curl -s -o /dev/null -w "%{http_code}\n" https://<도메인>/api/incidents/ | sort | uniq -c` → 200과 429가 같이 보이면 정상. 429 본문은 `{"code":"RATE_LIMITED",...}` JSON(nginx 기본 화면 X), nginx에서 막혔는지는 접근 로그로 확인
- [ ] 앱(DRF) 제한을 시험할 때는 nginx가 먼저 막지 않게 1초 간격으로 보냄(QA1 AU 항목)
- [ ] 404 세 가지 본문이 바이트 단위로 같음: 허용 IP 밖 `GET /api/admin/incidents/`(nginx), 없는 경로 `GET /api/nothing/`(Django), 허용 IP 안 비관리자의 `GET /api/admin/incidents/`(DRF). `curl -s ... | sha256sum`으로 비교, `Allow` 헤더 없음
- [ ] 외부에서 8000 포트 접속 불가, RDS 퍼블릭 접속 불가
- [ ] `/var/log/returnedholiday/*.log`와 CloudWatch 그룹에 로그 들어옴, 이메일이 마스킹됨, nginx 접근 로그에 쿼리스트링 없음
- [ ] `/.env`, `/.git/config` → 404

## 10. 관리자 계정
서버에서만 만든다(화면·API 없음). 앱 시크릿으로 실행한다.
```bash
cd /srv/returnedholiday/app/Back
RUN="sudo -u returnedholiday env DJANGO_SETTINGS_MODULE=config.settings.prod AWS_REGION=<리전> AWS_SECRET_ID=<앱 시크릿> /srv/returnedholiday/venv/bin/python manage.py"
$RUN create_admin --email <관리자 이메일> --nickname <닉네임>   # 비밀번호는 프롬프트로만 입력
$RUN register_otp --email <관리자 이메일>                        # otpauth:// 를 인증 앱에 등록
$RUN deactivate_admin --email <관리자 이메일>                    # 퇴출 시: 비활성화·OTP 기기 삭제·세션 종료
```
- [ ] `register_otp` 출력(비밀값 포함)은 인증 앱 등록 직후 화면 버퍼에서 지움(`clear` 또는 `printf '\033c'`). `history -c`는 입력 명령만 지워서 출력은 남음. tmux·screen 로그를 켜 두었으면 그 로그 파일도 확인
- [ ] 비밀번호 90일이 지난 관리자는 OTP 전에 비밀번호부터 변경해야 함(`/api/auth/otp/`는 만료 허용 경로 아님)
- [ ] 관리자 로그인 → `/manage/otp`에서 6자리 입력 → 관리자 화면 진입 확인
