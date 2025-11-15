// app/page.tsx
// 메인 UI 컴포넌트 - 기존 index.ts 로직을 UI로 연결

'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useWalletClient, useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import { submitMemeIntent, getSmartAccountInfo } from '@/lib/smartAccount'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { parseEther } from 'viem'

export default function Home() {
	const { login, logout, authenticated, ready, user } = usePrivy()
	const { wallets } = useWallets()
	const { data: walletClient } = useWalletClient()
	const { isConnected } = useAccount()
	const { setActiveWallet } = useSetActiveWallet()
	
	const [result, setResult] = useState<any>(null)
	const [loading, setLoading] = useState(false)
	const [smartAccountAddress, setSmartAccountAddress] = useState<string>('')
	
	// 주문 정보
	const [memeTokenAddress, setMemeTokenAddress] = useState<string>("0xd00ae08403B9bbb9124bB305C09058E32C39A48c")
	const [amountOut, setAmountOut] = useState<string>("1")
	const [maxEthIn, setMaxEthIn] = useState<string>("0.1")
	const [balance, setBalance] = useState<string>("0") // EOA 지갑 잔액
	const [smartAccountBalance, setSmartAccountBalance] = useState<string>("0") // Smart Account 잔액
	const [needsFunding, setNeedsFunding] = useState(false) // 충전 필요 상태

	// Privy Wallet 찾기 (Embedded 또는 연결된 지갑)
	const embeddedWallet = wallets.find(
		(wallet) => wallet.walletClientType === "privy"
	)
	
	// 연결된 외부 지갑 찾기 (MetaMask 등)
	const connectedWallet = wallets.find(
		(wallet) => wallet.walletClientType !== "privy"
	)
	
	// 사용할 지갑 (우선순위: 연결된 지갑 > Embedded 지갑)
	const activeWallet = connectedWallet || embeddedWallet
	
	// Smart Account 주소를 localStorage에서 복원
	useEffect(() => {
		if (typeof window !== 'undefined' && activeWallet) {
			const savedAddress = localStorage.getItem(`smartAccount_${activeWallet.address}`)
			if (savedAddress) {
				console.log("💾 저장된 Smart Account 복원:", savedAddress)
				setSmartAccountAddress(savedAddress)
			}
		}
	}, [activeWallet])
	
	// 지갑 잔액 조회
	useEffect(() => {
		if (activeWallet) {
			fetchBalance()
		}
	}, [activeWallet, smartAccountAddress])
	
	// Monad 체인으로 자동 전환
	async function switchToMonad(provider: any) {
		const MONAD_CHAIN_ID = '0x279f' // 10143
		
		try {
			console.log("🔄 Monad 체인으로 전환 시도...")
			
			// 체인 전환 시도
			await provider.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: MONAD_CHAIN_ID }],
			})
			
			console.log("✅ Monad 체인으로 전환 완료!")
			return true
		} catch (switchError: any) {
			// 체인이 지갑에 없는 경우 (4902 에러)
			if (switchError.code === 4902) {
				try {
					console.log("➕ Monad 체인 추가 중...")
					await provider.request({
						method: 'wallet_addEthereumChain',
						params: [
							{
								chainId: MONAD_CHAIN_ID,
								chainName: 'Monad Testnet',
								nativeCurrency: {
									name: 'Monad',
									symbol: 'MON',
									decimals: 18,
								},
								rpcUrls: ['https://testnet-rpc.monad.xyz'],
								blockExplorerUrls: ['https://testnet.monadexplorer.com'],
							},
						],
					})
					console.log("✅ Monad 체인 추가 및 전환 완료!")
					return true
				} catch (addError) {
					console.error("❌ Monad 체인 추가 실패:", addError)
					alert("Monad 체인 추가에 실패했습니다. MetaMask에서 수동으로 추가해주세요.")
					return false
				}
			} else {
				console.error("❌ 체인 전환 실패:", switchError)
				return false
			}
		}
	}

	async function fetchBalance() {
		if (!activeWallet) return
		try {
			console.log("💰 잔액 조회 시작...")
			const provider = await activeWallet.getEthereumProvider()
			
			// 현재 체인 확인
			let chainId = await provider.request({ method: 'eth_chainId' })
			console.log("🔗 연결된 체인:", chainId, "(Monad: 0x279f)")
			
			// Monad가 아니면 자동 전환
			if (chainId !== '0x279f') {
				console.log("⚠️ Monad 체인이 아닙니다. 자동 전환 중...")
				const switched = await switchToMonad(provider)
				if (!switched) {
					setBalance("체인 전환 필요")
					return
				}
				// 전환 후 다시 체인 확인
				chainId = await provider.request({ method: 'eth_chainId' })
			}
			
			const accounts = await provider.request({ method: 'eth_accounts' })
			console.log("👛 계정:", accounts[0])
			
			if (accounts && accounts.length > 0) {
				const balanceHex = await provider.request({ 
					method: 'eth_getBalance', 
					params: [accounts[0], 'latest'] 
				})
				console.log("📊 잔액 (hex):", balanceHex)
				
				const balanceInMON = (parseInt(balanceHex, 16) / 1e18).toFixed(4)
				console.log("💎 잔액 (MON):", balanceInMON)
				setBalance(balanceInMON)
				
				// Smart Account 잔액도 조회
				if (smartAccountAddress) {
					try {
						const saBalanceHex = await provider.request({ 
							method: 'eth_getBalance', 
							params: [smartAccountAddress, 'latest'] 
						})
						const saBalanceInMON = (parseInt(saBalanceHex, 16) / 1e18).toFixed(4)
						console.log("🔐 Smart Account 잔액:", saBalanceInMON, "MON")
						setSmartAccountBalance(saBalanceInMON)
					} catch (saError) {
						console.error("Smart Account 잔액 조회 실패:", saError)
						setSmartAccountBalance("0")
					}
				}
			}
		} catch (error) {
			console.error("❌ 잔액 조회 실패:", error)
			setBalance("조회 실패")
		}
	}

	// 활성 지갑 설정
	useEffect(() => {
		if (activeWallet) {
			setActiveWallet(activeWallet)
		}
	}, [activeWallet, setActiveWallet])

	// 밈코인 구매 함수
	// Smart Account에 MON 충전
	async function fundSmartAccount() {
		if (!activeWallet || !smartAccountAddress) {
			alert("먼저 Smart Account를 생성해주세요 (구매하기 버튼 한 번 클릭)")
			return
		}
		
		setLoading(true)
		try {
			const provider = await activeWallet.getEthereumProvider()
			
			// 체인 확인
			const chainId = await provider.request({ method: 'eth_chainId' })
			if (chainId !== '0x279f') {
				const switched = await switchToMonad(provider)
				if (!switched) {
					throw new Error("Monad 체인으로 전환이 필요합니다")
				}
			}
			
			const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
			const fundAmount = parseEther("10") // AA 트랜잭션에 필요한 10 MON 충전
			
			console.log("💰 Smart Account 충전 시작...")
			console.log("  - Smart Account:", smartAccountAddress)
			console.log("  - 충전 금액: 10 MON")
			
			const txHash = await provider.request({
				method: 'eth_sendTransaction',
				params: [{
					from: accounts[0],
					to: smartAccountAddress,
					value: '0x' + fundAmount.toString(16),
				}]
			}) as string
			
			console.log("✅ 충전 완료! TX:", txHash)
			alert(`✅ Smart Account 충전 완료!\n\n10 MON이 전송되었습니다.\n이제 밈코인 구매하기를 다시 클릭하세요!\n\nTX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`)
			
			setNeedsFunding(false) // 충전 완료
			
			// 2초 후 잔액 갱신
			setTimeout(() => fetchBalance(), 2000)
		} catch (error: any) {
			console.error("충전 실패:", error)
			alert(`충전 실패: ${error.message}`)
		} finally {
			setLoading(false)
		}
	}

	async function handleBuyMeme() {
		if (!authenticated || !activeWallet) {
			alert("먼저 로그인해주세요")
			return
		}
		
		// 입력 검증
		if (!memeTokenAddress || !memeTokenAddress.startsWith('0x')) {
			alert("올바른 밈코인 주소를 입력해주세요")
			return
		}
		
		if (parseFloat(amountOut) <= 0) {
			alert("구매 수량을 입력해주세요")
			return
		}
		
		if (parseFloat(maxEthIn) <= 0) {
			alert("최대 지불 금액을 입력해주세요")
			return
		}

		setLoading(true)
		setResult(null)
		
		try {
			console.log("🚀 밈코인 구매 시작...")
			console.log("📍 밈코인 주소:", memeTokenAddress)
			console.log("🔢 구매 수량:", amountOut)
			console.log("💰 최대 지불:", maxEthIn, "MON")
			
			// 활성 지갑 사용
			const provider = await activeWallet.getEthereumProvider()
			
			// 체인 확인 및 자동 전환
			const chainId = await provider.request({ method: 'eth_chainId' })
			if (chainId !== '0x279f') {
				console.log("⚠️ Monad 체인으로 전환 중...")
				const switched = await switchToMonad(provider)
				if (!switched) {
					throw new Error("Monad 체인으로 전환이 필요합니다")
				}
			}
			
			// 🔍 1단계: Smart Account 정보 확인
			console.log("🔍 Smart Account 정보 확인 중...")
			const accountInfo = await getSmartAccountInfo(provider)
			
			console.log("📦 Smart Account 정보:")
			console.log("  주소:", accountInfo.address)
			console.log("  잔액:", accountInfo.balanceInMON, "MON")
			console.log("  필요:", amountOut, "MON")
			
			// Smart Account 주소 저장
			setSmartAccountAddress(accountInfo.address)
			setSmartAccountBalance(accountInfo.balanceInMON)
			
			if (activeWallet) {
				localStorage.setItem(`smartAccount_${activeWallet.address}`, accountInfo.address)
			}
			
			// 🔍 2단계: 잔액 확인 (가스비 포함 10 MON 필요)
			const valueAmount = parseEther(amountOut)
			const requiredAmount = parseEther("10") // AA 트랜잭션은 가스비 포함 10 MON 필요
			
			if (accountInfo.balance < requiredAmount) {
				console.log("❌ Smart Account 잔액 부족!")
				console.log("  현재:", accountInfo.balanceInMON, "MON")
				console.log("  필요:", "10 MON (value + 가스비)")
				
				setNeedsFunding(true)
				setLoading(false)
				
				alert(`⚠️ Smart Account 잔액이 부족합니다!\n\n현재: ${accountInfo.balanceInMON} MON\n필요: 10 MON (가스비 포함)\n\n아래 충전 버튼을 눌러 10 MON을 충전해주세요.`)
				
				// 충전 섹션으로 스크롤
				setTimeout(() => {
					const fundingSection = document.getElementById('funding-section')
					fundingSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}, 100)
				
				return // 여기서 중단!
			}
			
			// ✅ 3단계: 잔액이 충분하면 트랜잭션 전송
			console.log("✅ 잔액 충분! 트랜잭션 전송 중...")
			const result = await submitMemeIntent(provider, {
				memeToken: memeTokenAddress as `0x${string}`,
				amountOut: amountOut,
				maxEthIn: maxEthIn,
			})
			
			if (result.isPending) {
				console.log("⏳ 트랜잭션 전송됨 (확인 대기 중)")
				console.log("📝 Smart Account:", result.accountAddress)
				
				alert("✅ 트랜잭션이 전송되었습니다!\n\n네트워크 혼잡으로 확인에 시간이 걸릴 수 있습니다.\nSmart Account를 블록 익스플로러에서 확인해보세요.")
			} else {
				console.log("✅ 트랜잭션 성공!")
				console.log("📝 TX Hash:", result.txHash)
				console.log("🔗 Explorer:", `https://testnet.monadexplorer.com/tx/${result.txHash}`)
			}
			
			setResult(result)
			setSmartAccountAddress(result.accountAddress)
			setNeedsFunding(false) // 성공하면 충전 불필요
			
			// Smart Account 주소를 localStorage에 저장
			if (activeWallet && result.accountAddress) {
				localStorage.setItem(`smartAccount_${activeWallet.address}`, result.accountAddress)
				console.log("💾 Smart Account 주소 저장됨:", result.accountAddress)
			}
			
			// 구매 후 잔액 갱신
			setTimeout(() => fetchBalance(), 2000)
		} catch (error: any) {
			console.error("❌ 에러 발생:", error)
			console.error("  - Message:", error.message)
			
			alert(`에러 발생: ${error.message || '알 수 없는 에러'}`)
		} finally {
			setLoading(false)
		}
	}

	if (!ready) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-xl">로딩 중...</div>
			</div>
		)
	}

	return (
		<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 p-4">
			<div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
				{/* 헤더 */}
				<div className="text-center mb-8">
					<div className="text-6xl mb-4">🚀</div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
						Monad Meme Colony
					</h1>
					<p className="text-gray-500 text-sm">
						가스비 없이 밈코인 구매하기
					</p>
				</div>

				{!authenticated ? (
					// 로그인 전 화면
					<div className="space-y-4">
						<button
							onClick={login}
							className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
						>
							시작하기 →
						</button>
					</div>
				) : (
					// 로그인 후 화면
					<div className="space-y-4">
						{/* 사용자 정보 */}
						<div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-green-600">✓</span>
								<p className="text-xs text-gray-500 uppercase font-semibold">로그인됨</p>
							</div>
							<p className="font-semibold text-gray-800">
								{user?.email?.address || user?.google?.email || user?.twitter?.username || '사용자'}
							</p>
						</div>

						{/* 지갑 정보 & 잔액 */}
						{activeWallet && (
							<div className="space-y-3">
								<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
									<div className="flex items-center justify-between mb-2">
										<p className="text-xs text-gray-500 uppercase font-semibold">지갑 주소</p>
										<span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
											{connectedWallet ? '외부 지갑' : '내장 지갑'}
										</span>
									</div>
									<p className="font-mono text-xs break-all text-gray-700">
										{activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
									</p>
								</div>
								
								<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
									<p className="text-xs text-gray-500 uppercase font-semibold mb-1">잔액</p>
									<p className="text-2xl font-bold text-purple-700">
										{balance} MON
									</p>
								</div>
							</div>
						)}
						
						{/* 밈코인 주문 폼 */}
						<div className="bg-gradient-to-r from-gray-50 to-slate-50 p-5 rounded-xl border border-gray-200 space-y-4">
							<h3 className="font-bold text-gray-800 flex items-center gap-2">
								<span className="text-xl">🎯</span>
								밈코인 주문하기
							</h3>
							
							{/* 밈코인 주소 입력 */}
							<div>
								<label className="text-xs text-gray-600 font-semibold mb-1 block">
									밈코인 주소
								</label>
								<input
									type="text"
									value={memeTokenAddress}
									onChange={(e) => setMemeTokenAddress(e.target.value)}
									placeholder="0x..."
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
								/>
							</div>
							
							{/* 구매 수량 */}
							<div>
								<label className="text-xs text-gray-600 font-semibold mb-1 block">
									구매 수량 (개)
								</label>
								<input
									type="number"
									value={amountOut}
									onChange={(e) => setAmountOut(e.target.value)}
									placeholder="1"
									step="0.1"
									min="0"
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
								/>
							</div>
							
							{/* 최대 지불 금액 */}
							<div>
								<label className="text-xs text-gray-600 font-semibold mb-1 block">
									최대 지불 금액 (MON)
								</label>
								<input
									type="number"
									value={maxEthIn}
									onChange={(e) => setMaxEthIn(e.target.value)}
									placeholder="0.1"
									step="0.01"
									min="0"
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									💡 사용 가능: {balance} MON
								</p>
							</div>
							
							{/* 예상 금액 */}
							<div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
								<p className="text-xs font-semibold text-blue-800 mb-2">📊 거래 구조</p>
								<div className="space-y-1 text-xs text-gray-700">
									<div className="flex justify-between">
										<span>원하는 밈코인:</span>
										<span className="font-bold">{amountOut} 개</span>
									</div>
									<div className="flex justify-between">
										<span>최대 지불:</span>
										<span className="font-bold">{maxEthIn} MON</span>
									</div>
									<div className="border-t border-blue-200 my-1 pt-1">
										<div className="flex justify-between">
											<span className="text-orange-700">Smart Account 필요:</span>
											<span className="font-bold text-orange-700">10 MON</span>
										</div>
										<p className="text-xs text-gray-500 mt-1">
											(Intent 전송 {amountOut} MON + 가스비)
										</p>
									</div>
								</div>
								<p className="text-xs text-gray-500 mt-2 bg-white p-2 rounded">
									💡 AA(계정 추상화) 트랜잭션은 가스비를 포함하여 최소 10 MON이 필요합니다.
								</p>
							</div>
							
							{/* Intent Gateway 정보 */}
							<div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
								<p className="text-xs font-semibold text-yellow-800 mb-1">⚡ Intent Gateway</p>
								<p className="text-xs font-mono text-gray-600">
									0xE7fa...9dDf
								</p>
								<p className="text-xs text-gray-500 mt-1">
									실제 트랜잭션이 Monad Testnet에 전송됩니다
								</p>
							</div>
							
							{/* Smart Account 정보 */}
							{smartAccountAddress && (
								<div 
									id="funding-section"
									className={`p-4 rounded-xl border-2 transition-all ${
										needsFunding 
											? 'bg-red-50 border-red-400 animate-pulse' 
											: 'bg-orange-50 border-orange-200'
									}`}
								>
									<div className="flex items-center justify-between mb-2">
										<p className={`text-sm font-bold ${needsFunding ? 'text-red-800' : 'text-orange-800'}`}>
											🔐 Smart Account
										</p>
										{needsFunding && (
											<span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
												충전 필요!
											</span>
										)}
									</div>
									<p className="text-xs font-mono text-gray-600 break-all mb-2">
										{smartAccountAddress}
									</p>
									
									{/* Smart Account 잔액 */}
									<div className="bg-white p-2 rounded-lg border border-gray-200 mb-3">
										<div className="flex justify-between items-center">
											<span className="text-xs text-gray-600">현재 잔액:</span>
											<span className={`text-sm font-bold ${parseFloat(smartAccountBalance) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
												{smartAccountBalance} MON
											</span>
										</div>
										<div className="flex justify-between items-center mt-1">
											<span className="text-xs text-gray-600">필요한 잔액:</span>
											<span className="text-sm font-bold text-orange-600">
												10 MON
											</span>
										</div>
										<p className="text-xs text-gray-500 mt-1">
											(가스비 포함 최소 10 MON 필요)
										</p>
									</div>
									
									{needsFunding && (
										<div className="bg-white p-3 rounded-lg border border-red-200 mb-3">
											<p className="text-sm font-semibold text-red-700 mb-1">
												⚠️ Smart Account 잔액 부족
											</p>
											<p className="text-xs text-gray-600">
												AA 트랜잭션을 위해 Smart Account에 <span className="font-bold text-red-600">최소 10 MON</span>을 충전해주세요. (가스비 포함)
											</p>
										</div>
									)}
									
									<button
										onClick={fundSmartAccount}
										disabled={loading}
										className={`w-full text-white text-sm font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 shadow-lg ${
											needsFunding
												? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
												: 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600'
										}`}
									>
										💰 Smart Account에 10 MON 충전하기
									</button>
									
									<p className="text-xs text-gray-500 mt-2 text-center">
										👆 MetaMask에서 바로 전송됩니다
									</p>
								</div>
							)}
						</div>

						{/* 밈코인 구매 버튼 */}
						<button
							onClick={handleBuyMeme}
							disabled={loading || !activeWallet}
							className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
						>
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									처리 중...
								</span>
							) : (
								'💎 밈코인 구매하기'
							)}
						</button>

						{/* 스마트 계정 주소 */}
						{smartAccountAddress && (
							<div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
								<p className="text-xs text-gray-500 uppercase font-semibold mb-2">스마트 계정 (AA)</p>
								<p className="font-mono text-xs break-all text-gray-700 mb-2">
									{smartAccountAddress.slice(0, 10)}...{smartAccountAddress.slice(-8)}
								</p>
								<a
									href={`https://testnet.monadexplorer.com/address/${smartAccountAddress}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 text-xs font-semibold hover:underline"
								>
									Explorer 보기 →
								</a>
							</div>
						)}

						{/* 트랜잭션 결과 */}
						{result && result.success && (
							<div className={`p-4 rounded-xl border-2 ${
								result.isPending 
									? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400' 
									: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
							}`}>
								<p className={`font-bold mb-2 flex items-center gap-2 ${
									result.isPending ? 'text-yellow-700' : 'text-green-700'
								}`}>
									<span className="text-2xl">{result.isPending ? '⏳' : '🎉'}</span>
									{result.isPending ? '트랜잭션 전송됨' : '구매 완료!'}
								</p>
								{result.isPending ? (
									<div className="space-y-2">
										<p className="text-xs text-gray-600">
											네트워크 확인 중... Smart Account에서 트랜잭션을 확인해주세요.
										</p>
										<a
											href={`https://testnet.monadexplorer.com/address/${result.accountAddress}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-yellow-600 text-sm font-semibold hover:underline flex items-center gap-1"
										>
											Smart Account 확인 →
										</a>
									</div>
								) : (
									<a
										href={`https://testnet.monadexplorer.com/tx/${result.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-green-600 text-sm font-semibold hover:underline flex items-center gap-1"
									>
										트랜잭션 확인 →
									</a>
								)}
							</div>
						)}

						{/* 로그아웃 */}
						<button
							onClick={logout}
							className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition duration-200 border border-gray-300"
						>
							로그아웃
						</button>
					</div>
				)}
			</div>
		</main>
	)
}

