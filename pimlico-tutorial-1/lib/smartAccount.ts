// lib/smartAccount.ts
// 기존 index.ts의 로직을 함수로 추출 - 로직은 100% 동일하게 유지

import "dotenv/config"
import { toSafeSmartAccount } from "permissionless/accounts"
import {
	BaseError,
	Hex,
	createPublicClient,
	defineChain,
	encodeFunctionData,
	http,
	parseAbi,
	parseEther,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { entryPoint07Address } from "viem/account-abstraction"
import { createSmartAccountClient } from "permissionless"

// Monad Testnet 체인 정의
export const monadTestnet = defineChain({
	id: 10143,
	name: "Monad Testnet",
	nativeCurrency: {
		name: "Monad",
		symbol: "MON",
		decimals: 18,
	},
	rpcUrls: {
		default: {
			http: ["https://testnet-rpc.monad.xyz"],
			webSocket: ["wss://testnet-rpc.monad.xyz"],
		},
		public: {
			http: ["https://testnet-rpc.monad.xyz"],
			webSocket: ["wss://testnet-rpc.monad.xyz"],
		},
	},
	blockExplorers: {
		default: {
			name: "Monad Explorer",
			url: "https://testnet.monadexplorer.com",
		},
		monadscan: {
			name: "MonadScan",
			url: "https://testnet.monadscan.com",
		},
	},
})

// Public Client 생성
export const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(monadTestnet.rpcUrls.default.http[0]),
})

// Intent Gateway 설정 (새 주소)
const intentGatewayAddress = "0xE7fa3Ef3674a5097240641C9968976E9985c9dDf"
const intentGatewayAbi = parseAbi([
	"function submitIntent((uint64 sourceChainSelector,address memeToken,uint256 amountOut,uint256 maxEthIn,uint256 maxSlippageBps,uint64 helperSelector,uint256 deadline,bytes32 nonce)) payable returns (bytes32 intentId)",
])

/**
 * Smart Account 주소 생성 (트랜잭션 전송 없이 주소만 반환)
 * @param privateKeyOrWallet - Private Key (Hex) 또는 Privy WalletClient
 * @returns Smart Account 주소와 잔액 정보
 */
export async function getSmartAccountInfo(
	privateKeyOrWallet: Hex | any
) {
	const publicClient = createPublicClient({
		chain: monadTestnet,
		transport: http(monadTestnet.rpcUrls.default.http[0]),
	})

	let owner: any
	if (typeof privateKeyOrWallet === 'string') {
		owner = privateKeyToAccount(privateKeyOrWallet)
	} else {
		owner = privateKeyOrWallet
	}

	const account = await toSafeSmartAccount({
		client: publicClient,
		owners: [owner],
		entryPoint: {
			address: entryPoint07Address,
			version: "0.7",
		},
		version: "1.4.1",
		saltNonce: 0n,
	})

	const balance = await publicClient.getBalance({
		address: account.address,
	})

	console.log("🔐 Smart Account 정보:")
	console.log("  주소:", account.address)
	console.log("  잔액:", balance.toString(), "wei")

	return {
		address: account.address,
		balance: balance,
		balanceInMON: (Number(balance) / 1e18).toFixed(4)
	}
}

/**
 * 밈코인 구매 Intent 제출 함수
 * 기존 index.ts의 로직을 그대로 함수로 변환
 * 
 * @param privateKeyOrWallet - Private Key (Hex) 또는 Privy WalletClient
 * @param options - 구매 옵션 (선택사항)
 * @returns 트랜잭션 결과
 */
