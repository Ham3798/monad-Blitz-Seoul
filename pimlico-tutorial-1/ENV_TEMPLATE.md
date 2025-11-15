# 환경변수 설정 가이드

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 복사해서 붙여넣으세요.

```bash
# Pimlico API Key (필수)
# 발급: https://dashboard.pimlico.io/
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here

# Privy App ID (필수)
# 발급: https://dashboard.privy.io/
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Node.js 스크립트용 Private Key (선택사항)
# npm run node 명령어 실행 시에만 사용
# PRIVATE_KEY=0x...

# 밈코인 주소 (선택사항 - 기본값 있음)
# MEME_TOKEN_ADDRESS=0xd00ae08403B9bbb9124bB305C09058E32C39A48c

# Helper Selector (선택사항 - 기본값 있음)
# HELPER_SELECTOR=16015286601757825753

# Intent Nonce (선택사항 - 기본값 있음)
# INTENT_NONCE=0x000000000000000000000000000000000000000000000000000000000000abcd
```

## 🔑 API Key 발급 방법

### Pimlico API Key
1. https://dashboard.pimlico.io/ 접속
2. 회원가입 후 프로젝트 생성
3. API Key 복사

### Privy App ID
1. https://dashboard.privy.io/ 접속
2. 회원가입 후 앱 생성
3. App ID 복사
4. Settings에서 `http://localhost:3000` 을 허용된 도메인에 추가

## ⚠️ 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요!
- API Key는 외부에 공유하지 마세요!

