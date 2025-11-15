# 📁 프로젝트 구조 및 파일 설명

## 전체 파일 구조

```
pimlico-tutorial-1/
│
├── 📄 index.ts                          # Node.js 스크립트 (Private Key 방식)
├── 📄 package.json                      # 패키지 설정 (Next.js + Privy)
├── 📄 tsconfig.json                     # TypeScript 설정
├── 📄 next.config.js                    # Next.js 설정
├── 📄 tailwind.config.js                # Tailwind CSS 설정
├── 📄 postcss.config.js                 # PostCSS 설정
│
├── 📂 lib/
│   └── 📄 smartAccount.ts               # ⭐ 핵심 로직 (기존 index.ts 로직 함수화)
│
├── 📂 app/
│   ├── 📄 layout.tsx                    # Privy Provider 설정
│   ├── 📄 page.tsx                      # 메인 UI (소셜 로그인 + 구매)
│   └── 📄 globals.css                   # 전역 스타일
│
├── 📄 ENV_TEMPLATE.md                   # 환경변수 템플릿 및 가이드
├── 📄 README_SETUP.md                   # 설치 및 실행 가이드
└── 📄 PROJECT_STRUCTURE.md              # 이 파일
```

---

## 각 파일 상세 설명

### 🎯 핵심 파일

#### 1. `lib/smartAccount.ts` ⭐
**역할**: 기존 index.ts의 모든 로직을 함수로 변환

**주요 함수:**
```typescript
export async function submitMemeIntent(
  privateKeyOrWallet: Hex | any,  // Private Key 또는 Privy WalletClient
  options?: { ... }
)
```

**특징:**
- ✅ 기존 로직 100% 동일
- ✅ Private Key 방식과 Privy 방식 모두 지원
- ✅ 변경사항: Private Key 대신 WalletClient도 받을 수 있도록 확장

**사용 위치:**
- `index.ts` → Private Key로 호출
- `app/page.tsx` → Privy WalletClient로 호출

---

#### 2. `index.ts`
**역할**: Node.js 스크립트 (기존 방식 유지)

**사용 방법:**
```bash
npm run node
```

**특징:**
- Private Key 사용
- 터미널에서 직접 실행
- `lib/smartAccount.ts`의 함수 호출

---

#### 3. `app/page.tsx`
**역할**: 메인 UI 컴포넌트 (Privy 소셜 로그인)

**주요 기능:**
- 구글/이메일 소셜 로그인
- Privy Embedded Wallet 자동 생성
- 밈코인 구매 버튼 (기존 로직 실행)
- 트랜잭션 결과 표시

**사용 방법:**
```bash
npm run dev
# http://localhost:3000
```

---

### ⚙️ 설정 파일

#### 4. `app/layout.tsx`
**역할**: Privy Provider 설정

**제공 기능:**
- PrivyProvider: 소셜 로그인
- WagmiProvider: 지갑 연결
- QueryClientProvider: React Query

---

#### 5. `package.json`
**주요 패키지:**
- `next`: Next.js 프레임워크
- `@privy-io/react-auth`: 소셜 로그인
- `@privy-io/wagmi`: Wagmi 통합
- `permissionless`: Account Abstraction
- `viem`: 블록체인 상호작용
- `wagmi`: React Hooks

**스크립트:**
```json
{
  "dev": "next dev",        // UI 실행
  "node": "tsx index.ts"    // 스크립트 실행
}
```

---

#### 6. `next.config.js`
**역할**: Next.js 설정

**주요 설정:**
- Webpack fallback (fs, net, tls 제외)
- External packages (pino-pretty, lokijs)

---

#### 7. `tsconfig.json`
**역할**: TypeScript 설정

**주요 설정:**
- JSX preserve (Next.js용)
- Path alias: `@/*`
- Next.js 플러그인 활성화

---

### 📚 문서 파일

#### 8. `ENV_TEMPLATE.md`
**역할**: 환경변수 설정 가이드

**필수 환경변수:**
- `NEXT_PUBLIC_PIMLICO_API_KEY`
- `NEXT_PUBLIC_PRIVY_APP_ID`

---

#### 9. `README_SETUP.md`
**역할**: 설치 및 실행 완벽 가이드

**포함 내용:**
- 패키지 설치 방법
- API Key 발급 방법
- 실행 방법 (UI / 스크립트)
- 트러블슈팅

---

## 🔄 실행 흐름 비교

### A. Node.js 스크립트 방식 (기존)

```
npm run node
  ↓
index.ts
  ↓
lib/smartAccount.ts (Private Key 전달)
  ↓
Safe Smart Account 생성
  ↓
트랜잭션 전송
  ↓
결과 출력
```

### B. Privy UI 방식 (신규)

```
npm run dev
  ↓
app/layout.tsx (Privy Provider)
  ↓
app/page.tsx (로그인 UI)
  ↓
사용자 구글 로그인
  ↓
Privy Embedded Wallet 생성
  ↓
lib/smartAccount.ts (WalletClient 전달)
  ↓
Safe Smart Account 생성
  ↓
트랜잭션 전송
  ↓
결과 UI에 표시
```

---

## 📊 파일별 코드 변경 여부

| 파일 | 변경 여부 | 설명 |
|---|---|---|
| `lib/smartAccount.ts` | ✅ 함수화 | 기존 로직 100% 동일 |
| `index.ts` | ✅ 단순화 | lib 함수 호출로 변경 |
| `app/layout.tsx` | 🆕 신규 | Privy Provider |
| `app/page.tsx` | 🆕 신규 | UI 컴포넌트 |
| `package.json` | ✅ 업데이트 | Next.js, Privy 추가 |
| `tsconfig.json` | ✅ 업데이트 | Next.js 호환 |

---

## 🎯 코어 로직 위치

**모든 핵심 로직은 `lib/smartAccount.ts`에 있습니다!**

- Safe Smart Account 생성
- Pimlico Client 설정
- Intent 생성 및 인코딩
- 트랜잭션 전송
- 에러 처리

**UI는 단순히 이 함수를 호출만 합니다.**

---

## 💡 확장 가능성

### 추가할 수 있는 기능

1. **lib/graphql.ts**: Envio 인덱서 GraphQL 쿼리
2. **components/MemeList.tsx**: 밈코인 리스트 UI
3. **lib/ccip.ts**: CCIP 크로스체인 브릿지
4. **hooks/useSmartAccount.ts**: 커스텀 React Hook

---

**모든 파일이 생성되었습니다! 이제 바로 사용할 수 있습니다.** 🚀

