# koreamall24

2026-10-31 기준 운영서버 `/opt/koreamall24`에서 가져온 소스입니다. 운영 경로 변경과 서버의 미커밋 소스 수정도 포함합니다.

## 구성

- `client/`: React + TypeScript + Vite 프론트엔드
- `server/`: Node.js + Express + tRPC 백엔드
- `shared/`: 공통 타입과 코드
- `drizzle/`: MySQL 스키마와 마이그레이션
- `ecosystem.config.cjs`: 현재 서비스용 PM2 실행 설정 (`koreamall24`)

## 로컬 준비 및 빌드

Node.js 22와 `package.json`에 명시된 pnpm 10.4.1을 사용합니다.

```sh
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env
# .env에 개발용 DB 및 필요한 연동 설정을 입력합니다.
pnpm dev
```

```sh
pnpm build
pnpm start
```

환경변수 값은 포함하지 않습니다. `.env.example`은 키 이름과 로컬 기본값만 제공합니다. DB, 결제, 이메일, OAuth, 저장소 등은 별도 설정이 필요하며 `VITE_*` 변수는 브라우저 번들에 노출될 수 있습니다. Puppeteer 기능에는 별도 브라우저 설치가 필요할 수 있습니다.

## 운영 실행

배포 디렉터리는 `/opt/koreamall24`이며, 빌드 결과의 서버 진입점은 `dist/index.js`입니다.

```sh
pm2 start ecosystem.config.cjs --only koreamall24
pm2 save
```

위 명령은 최초 설정 예시입니다. 이미 실행 중인 서비스에는 검토된 배포 절차를 적용해야 합니다. 이 저장소에 올리는 작업만으로 운영서버가 배포되지는 않습니다.

## 이 소스 사본의 범위

- GitHub의 기존 `main` 이력을 유지하고 운영 소스를 새 커밋으로 추가합니다. 운영서버의 과거 Git 객체는 가져오지 않았습니다.
- `.env`, 환경 백업, 비밀키, 고객/주문 DB 덤프, 로그, 업로드 데이터, 의존성 및 빌드/백업 산출물은 제외합니다.
- 하드코딩된 비밀값이 있던 `ecosystem.config.cjs`는 비밀값 없는 설정으로 교체했고, 테스트 사용자 생성 스크립트는 `TEST_USER_PASSWORD`를 받도록 정리했습니다. 이는 GitHub 사본에만 적용한 변경입니다.
- `ecosystem.config.js`, `config/ecosystem.config.js`, `app/server.js` 등에는 이전 실행 설정/샘플이 남아 있습니다. 현재 서비스 실행에는 루트의 `ecosystem.config.cjs`를 사용합니다.
- 소스에 남아 있는 `cocokusuri.com` 이메일/URL 참조는 이번 가져오기에서 변경하지 않았습니다. 두 도메인의 완전한 연동 분리까지 확인했다는 의미는 아닙니다.
- 마이그레이션·시드·테스트 사용자 생성 스크립트는 DB를 변경할 수 있으므로 별도 개발 DB에서 검토 후 실행합니다.
