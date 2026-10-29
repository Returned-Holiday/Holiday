# 반납한연휴 — 개인정보 유출 대응 헬프데스크

2026 SW 개발보안 경진대회 "소개딩" 2라운드(기술경연) 출품작.
개인정보 유출 사고가 났을 때 기업·정부기관의 공식 발표를 기준으로 유출 항목을 확인하고, 상황 설문과 통지문 인식(OCR)으로 맞춤 대응 체크리스트를 제공한다.

- 백엔드: Python 3.12 · Django 5.2 LTS · Django REST Framework · MySQL 8.4
- 프론트엔드: React 19 · TypeScript(strict) · Vite
- 운영: AWS EC2(nginx + Gunicorn) · RDS · Secrets Manager · CloudWatch Logs

## 문서
1. [보안 설계](docs/security.md) — 모든 기능의 기준이 되는 정책 값
2. 시큐어코딩 규칙: [백엔드](docs/rules/secure-python.md) / [프론트](docs/rules/secure-ts.md) / [협업](docs/rules/common.md)
3. 설계: [백엔드 구조](docs/backend.md) · [ERD](docs/erd.md) · [API](docs/api.md) · [API 공통 규칙](docs/rules/api-response.md) · [기능명세서](docs/features.md)
4. 보안 점검 결과: [QA 점검표](docs/project/qa-security.md)
5. 폴더별 안내: [Back](Back/README.md) · [Front](Front/README.md) · [infra](infra/README.md)

## 레포 구조
```
ReturnedHoliday/
├─ Back/                          Django 백엔드 (config, common, apps/accounts·incidents·guides·reports·mypage)
├─ Front/                         React + Vite 프론트엔드
├─ infra/                         nginx·systemd·CloudWatch 설정, 배포 순서(deploy.md)
├─ docs/
│  ├─ security.md                 보안 설계 원본
│  ├─ backend.md                  백엔드 분담·구조·앱 사이 규칙
│  ├─ erd.md · api.md · features.md
│  ├─ rules/                      common, secure-python, secure-ts, api-response
│  ├─ project/                    대회·일정·결정 기록, QA 점검표
│  └─ references/guides-summary.md 사전교육 참고 문서 3종 요약
├─ .github/workflows/             backend, frontend, semgrep CI
└─ .semgrep/rules.yml             금지 API 규칙
```

## 실행 방법
필요 버전: Python 3.12 이상, Node 22 이상, 로컬 MySQL 8.x

백엔드 (`Back/` 폴더)
```bash
python -m venv .venv                      # Windows: .venv\Scripts\activate / macOS·Linux: source .venv/bin/activate
pip install --require-hashes -r requirements/base.txt -r requirements/dev.txt
cp .env.example .env                      # 값을 채운다. .env는 커밋하지 않는다
python manage.py migrate
python manage.py runserver                # http://127.0.0.1:8000
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py test
```

프론트엔드 (`Front/` 폴더)
```bash
npm ci
npm run dev                               # http://localhost:5173 (/api는 127.0.0.1:8000으로 프록시)
npm run build                             # 운영 빌드(소스맵 없음)
```

운영 서버 구성과 배포는 [infra/deploy.md](infra/deploy.md).
