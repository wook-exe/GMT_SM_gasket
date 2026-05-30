# Gasket QC Web (React)

가스켓 불량 검사 시스템의 웹 프론트엔드. 이미지 업로드 → PASS/FAIL 판정 → 이력 관리 → 통계 대시보드 → AI 챗봇 질의.

- **스택**: Vite 5 · React 18 · TypeScript · Tailwind CSS v3 · React Router v6
- **데이터 저장**: 브라우저 localStorage 기본. **Firebase Firestore** 키를 설정하면 클라우드 미러 동기화 (기기 간 이력 공유, §3 참고)
- **추론 백엔드 (우선순위)**:
  1. Colab FastAPI (실제 PatchCore 모델)
  2. **Gemini Vision API** (무료 티어, 권장)
  3. 결정론적 mock fallback

환경변수에 키 또는 URL 이 있는 가장 높은 우선순위를 자동으로 사용한다.

---

## 1. 빠른 시작

```bash
cd c:\AIOSS\GMT_SM_gasket
npm install
npm run dev          # http://localhost:5173
```

로그인 화면에서 데모 계정으로 진입한다.

```
아이디: admin
비밀번호: admin1234
```

환경변수 설정 없이도 바로 동작 — 추론은 파일 해시 기반 **mock**으로 진행된다 (같은 파일 → 항상 같은 결과). 챗봇/Vision 분석을 쓰려면 아래 §2 참고.

## 2. 추론 백엔드 연결

두 가지 옵션 중 하나를 골라 `.env` 에 키를 넣으면 우선순위가 높은 것이 자동 선택된다. `.env.example` 참고.

### 2-1. Gemini Vision (무료, 권장)

Google AI Studio 에서 키를 발급받고 환경변수에 넣는다.

1. https://aistudio.google.com/app/apikey → **Create API key** (Google 계정 로그인)
2. `AIza...` 키 복사
3. `.env` 에 등록:

```
VITE_GEMINI_API_KEY=AIza_여기에_키
```

4. `npm run dev` 재시작

`/inspect` 결과 카드에 **✓ AI 비전 추론 (Gemini)** 으로 표시되면 정상.

- 분당 15회 / 일 1,500회 무료, 결제수단 등록 불필요
- OPEN / CLOSE 별 프롬프트가 자동 적용됨 (`src/lib/inference.ts`)
- 챗봇도 같은 키로 동작

### 2-2. Colab FastAPI (실제 PatchCore 모델)

Colab 에서 PatchCore 추론 서버를 띄워 ngrok URL을 받은 뒤 환경변수에 입력한다.

```python
# Colab Cell 7 출력:
# 🌐 Public URL: https://abcd1234.ngrok-free.app
```

