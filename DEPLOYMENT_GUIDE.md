# Vercel 배포 가이드 (완전 무료)

## TL;DR

- 호스팅: **Vercel Hobby** (무료, 결제수단 불필요)
- 추론: **Google Gemini Vision** 무료 티어 (분당 15회 / 일 1,500회, 결제수단 불필요)
- 합계 비용: **0원**

## 사전 준비

1. **Vercel 계정** (vercel.com) — GitHub 로그인으로 무료 가입
2. **Google AI Studio API 키** — https://aistudio.google.com/app/apikey
   - "Create API key" → 새 프로젝트 선택 → 키 복사 (`AIza...`로 시작)
   - 결제수단 등록 **불필요**, 즉시 무료 발급
3. **GitHub `main` 브랜치에 코드 push** 완료된 상태

## 추론 분기 우선순위

`src/lib/inference.ts`는 환경변수 유무에 따라 아래 순서로 분기합니다.

| 순위 | 환경변수 | 설명 |
|---|---|---|
| 1 | `VITE_API_URL` | Colab FastAPI (실제 PatchCore 모델) |
| 2 | `VITE_GEMINI_API_KEY` | Gemini Vision **(무료 권장)** |
| 3 | `VITE_ANTHROPIC_API_KEY` | Claude Vision (유료, 신규가입 $5 크레딧) |
| 4 | — | mock fallback (결정론적 점수) |

설정된 가장 높은 우선순위가 사용됩니다. 무료 배포 시에는 `VITE_GEMINI_API_KEY` 하나만 등록하면 됩니다.

## 무료 배포 절차 (GitHub 연동, 권장)

1. https://vercel.com 로그인 → **Add New Project**
2. GitHub 저장소 `wook-exe/GMT_SM_gasket` 선택 → Import
3. Framework Preset: **Vite** (자동 감지)
4. Build Command: `npm run build` / Output Directory: `dist` (기본값)
5. **Environment Variables** 입력:

   | Name | Value | Environments |
   |---|---|---|
   | `VITE_GEMINI_API_KEY` | `AIza...` (위에서 발급한 키) | Production, Preview |

6. **Deploy** 클릭 → 30초~1분 후 `https://<프로젝트>.vercel.app` 발급

이후 `main`에 push할 때마다 자동 재배포됩니다.

## CLI 배포

```bash
npm install -g vercel       # 최초 1회
vercel login
vercel link                 # 저장소 연결

vercel env add VITE_GEMINI_API_KEY production
vercel env add VITE_GEMINI_API_KEY preview

# 사전 점검
npm run deploy:check        # typecheck + build
# 배포
npm run deploy:prod         # = vercel --prod
```

## 로컬 개발 테스트

```powershell
# c:\AIOSS\GMT_SM_gasket\.env 파일 생성
VITE_GEMINI_API_KEY=AIza_여기에_키_입력
```

```powershell
npm run dev
# /inspect → OPEN/CLOSE 선택 → 이미지 업로드 → "✓ AI 비전 추론 (Gemini)" 라벨 확인
```

## 배포 후 확인

- [ ] `/login` 로그인 (admin / admin1234)
- [ ] `/inspect` 이미지 업로드 → Gemini 판정 동작, 소스 라벨 `✓ AI 비전 추론 (Gemini)` 표시
- [ ] OPEN / CLOSE 토글 두 가지 모두 동작
- [ ] FAIL 결과의 경우 `defects` / `locations` / `summary` 표시
- [ ] `/history` 이력 저장 확인
- [ ] 새로고침 시 404 없음 확인 (vercel.json rewrites 정상)

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| `mock 추론`으로 표시됨 | Vercel 환경변수에 `VITE_GEMINI_API_KEY`가 등록됐는지 확인. 등록 후 **재배포 필요** |
| `Gemini API 오류 (HTTP 400)` | 이미지 크기 과대 또는 API 키 무효. Studio에서 키 재발급 |
| `HTTP 429` | 무료 한도 초과 (분당 15회 / 일 1,500회). 잠시 후 재시도 |
| CORS 오류 | Gemini는 브라우저 직접 호출 허용. 다른 원인일 가능성 — 콘솔 로그 확인 |
| 새로고침 시 404 | `vercel.json` 파일이 저장소에 포함됐는지 확인 |
| 빌드 실패 | Vercel 대시보드 → Deployments → 로그 확인 |

## 무료 한도 (2026-05 기준)

`gemini-2.0-flash` 무료 티어:
- 분당 15회 (RPM)
- 일 1,500회 (RPD)
- 토큰 1,000,000/분

사내 시연 / 학생 프로젝트 / 발표 데모용으로는 충분합니다. 한도 초과 시 자동으로 mock fallback으로 떨어집니다.

## 보안 주의

브라우저에서 Gemini API를 직접 호출하므로 `VITE_GEMINI_API_KEY`는 빌드 결과물에 그대로 포함됩니다. 즉 배포된 사이트의 JS 번들에서 키를 추출할 수 있습니다.

→ Google AI Studio에서 키를 **HTTP referrer로 제한**하는 것을 권장합니다 (해당 Vercel 도메인만 허용). 외부 서비스로 운영할 경우 서버사이드 프록시 (예: Vercel Functions로 `/api/inspect` 추가)를 따로 구성하세요.
