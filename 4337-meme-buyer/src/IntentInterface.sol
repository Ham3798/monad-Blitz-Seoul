// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IntentInterface {
    enum IntentStatus {
        None,
        PendingQuote,
        Fillable,
        Rejected
    }

    struct BuyIntent {
        uint64 chainselector;
        address memeToken;   // => 런치패드가 내부인지 / 외부인지 
        uint256 amountOut;
        uint256 maxEthIn;
        uint256 maxSlippageBps;
        uint64 helperSelector;
        uint256 deadline;
        bytes32 nonce;
    }

    event HelperUpdated(address indexed helper);
    event IntentSubmitted(bytes32 indexed intentId, address indexed user);
    event IntentQuoteRequested(bytes32 indexed intentId, bytes32 indexed requestId);
    event IntentChainResolved(bytes32 indexed intentId, uint256 helperChainId);

    error HelperNotSet();
    error IntentExpired();
    error IntentAlreadySeen();
    error InvalidHelperResponse();
    error HelperSelectorMismatch();
}