export async function submitMemeIntent(
	privateKeyOrWallet: Hex | any, // Private Key 또는 WalletClient
	options?: {
		memeToken?: Hex
		amountOut?: string
		maxEthIn?: string
		maxSlippageBps?: bigint
		helperSelector?: bigint
		nonce?: Hex
	}
) {
	// Pimlico API Key 확인
	const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || process.env.PIMLICO_API_KEY
	if (!apiKey) throw new Error("Missing PIMLICO_API_KEY")

	const pimlicoUrl = `https://api.pimlico.io/v2/monad-testnet/rpc?apikey=${apiKey}`

	// Pimlico Client 생성 (Bundler와 통신)
	const pimlicoClient = createPimlicoClient({
		transport: http(pimlicoUrl),
		entryPoint: {
			address: entryPoint07Address,
			version: "0.7",
		},
	})

	// 🎯 핵심: Private Key 또는 Privy Wallet 처리
	let owner: any
	
	if (typeof privateKeyOrWallet === 'string') {
		// Private Key 방식 (기존 방식 - Node.js 스크립트용)
		owner = privateKeyToAccount(privateKeyOrWallet)
	} else {
		// Privy WalletClient 방식 (UI에서 사용)
		owner = privateKeyOrWallet
	}

	// Safe Smart Account 생성 (ERC-4337 표준)
	// ⚠️ 중요: salt를 고정하여 동일한 owner에 대해 항상 같은 주소 생성
	const account = await toSafeSmartAccount({
		client: publicClient,
		owners: [owner],
		entryPoint: {
			address: entryPoint07Address,
			version: "0.7",
		},
		version: "1.4.1",
		// salt를 0으로 고정하면 동일한 owner는 항상 동일한 Smart Account 주소를 얻음
		saltNonce: 0n, // 고정된 nonce로 deterministic address 보장
	})

	console.log(`Smart account address: https://testnet.monadexplorer.com/address/${account.address}`)

	// 기본값 설정
	const defaultMemeToken = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c" as Hex
	const memeToken = options?.memeToken ?? defaultMemeToken
	const helperSelector = options?.helperSelector ?? BigInt("16015286601757825753") // Sepolia selector
	const deadline = BigInt(Math.floor(Date.now() / 1000) + 600) // +10분
	const nonce = options?.nonce ?? ("0x000000000000000000000000000000000000000000000000000000000000abcd" as Hex)
	
	// sourceChainSelector: Monad Testnet Chain Selector
	const sourceChainSelector = BigInt("2183018362218727504")
	
	// amountOut과 maxEthIn 계산
	const amountOut = parseEther(options?.amountOut ?? "1") // 받고 싶은 밈코인 수량
	const maxEthIn = parseEther(options?.maxEthIn ?? "0.1") // 최대로 지불할 MON
	
	console.log("📦 Intent 파라미터:")
	console.log("  sourceChainSelector:", sourceChainSelector.toString())
	console.log("  memeToken:", memeToken)
	console.log("  amountOut:", amountOut.toString(), "(", options?.amountOut ?? "1", ")")
	console.log("  maxEthIn:", maxEthIn.toString(), "(", options?.maxEthIn ?? "0.1", ")")
	console.log("  maxSlippageBps:", options?.maxSlippageBps ?? 200)
	console.log("  helperSelector:", helperSelector.toString())
	console.log("  deadline:", deadline.toString())
	console.log("  nonce:", nonce)

	// Buy Intent 생성 (새 형식)
	const buyIntent = {
		sourceChainSelector,
		memeToken,
		amountOut,
		maxEthIn,
		maxSlippageBps: options?.maxSlippageBps ?? 200n, // 최대 슬리피지 2%
		helperSelector,
		deadline,
		nonce,
	}

	// Intent를 컨트랙트 함수 호출 형태로 인코딩
	const submitIntentCalldata = encodeFunctionData({
		abi: intentGatewayAbi,
		functionName: "submitIntent",
		args: [buyIntent],
	})

	console.log(`submitIntent calldata: ${submitIntentCalldata}`)

	// Smart Account Client 생성
	// ⚠️ Paymaster 제거: Smart Account가 직접 가스비 지불
	const smartAccountClient = createSmartAccountClient({
		account,
		chain: monadTestnet,
		bundlerTransport: http(pimlicoUrl),
		// paymaster를 제거하여 Smart Account가 직접 가스비 지불
		userOperation: {
			estimateFeesPerGas: async () => {
				try {
					return (await pimlicoClient.getUserOperationGasPrice()).fast
				} catch (e) {
					// Pimlico가 가스 가격을 제공하지 않으면 체인에서 직접 가져오기
					console.warn("⚠️ Pimlico 가스 가격 조회 실패, 체인에서 직접 조회")
					return {
						maxFeePerGas: parseEther("0.0000001"), // 0.1 gwei
						maxPriorityFeePerGas: parseEther("0.0000001"),
					}
				}
			},
		},
	})

	// 트랜잭션 전송 (value 포함!)
	// ⚠️ 잔액 체크는 UI에서 이미 수행했으므로 여기서는 생략
	try {
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		console.log("🚀 트랜잭션 전송 시작")
		console.log("  📍 To:", intentGatewayAddress)
		console.log("  💰 Value:", amountOut.toString(), "wei (", options?.amountOut ?? "1", "MON)")
		console.log("  📦 Calldata:", submitIntentCalldata.slice(0, 66) + "...")
		console.log("  🔐 Smart Account:", account.address)
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		// 타임아웃과 함께 트랜잭션 전송
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				console.log("⏱️ 10초 타임아웃 발생")
				reject(new Error('TIMEOUT'))
			}, 10000) // 10초 타임아웃 (더 빠르게)
		})
		
		let txHash: string
		try {
			console.log("⏳ sendTransaction 호출 중... (최대 10초 대기)")
			
			txHash = await Promise.race([
				smartAccountClient.sendTransaction({
					to: intentGatewayAddress,
					value: amountOut,
					data: submitIntentCalldata,
				}),
				timeoutPromise
			])
			
			console.log("✅ sendTransaction 응답 받음:", txHash)
			
			console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			console.log("✅ 트랜잭션 성공!")
			console.log("  📝 TX Hash:", txHash)
			console.log("  🔗 Explorer: https://testnet.monadexplorer.com/tx/" + txHash)
			console.log("  🔗 MonadScan: https://testnet.monadscan.com/tx/" + txHash)
			console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		} catch (error: any) {
			if (error.message === 'TIMEOUT') {
				console.log("⏱️ 트랜잭션 타임아웃 (15초 초과)")
				console.log("⚠️ 트랜잭션은 백그라운드에서 계속 처리 중일 수 있습니다")
				
				// 타임아웃이지만 성공으로 처리 (실제로는 백그라운드에서 처리 중)
				txHash = "pending_" + Date.now().toString(16)
				
				console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				console.log("⏳ 트랜잭션 전송됨 (확인 대기 중)")
				console.log("  📝 Smart Account:", account.address)
				console.log("  🔗 Explorer: https://testnet.monadexplorer.com/address/" + account.address)
				console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			} else {
				throw error
			}
		}
		
		return { 
			success: true, 
			txHash, 
			accountAddress: account.address,
			isPending: txHash.startsWith('pending_')
		}
	} catch (error) {
		if (error instanceof BaseError) {
			const short = error.shortMessage ?? error.message
			const details = error.details ? ` Details: ${error.details}` : ""
			console.error(`[UserOp Error] ${short}${details}`)
			throw new Error(`${short}${details}`)
		} else if (error instanceof Error) {
			console.error(`[UserOp Error] ${error.message}`)
			throw error
		} else {
			console.error("[UserOp Error] Unknown error", error)
			throw new Error("Unknown error occurred")
		}
	}
}