> [ngrok 토큰](https://dashboard.ngrok.com/get-started/your-authtoken) 필수 (무료 발급).
> Cell 7 상단 `NGROK_AUTH_TOKEN=""` 에 본인 토큰 입력.

```
VITE_API_URL=https://abcd1234.ngrok-free.app
```

호출은 `POST {VITE_API_URL}/infer` (FormData `image`) 로 나가며, 응답의 `mask_max` / `threshold` / `heatmap_base64` 를 사용한다. 결과 카드에 **✓ 모델 추론** 으로 표시.

## 3. 기능

| 페이지 | 경로 | 기능 |
|---|---|---|
| 대시보드 | `/` | 오늘 통계 카드 + 시간대별 검사 추이 + 최근 검사 + 이력 미리보기 + 누적 통계 |
| 현장 검사 | `/live` | 다중 이미지 큐 기반 실시간 검사 시뮬레이션 (관제 화면 UI) |
| 단건 검사 | `/inspect` | OPEN/CLOSE 선택 → 이미지 1장 업로드 → PASS/FAIL 판정 → 그 자리에서 메모/판정 편집 → 자동 다음 검사 전환 |
| 검사 이력 | `/history` | 전체 기록 + 양품/불량 필터 + 제품명 검색 |
| 상세 | `/history/:id` | 단일 검사 상세 + 판정 수정 + 불량 유형 체크 + 메모 |
| 검사 현황 | `/mypage` | 오늘/누적 통계 + 불량 유형별 집계 + 최근 기록 |
| 로그인 | `/login` | 아이디/비밀번호 로그인 |

> 로그인 외 모든 페이지는 인증이 필요하다. 세션이 없으면 `/login` 으로 리다이렉트.

### 챗봇 (전 페이지 공통)

우하단 💬 플로팅 버튼. 클릭하면 채팅 패널이 열린다.

- **텍스트 / 음성 입력** 둘 다 지원 (Web Speech API, 한국어, Chrome·Edge 권장)
- **음성 답변** 토글 (🔇 / 🔊) — 답변을 TTS 로 읽어줌
- **빠른 질문 칩** 8종이 입력창 위에 항상 표시 (대화 시작 후에도 유지)
- 답변은 **Gemini 2.0 Flash** 가 검사 이력 통계를 컨텍스트로 받아 생성
- API 키 없을 때는 키워드 매칭 fallback 동작

대답 가능한 질문 예시:

```
오늘 검사 몇 개야?
오늘 불량 유형별 알려줘
들뜸 불량 몇 건?     ← 8종 불량 유형 개별 질의
파손은 몇 건이야?
최근 7일 검사 추이
OPEN 가스켓 불량률은?
최근 불량 5건 보여줘
AI랑 다르게 판정한 건? ← 사용자 수정 통계
```

이전 대화 흐름도 반영 — "어제는?" 처럼 짧게 물으면 직전 주제(불량률 등)로 어제 데이터를 답한다.

### 판정 / 불량 / 메모 편집

`/inspect` 검사 직후 + `/history/:id` 상세 화면 양쪽에 동일한 `InspectionEditor` 가 붙어 있다.

- **판정 수정**: PASS ↔ FAIL 라디오. AI 자동 판정은 별도로 보존되며 ("사용자 수정" 배지 표시)
- **불량 유형 체크**: 8종 표준 (미조립·들뜸·변형·절단·누수·오염·파손·휨) + **기타** 직접 입력 (쉼표로 여러 개)
- **메모**: textarea 자유 입력

저장하면 모든 변경이 한 번에 localStorage 에 반영된다. 단건 검사에서는 저장 후 자동으로 다음 검사 화면으로 전환되며 상단에 초록색 토스트가 표시된다.

### 판정 로직

```
mask_max ≥ 46.45  →  FAIL  (PatchCore)
mask_max  < 46.45  →  PASS
```

threshold 46.45 는 Colab 학습 결과에서 F1 을 최대화한 값 (F1=0.822). 현장 검사 페이지에서는 슬라이더로 임계값을 즉석 조정 가능. Gemini Vision 분기에서는 모델이 반환한 `score` (0~1) 를 100배 스케일로 변환해서 mask_max 와 호환된다.

### 보안 / 인증

- 클라이언트 측 데모 인증 — 계정 목록이 `src/lib/auth.ts` 에 하드코딩 (`admin` / `admin1234`)
- 로그인 성공 시 세션을 localStorage(`gasket-session`) 에 저장, **유효기간 12시간**
- 실제 운영 시 `DEMO_ACCOUNTS` 를 인증 서버 API 호출로 교체 (코드 내 TODO 참고)
- **Vision API 키**: 브라우저에서 직접 호출하므로 빌드 결과물에 키가 포함된다. PoC/시연용으로만 사용하고, 외부 공개 시에는 서버사이드 프록시를 추가할 것 ([DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 보안 주의 참고)

### localStorage 키

| 키 | 용도 |
|---|---|
| `gasket-session` | 로그인 세션 (12h TTL) |
| `gasket-history` | 검사 이력 — 최신순, 최대 800건 (초과 시 오래된 것부터 자동 삭제) |
| `gasket-reference` | 양품 기준 이미지 (data URL, 페이지 간 공유) |
| `gasket-cycle-counter` | 현장 검사 페이지의 누적 사이클 카운터 |
| `gasket-demo-seeded` | 시연용 데이터 시딩 여부 플래그 |

이미지는 320px (현장 검사 480px) 썸네일로 리사이즈해서 저장 (용량 절감). 기기 간 공유나 영구 보관이 필요하면 아래 §3 **Firestore 클라우드 동기화** 를 설정한다.

### Firestore 컬렉션

| 컬렉션 | 문서 ID | 내용 |
|---|---|---|
| `inspections` | `InspectionResult.id` | `imageDataUrl` / `heatmapDataUrl` 을 제외한 모든 필드 + `_syncedAt` (서버 타임스탬프) |

### InspectionResult 주요 필드

| 필드 | 설명 |
|---|---|
| `verdict` | 현재 판정 (PASS/FAIL). 사용자가 수정 가능 |
| `originalVerdict` | AI 가 처음 내린 판정 (사용자 수정 후에도 보존) |
| `verdictManual` | 사용자가 수동 수정했는지 플래그 |
| `gasketType` | OPEN / CLOSE (단건 검사에서 사용자가 선택) |
| `source` | `api` / `gemini` / `mock` |
| `defects` | 체크된 불량 유형 + 기타 입력 (string[]) |
| `defectType` | 첫 번째 불량 유형 (호환성 유지용 단일 값) |
| `summary` | Vision 모델이 반환한 한국어 판정 요약 |
| `confidence` | Vision 모델 신뢰도 (0~100) |
| `locations` | 불량 위치 설명 배열 |
| `maskMax` / `threshold` | PatchCore 점수 / 임계값 (또는 Vision score 의 100배 스케일) |

### Firestore 클라우드 동기화 (선택)

검사 이력을 **Firebase Firestore** 에 자동 미러링해서 기기/브라우저 간에 공유하고 영구 보관할 수 있다. 환경변수 6개가 모두 설정되어 있으면 활성화되고, 미설정 시 기존처럼 localStorage 만 사용한다 (동작 차이 없음).

**필요한 환경변수** (모두 `.env` 에):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**발급 절차** (약 5분):

1. https://console.firebase.google.com → **프로젝트 추가** → 분석 사용 안 함
2. 좌측 **빌드 → Firestore Database** → **데이터베이스 만들기** → 프로덕션 모드 → 위치 `asia-northeast3 (서울)`
3. 만들어진 후 상단 **규칙** 탭에서 다음으로 교체 후 게시 (PoC 한정, 외부 공개 시 강화 필요):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /inspections/{docId} {
         allow read, write: if true;
       }
     }
   }
   ```
4. ⚙️ **프로젝트 설정 → 일반 → 내 앱 → `</>`(웹)** → 닉네임 입력 → 등록
5. 표시되는 `firebaseConfig` 의 6개 값을 `.env` 에 옮긴 후 `npm run dev` 재시작

**동작 방식**:

- `saveInspection` / `updateRecord` / `updateMemo` / `deleteInspection` 호출 시 **localStorage + Firestore 양쪽에 동시 기록** (Firestore 호출은 fire-and-forget — UI 멈춤 없음)
- **로그인 시점**에 Firestore → localStorage 1회 병합 동기화 (같은 id 가 양쪽에 있으면 `timestamp` 큰 쪽 채택)
- `imageDataUrl` / `heatmapDataUrl` (base64 썸네일) 은 Firestore 에 저장하지 않음 — 문서 1MB 한도 보호, 썸네일은 로컬 캐시에만
- `ignoreUndefinedProperties: true` 옵션으로 InspectionResult 의 옵셔널 undefined 필드를 자동 제거
- Firebase 미설정 시 모든 미러 호출은 조용히 no-op

**보안 주의**:

- Firebase 클라이언트 API 키는 빌드 결과물에 포함되어 노출되는 게 정상 — 보호는 **Firestore 보안 규칙**으로 한다
- 위 데모 규칙(`if true`) 은 누구나 데이터 조작 가능. 외부 공개 시 반드시 강화 (예: Firebase Auth 도입 후 `allow read, write: if request.auth != null;`)
- 추가 보호: Google Cloud Console → 사용자 인증 정보 → 해당 API 키 → **HTTP referrer 제한** 으로 도메인 화이트리스트
- **`.env.example` 에는 절대 실제 키 값을 넣지 말 것** — 이 파일은 GitHub 에 push 됨. 실제 값은 `.env` (gitignore 됨) 에만

## 4. 빌드 / 배포

```bash
npm run typecheck       # TS 타입 체크
npm run build           # dist/ 생성 (tsc + vite build)
npm run preview         # 빌드 결과 로컬 확인
npm run deploy:check    # typecheck + build (배포 전 사전 점검)
npm run deploy:preview  # vercel
npm run deploy:prod     # vercel --prod
```

### Vercel 무료 배포 (권장)

1. https://vercel.com 로그인 → **Add New Project** → GitHub 저장소 import
2. Framework Preset: **Vite** (자동 감지)
3. Environment Variables 에 `VITE_GEMINI_API_KEY` 등록
4. **Deploy** → 30초~1분 후 배포 URL 발급

`main` 에 push 할 때마다 자동 재배포된다. SPA 라우팅 fallback 은 `vercel.json` 의 `rewrites` 가 처리.

자세한 절차·CLI 사용법·트러블슈팅은 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 참고.

> **배포 환경의 `VITE_*` 환경변수** 는 빌드 시점에 정해지므로, 호스팅 플랫폼 대시보드에 설정 후 빌드해야 함.

## 5. 파일 구성

```
gasket-web/
├── index.html
├── package.json
├── vite.config.ts            # vendor 청크 분할, sourcemap off
├── vercel.json               # SPA rewrites + assets 캐시 헤더
├── tsconfig*.json
├── tailwind.config.js · postcss.config.js
├── .env.example
├── DEPLOYMENT_GUIDE.md
└── src/
    ├── main.tsx · App.tsx · index.css · vite-env.d.ts
    ├── lib/
    │   ├── types.ts          # Verdict, GasketType, DEFECT_TYPES(8종), InspectionResult, Session
    │   ├── auth.ts           # 로그인 / 세션 (localStorage, 12h TTL) + Firestore 초기 동기화
    │   ├── history.ts        # 검사 이력 CRUD + updateRecord + syncFromFirestore (최대 800건)
    │   ├── inference.ts      # Colab / Gemini / mock 우선순위 분기
    │   ├── firebase.ts       # Firebase 앱 + Firestore lazy init (ignoreUndefinedProperties)
    │   ├── firestoreSync.ts  # mirrorInspection / mirrorDelete / pullAllInspections
    │   ├── reference.ts      # 양품 기준 이미지 저장/조회
    │   ├── stats.ts          # 일별 / 누적 / 시간대별 / 불량유형 집계
    │   ├── chatbot.ts        # Gemini chat + 통계 컨텍스트 빌더
    │   ├── speech.ts         # Web Speech API (STT + TTS) 래퍼
    │   ├── mockData.ts       # 시연용 검사 데이터 생성기
    │   └── useCountUp.ts     # 숫자 카운트업 애니메이션 훅
    ├── components/
    │   ├── Layout.tsx           # 네비게이션 + Outlet + Chatbot 마운트
    │   ├── Chatbot.tsx          # 플로팅 챗봇 패널 (텍스트 + 음성)
    │   ├── InspectionEditor.tsx # 판정 수정 + 불량 체크 + 메모 (Inspect/Detail 공용)
    │   ├── ImageDropzone.tsx    # 드래그&드롭 업로드
    │   ├── VerdictBadge.tsx     # PASS/FAIL 뱃지
    │   ├── StatCard.tsx         # 통계 카드 (카운트업)
    │   ├── TrendChart.tsx       # 시간대별 추이 막대그래프 (반응형 flex)
    │   ├── RecentVerdict.tsx    # 최근 검사 목록
    │   ├── HistoryRow.tsx       # 검사 이력 행
    │   └── InspectionTable.tsx  # 검사 이력 테이블
    └── pages/
        ├── Dashboard.tsx   # /
        ├── Live.tsx        # /live
        ├── Inspect.tsx     # /inspect (OPEN/CLOSE 토글 + 결과 + InspectionEditor)
        ├── History.tsx     # /history
        ├── Detail.tsx      # /history/:id (헤더 + InspectionEditor)
        ├── MyPage.tsx      # /mypage
        └── Login.tsx       # /login
