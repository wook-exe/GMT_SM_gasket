# Gasket QC Web (React)

가스켓 불량 검사 시스템의 웹 프론트엔드. 이미지 업로드 → PASS/FAIL 판정 → 메모 기록 → 이력 관리.

- **스택**: Vite 5 · React 18 · TypeScript · Tailwind CSS v3 · React Router v6
- **데이터 저장**: 브라우저 localStorage (서버 DB 없음)
- **추론 백엔드**: Colab FastAPI + ngrok 터널 (선택). 없으면 mock 추론으로 자동 fallback.

---

## 1. 빠른 시작

```bash
cd c:/claw/gasket-web
npm install
npm run dev          # http://localhost:5173
```

이 상태에서 바로 사용 가능. 추론은 파일 해시 기반 **mock**으로 동작 (같은 파일은 항상 같은 결과).

## 2. 실제 모델과 연결

Colab에서 PatchCore 추론 서버를 띄워 ngrok URL을 받은 뒤 환경변수에 입력한다.

### 2-1. Colab 측 (Cell 7 실행)

```python
# Cell 7가 자동으로 출력해주는 URL:
# 🌐 Public URL: https://abcd1234.ngrok-free.app
```

> [ngrok 토큰](https://dashboard.ngrok.com/get-started/your-authtoken) 필수 (무료 발급).
> Cell 7 상단 `NGROK_AUTH_TOKEN=""`에 본인 토큰 입력.

### 2-2. 웹 측

```bash
# .env 파일 생성
echo "VITE_API_URL=https://abcd1234.ngrok-free.app" > .env

# dev 서버 재시작 (Vite는 env를 시작시에만 읽음)
npm run dev
```

검사 페이지 결과 카드에 **✓ 실제 모델 추론**으로 표시되면 정상.

## 3. 기능

| 페이지 | 경로 | 기능 |
|---|---|---|
| 홈 | `/` | 시스템 소개 + 사용법 |
| 로그인 | `/login` | 사용자명만 입력하는 간이 로그인 |
| 검사 | `/inspect` | 이미지 업로드(드래그&드롭) → PASS/FAIL 판정 |
| 이력 | `/history` | 전체 검사 기록 + PASS/FAIL/검색 필터 |
| 상세 | `/history/:id` | 단일 검사 + 메모 작성/수정/삭제 |
| 마이 | `/mypage` | 통계 카드 + 최근 7일 막대그래프 + 최근 불량 5건 |

### 판정 로직

```
mask_max ≥ 46.45  →  FAIL
mask_max  < 46.45  →  PASS
```

threshold 46.45는 Colab 학습 결과에서 F1을 최대화한 값(F1=0.822).

### 보안/저장

- 사용자 인증은 클라이언트 측 가짜 로그인 — 사용자명만 localStorage에 저장
- 검사 이력도 localStorage(`gasket-history`)에 사용자별로 저장, 최대 500건
- 이미지는 320px 썸네일로 리사이즈해서 저장 (용량 절감)
- 서버 측 영구 저장이 필요하면 별도 백엔드 + DB 연동 필요

## 4. 빌드 / 배포

```bash
npm run build           # dist/ 생성
npm run preview         # 빌드 결과 로컬 확인
npm run typecheck       # TS 타입 체크만
```

`dist/`를 Vercel·Netlify·Cloudflare Pages·GitHub Pages 등 정적 호스팅에 업로드.

> **배포 환경의 `VITE_API_URL`** 은 빌드 시점에 정해지므로, 호스팅 플랫폼의 환경변수에 설정 후 빌드해야 함.

## 5. 파일 구성

```
gasket-web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json · tsconfig.app.json · tsconfig.node.json
├── tailwind.config.js · postcss.config.js
├── .env.example
└── src/
    ├── main.tsx · App.tsx · index.css · vite-env.d.ts
    ├── lib/
    │   ├── types.ts           # InspectionResult, User, Verdict
    │   ├── auth.ts            # localStorage 기반 fake 로그인
    │   ├── history.ts         # 검사 이력 CRUD
    │   └── inference.ts       # API 호출 + mock fallback + 썸네일
    ├── components/
    │   ├── Layout.tsx         # 네비게이션 + Outlet
    │   ├── ImageDropzone.tsx  # 드래그&드롭 업로드
    │   ├── VerdictBadge.tsx   # PASS/FAIL 뱃지
    │   └── HistoryRow.tsx     # 이력 목록 한 줄
    └── pages/
        ├── Home.tsx
        ├── Login.tsx
        ├── Inspect.tsx
        ├── History.tsx
        ├── Detail.tsx
        └── MyPage.tsx
```

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| 검사 결과가 항상 같은 PASS/FAIL | mock 모드 — 파일 해시 기반 결정론. 다른 이미지로 테스트하거나 실제 모델 연결 |
| `⚠ mock 추론` 표시되는데 백엔드는 켰음 | `VITE_API_URL` 미설정 또는 dev 서버 재시작 안 함. `npm run dev` 재실행 |
| ngrok URL 호출 시 CORS 에러 | Cell 7의 `CORSMiddleware`가 `allow_origins=["*"]`로 설정돼 있는지 확인 |
| ngrok URL에서 403 | ngrok 무료 플랜의 브라우저 경고 페이지. `ngrok-skip-browser-warning: true` 헤더가 자동 추가됨 (실제로는 fetch 요청이라 문제 없음) |
| localStorage 가득 참 | 이력이 500건 초과 시 오래된 것부터 자동 삭제. 수동 정리는 DevTools → Application → Local Storage |
| 로그아웃해도 이력이 남음 | 정상 — 같은 사용자명으로 다시 로그인하면 복구. 영구 삭제는 DevTools에서 `gasket-history` 키 삭제 |
