# Gasket QC Web (React)

가스켓 불량 검사 시스템의 웹 프론트엔드. 이미지 업로드 → PASS/FAIL 판정 → 이력 관리 → 통계 대시보드.

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

로그인 화면에서 데모 계정으로 진입한다.

```
아이디: admin
비밀번호: admin1234
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

검사 결과 카드에 **✓ 모델 추론**으로 표시되면 정상. 호출은 `POST {VITE_API_URL}/infer`
(FormData `image`)로 나가며, 응답의 `mask_max` / `threshold` / `heatmap_base64`를 사용한다.

## 3. 기능

| 페이지 | 경로 | 기능 |
|---|---|---|
| 대시보드 | `/` | 오늘 통계 카드 + 시간대별 추이 차트 + 최근 검사 + 이력 미리보기 + 누적 통계 |
| 현장 검사 | `/live` | 다중 이미지 큐 기반 실시간 검사 시뮬레이션 (관제 화면 UI) |
| 단건 검사 | `/inspect` | 이미지 1장 드래그&드롭 → PASS/FAIL 판정 + 양품 기준 비교 |
| 검사 이력 | `/history` | 전체 기록 + 양품/불량 필터 + 제품명 검색 |
| 상세 | `/history/:id` | 단일 검사 상세 + 메모 작성/저장/삭제 |
| 검사 현황 | `/mypage` | 오늘/누적 통계 + 불량 유형별 집계 + 최근 기록 |
| 로그인 | `/login` | 아이디/비밀번호 로그인 |

> 로그인 외 모든 페이지는 인증이 필요하다. 세션이 없으면 `/login`으로 리다이렉트된다.

### 판정 로직

```
mask_max ≥ 46.45  →  FAIL
mask_max  < 46.45  →  PASS
```

threshold 46.45는 Colab 학습 결과에서 F1을 최대화한 값(F1=0.822).
현장 검사 페이지에서는 슬라이더로 임계값을 즉석 조정할 수 있다.

### 보안 / 인증

- 클라이언트 측 데모 인증 — 계정 목록이 `src/lib/auth.ts`에 하드코딩돼 있다 (`admin` / `admin1234`).
- 로그인 성공 시 세션을 localStorage(`gasket-session`)에 저장하며 **유효기간 12시간**.
- 실제 운영 시 `auth.ts`의 `DEMO_ACCOUNTS`를 인증 서버 API 호출로 교체해야 한다 (코드 내 TODO 참고).

### localStorage 키

| 키 | 용도 |
|---|---|
| `gasket-session` | 로그인 세션 (12시간 TTL) |
| `gasket-history` | 검사 이력 — 최신순, 최대 800건 (초과 시 오래된 것부터 삭제) |
| `gasket-reference` | 양품 기준 이미지 (data URL, 페이지 간 공유) |
| `gasket-cycle-counter` | 현장 검사 페이지의 누적 사이클 카운터 |
| `gasket-demo-seeded` | 시연용 데이터 시딩 여부 플래그 |

- 이미지는 320px(현장 검사는 480px) 썸네일로 리사이즈해서 저장 (용량 절감).
- 서버 측 영구 저장이 필요하면 별도 백엔드 + DB 연동 필요.

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
    │   ├── types.ts        # Verdict, InspectionResult, Session, DEFECT_TYPES, PRODUCTS
    │   ├── auth.ts         # 로그인 / 세션 (localStorage, 12h TTL)
    │   ├── history.ts      # 검사 이력 CRUD (최대 800건)
    │   ├── inference.ts    # API 호출 + mock fallback + 썸네일 생성
    │   ├── reference.ts    # 양품 기준 이미지 저장/조회
    │   ├── stats.ts        # 일별 / 누적 / 시간대별 / 불량유형 집계
    │   ├── mockData.ts     # 시연용 검사 데이터 생성기
    │   └── useCountUp.ts   # 숫자 카운트업 애니메이션 훅
    ├── components/
    │   ├── Layout.tsx           # 네비게이션 + Outlet
    │   ├── ImageDropzone.tsx    # 드래그&드롭 업로드
    │   ├── VerdictBadge.tsx     # PASS/FAIL 뱃지
    │   ├── StatCard.tsx         # 통계 카드 (카운트업 애니메이션)
    │   ├── TrendChart.tsx       # 시간대별 추이 막대그래프
    │   ├── RecentVerdict.tsx    # 최근 검사 목록
    │   └── InspectionTable.tsx  # 검사 이력 테이블
    └── pages/
        ├── Dashboard.tsx   # /
        ├── Live.tsx        # /live
        ├── Inspect.tsx     # /inspect
        ├── History.tsx     # /history
        ├── Detail.tsx      # /history/:id
        ├── MyPage.tsx      # /mypage
        └── Login.tsx       # /login
```

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| 로그인이 안 됨 | 데모 계정은 `admin` / `admin1234`. 계정 목록은 `src/lib/auth.ts` |
| 로그인했는데 다시 로그인 화면 | 세션 12시간 만료. 다시 로그인하면 됨 |
| 검사 결과가 항상 같은 PASS/FAIL | mock 모드 — 파일 해시 기반 결정론. 다른 이미지로 테스트하거나 실제 모델 연결 |
| `⚠ mock 추론` 표시되는데 백엔드는 켰음 | `VITE_API_URL` 미설정 또는 dev 서버 재시작 안 함. `npm run dev` 재실행 |
| ngrok URL 호출 시 CORS 에러 | Cell 7의 `CORSMiddleware`가 `allow_origins=["*"]`로 설정돼 있는지 확인 |
| 양품 기준 이미지 저장 실패 | localStorage 용량 초과. 더 작은 이미지로 시도 |
| localStorage 가득 참 | 이력이 800건 초과 시 오래된 것부터 자동 삭제. 수동 정리는 DevTools → Application → Local Storage |
| 로그아웃해도 이력이 남음 | 정상 — 이력은 사용자와 무관하게 보존됨. 영구 삭제는 DevTools에서 `gasket-history` 키 삭제 |
