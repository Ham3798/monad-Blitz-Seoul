import "dotenv/config"
import { writeFileSync } from "fs"
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
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { entryPoint07Address } from "viem/account-abstraction"
import { createSmartAccountClient } from "permissionless"

const apiKey = process.env.PIMLICO_API_KEY
if (!apiKey) throw new Error("Missing PIMLICO_API_KEY")
	//pimico api키 확인 
 
const privateKey =
	(process.env.PRIVATE_KEY as Hex) ??
	(() => {
		const pk = generatePrivateKey()
		writeFileSync(".env", `PRIVATE_KEY=${pk}`)
		return pk
	})()
//여기서 프라이빗 키를 쓰지말고 지갑, 소셜로그인을 통해 키를 가져와서 사용하자

 
const monadTestnet = defineChain({
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

export const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(monadTestnet.rpcUrls.default.http[0]),
})
//public client 생성 
 
const pimlicoUrl = `https://api.pimlico.io/v2/monad-testnet/rpc?apikey=${apiKey}`
 
const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})
//pimlico client 생성 (Pimlico Bundler와 통신, userOp Bundling)


const account = await toSafeSmartAccount({
	client: publicClient,
	owners: [privateKeyToAccount(privateKey)],
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	}, // global entrypoint
	version: "1.4.1",
})
//safe smart account 생성 (ERC-4337 표준)
 
console.log(`Smart account address: https://testnet.monadexplorer.com/address/${account.address}`)

const intentGatewayAddress = "0x1a670A5D1320842e450aAC2fc4a75038765Da24d"
const intentGatewayAbi = parseAbi([
	"function submitIntent((address memeToken,uint256 amountOut,uint256 maxEthIn,uint256 maxSlippageBps,uint64 helperSelector,uint256 deadline,bytes32 nonce) intent) returns (bytes32 intentId)",
])

const defaultMemeToken = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c" as Hex
const memeToken =
	(process.env.MEME_TOKEN_ADDRESS as Hex | undefined) ?? defaultMemeToken

const helperSelector =
	BigInt(process.env.HELPER_SELECTOR ?? "16015286601757825753") // Sepolia selector
const deadline = BigInt(Math.floor(Date.now() / 1000) + 600) // +10 min
const nonce =
	(process.env.INTENT_NONCE as Hex | undefined) ??
	("0x000000000000000000000000000000000000000000000000000000000000abcd" as Hex)

const buyIntent = {
	memeToken,
	amountOut: parseEther("1"),
	maxEthIn: parseEther("0.1"),
	maxSlippageBps: 200n,
	helperSelector,
	deadline,
	nonce,
} as const
//지금은 const로 돼 있음. 이거 유동적으로 입력받아서 처리하도록 바꿔야함

const submitIntentCalldata = encodeFunctionData({
	abi: intentGatewayAbi,
	functionName: "submitIntent",
	args: [buyIntent],
})
//intent를 컨트랙트의 함수 호출형태로 인코딩 

console.log(`submitIntent calldata: ${submitIntentCalldata}`)

const smartAccountClient = createSmartAccountClient({
	account,
	chain: monadTestnet,
	bundlerTransport: http(pimlicoUrl),
	paymaster: pimlicoClient,
	userOperation: {
		estimateFeesPerGas: async () => {
			return (await pimlicoClient.getUserOperationGasPrice()).fast
		},
	},
})
//스마트 지갑으로 트랜잭션 보내는 클라이언트 - 가스비는 Pimlico가 대납 

try {
	const txHash = await smartAccountClient.sendTransaction({
		to: intentGatewayAddress,
		value: 0n,
		data: submitIntentCalldata,
	})

	console.log(`User operation included: https://testnet.monadexplorer.com/tx/${txHash}`)
} catch (error) {
	if (error instanceof BaseError) {
		const short = error.shortMessage ?? error.message
		const details = error.details ? ` Details: ${error.details}` : ""
		console.error(`[UserOp Error] ${short}${details}`)
	} else if (error instanceof Error) {
		console.error(`[UserOp Error] ${error.message}`)
	} else {
		console.error("[UserOp Error] Unknown error", error)
	}
}
//프로세스:
// Intent Gateway에 트랜잭션 전송
// Pimlico가 UserOperation으로 변환
// Paymaster가 가스비 대납
// 트랜잭션 해시 반환