```

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| 로그인이 안 됨 | 데모 계정은 `admin` / `admin1234`. 계정 목록은 `src/lib/auth.ts` |
| 로그인했는데 다시 로그인 화면 | 세션 12시간 만료. 다시 로그인하면 됨 |
| 검사 결과가 항상 같은 PASS/FAIL | mock 모드 — 파일 해시 기반 결정론. 다른 이미지로 테스트하거나 실제 모델/Vision 키 연결 |
| `⚠ mock 추론` 표시되는데 키는 넣었음 | `VITE_*` 환경변수는 dev 서버 시작 시점에 읽음. `npm run dev` 재실행. Vercel 환경변수는 등록 후 **재배포** 필요 |
| Gemini `HTTP 429` | 무료 한도 초과 (분당 15회 / 일 1,500회). 잠시 후 재시도 — 자동으로 mock fallback |
| 챗봇 음성 인식 안 됨 | Chrome/Edge 권장. Safari iOS 14.5+ 지원. Firefox 는 미지원. 마이크 권한 허용 필요 |
| 챗봇 답변이 단조로움 | `VITE_GEMINI_API_KEY` 미설정 시 키워드 매칭 fallback. 키 등록 후 dev 서버 재시작 |
| 현장 검사 큐가 "처리 중…" 에 멈춤 | 이전 버전 버그 — `useEffect` 자기재실행. 최신 코드는 `processingRef` 가드 사용 |
| ngrok URL 호출 시 CORS 에러 | Colab Cell 7 의 `CORSMiddleware` 가 `allow_origins=["*"]` 인지 확인 |
| 양품 기준 이미지 저장 실패 | localStorage 용량 초과. 더 작은 이미지로 시도 |
| localStorage 가득 참 | 이력 800건 초과 시 자동 삭제. 수동 정리는 DevTools → Application → Local Storage |
| 로그아웃해도 이력이 남음 | 정상 — 이력은 사용자와 무관하게 보존. 영구 삭제는 DevTools 에서 `gasket-history` 키 삭제 |
| 새로고침 시 404 (배포 환경) | `vercel.json` 의 SPA rewrites 누락. 파일이 저장소에 포함됐는지 확인 |
| 콘솔에 `[firebase] VITE_FIREBASE_* 환경변수 미설정` | Firebase 6개 키가 `.env` 또는 Vercel 환경변수에 다 들어갔는지 확인 후 dev 서버 재시작 / Vercel 재배포 |
| Firestore `Function setDoc() called with invalid data. Unsupported field value: undefined` | `firebase.ts` 의 `initializeFirestore({ ignoreUndefinedProperties: true })` 옵션 누락. 최신 코드 사용 |
| Firestore `Missing or insufficient permissions` | 보안 규칙이 `if false`(기본 production) 또는 잘못 설정됨. §3 Firestore 섹션의 데모 규칙으로 교체 |
| Firestore 에 문서가 안 생김 | 위 두 가지 + 보안 규칙 + Vercel 환경변수 등록 여부 확인. F12 콘솔의 빨간 에러 메시지가 핵심 단서 |
