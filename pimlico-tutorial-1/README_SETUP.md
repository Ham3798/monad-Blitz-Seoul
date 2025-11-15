# 🚀 Monad 밈코인 콜로니 - 설정 가이드

Privy 소셜 로그인 + Account Abstraction을 적용한 밈코인 구매 플랫폼

---

## 📁 프로젝트 구조

```
pimlico-tutorial-1/
├── index.ts                  # 기존 Node.js 스크립트 (Private Key 방식)
├── lib/
│   └── smartAccount.ts       # 기존 로직을 함수로 추출 (Privy/Private Key 둘 다 지원)
├── app/
│   ├── layout.tsx            # Privy Provider 설정
│   ├── page.tsx              # 메인 UI (소셜 로그인 + 구매)
│   └── globals.css           # 스타일
├── next.config.js            # Next.js 설정
├── tailwind.config.js        # Tailwind CSS 설정
├── package.json              # 패키지 설정
└── .env.local                # 환경변수 (직접 생성 필요)
```

---

## 🛠️ 설치 및 실행

### 1️⃣ 패키지 설치

```bash
npm install
```

### 2️⃣ 환경변수 설정

`.env.local.example` 파일을 복사해서 `.env.local` 파일을 만드세요:

```bash
cp .env.local.example .env.local
```

그리고 다음 값들을 채워넣으세요:

```bash
# .env.local
NEXT_PUBLIC_PIMLICO_API_KEY=여기에_피믈리코_API키
NEXT_PUBLIC_PRIVY_APP_ID=여기에_프리비_앱ID
```

#### 🔑 API Key 발급 방법

**Pimlico API Key:**
1. https://dashboard.pimlico.io/ 접속
2. 회원가입 후 프로젝트 생성
3. API Key 복사

**Privy App ID:**
1. https://dashboard.privy.io/ 접속
2. 회원가입 후 앱 생성
3. App ID 복사

### 3️⃣ 실행

#### 방법 A: UI 버전 (Privy 소셜 로그인) ⭐ 추천

```bash
npm run dev
```

브라우저에서 http://localhost:3000 열기

**사용 방법:**
1. "로그인하기" 버튼 클릭
2. 구글/이메일로 로그인
3. "밈코인 구매" 버튼 클릭
4. 자동으로 Smart Account 생성 및 트랜잭션 전송

#### 방법 B: Node.js 스크립트 (기존 방식)

```bash
npm run node
```

Private Key를 사용하여 기존 방식대로 실행됩니다.

---

## 🎯 코드 설명

### 기존 `index.ts` 로직 유지

기존 코드의 **모든 로직이 `lib/smartAccount.ts`로 이동**했습니다.  
**변경된 것은 단 하나**: Private Key 대신 **Privy WalletClient**도 받을 수 있도록 확장했습니다.

```typescript
// lib/smartAccount.ts
export async function submitMemeIntent(
	privateKeyOrWallet: Hex | any, // ← Private Key 또는 WalletClient
	options?: { ... }
) {
	// 기존 index.ts의 로직 그대로
	// ...
}
```

### UI에서 사용하는 방법

```typescript
// app/page.tsx
import { submitMemeIntent } from '@/lib/smartAccount'
import { useWalletClient } from 'wagmi'

const { data: walletClient } = useWalletClient()

// 기존 로직을 그대로 호출
const result = await submitMemeIntent(walletClient, {
	amountOut: "1",
	maxEthIn: "0.1",
})
```

---

## 📋 주요 파일별 역할

| 파일 | 역할 | 기존 코드 변경 여부 |
|---|---|---|
| `lib/smartAccount.ts` | 기존 로직 함수화 | ❌ 없음 (100% 동일) |
| `index.ts` | Node.js 스크립트 | ❌ 없음 (기존대로) |
| `app/layout.tsx` | Privy Provider | ✅ 새로 추가 |
| `app/page.tsx` | UI 컴포넌트 | ✅ 새로 추가 |

---

## 🔍 트러블슈팅

### 1. `Module not found` 에러
```bash
npm install
```

### 2. Privy 로그인이 안 됨
- `.env.local`에 `NEXT_PUBLIC_PRIVY_APP_ID`가 올바르게 설정되었는지 확인
- Privy Dashboard에서 `http://localhost:3000`을 허용된 도메인에 추가

### 3. 트랜잭션이 실패함
- Monad Testnet에 테스트 MON이 있는지 확인
- Pimlico Paymaster가 활성화되어 있는지 확인

---

## 📚 참고 자료

- [Pimlico 문서](https://docs.pimlico.io/)
- [Privy 문서](https://docs.privy.io/)
- [Monad 문서](https://docs.monad.xyz/)

---

## ✅ 체크리스트

- [ ] `npm install` 완료
- [ ] `.env.local` 파일 생성 및 API Key 설정
- [ ] `npm run dev` 실행 성공
- [ ] 브라우저에서 로그인 성공
- [ ] 밈코인 구매 버튼 클릭 성공
- [ ] Explorer에서 트랜잭션 확인

---

궁금한 점이 있으면 언제든지 물어보세요! 🚀

