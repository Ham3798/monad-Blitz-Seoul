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
 
const privateKey =
	(process.env.PRIVATE_KEY as Hex) ??
	(() => {
		const pk = generatePrivateKey()
		writeFileSync(".env", `PRIVATE_KEY=${pk}`)
		return pk
	})()
 
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
 
const pimlicoUrl = `https://api.pimlico.io/v2/monad-testnet/rpc?apikey=${apiKey}`
 
const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})

const account = await toSafeSmartAccount({
	client: publicClient,
	owners: [privateKeyToAccount(privateKey)],
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	}, // global entrypoint
	version: "1.4.1",
})
 
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

const submitIntentCalldata = encodeFunctionData({
	abi: intentGatewayAbi,
	functionName: "submitIntent",
	args: [buyIntent],
})

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
