// app/layout.tsx
// Privy Provider 설정 - 소셜 로그인 기능 제공

'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'viem'
import { monadTestnet } from '@/lib/smartAccount'
import './globals.css'

// Wagmi 설정 (Monad Testnet 연결)
const wagmiConfig = createConfig({
	chains: [monadTestnet],
	transports: {
		[monadTestnet.id]: http(),
	},
})

// React Query 클라이언트 생성
const queryClient = new QueryClient()

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="ko">
			<head>
				<title>Monad human over</title>
				<meta name="description" content="Monad에서 밈코인을 간편하게 구매하세요" />
			</head>
			<body>
				<PrivyProvider
					appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
					config={{
						embeddedWallets: {
							createOnLogin: 'all-users',
						},
						loginMethods: ['wallet', 'email', 'google', 'twitter'], // 지갑, 이메일, 구글, 트위터
						appearance: {
							theme: 'light',
							accentColor: '#6A6FF5',
							logo: undefined,
							walletList: ['metamask', 'coinbase_wallet', 'wallet_connect', 'rainbow'], // 지갑 목록
						},
					}}
				>
					<QueryClientProvider client={queryClient}>
						<WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
							{children}
						</WagmiProvider>
					</QueryClientProvider>
				</PrivyProvider>
			</body>
		</html>
	)
}

