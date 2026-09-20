# Lootly Escrow — Step 7A

This directory contains an undeployed Solidity escrow contract and Foundry tests. It is not integrated with the Next.js application and does not change the simulated Supabase escrow.

## Contract

`contracts/src/LootlyEscrow.sol` uses Solidity `0.8.24` and OpenZeppelin 5.x `SafeERC20`, `ReentrancyGuard`, and `Ownable`.

The contract accepts only the immutable USDC address supplied to its constructor. The deployment script/operator must supply the verified Circle USDC deployment for the target network; the contract does not invent or select a token address.

## Order IDs

Lootly should convert its UUID to bytes32 off-chain using:

```ts
keccak256(utf8ToBytes(`lootly:order:${orderUuid}`))
```

The exact domain prefix and UUID normalization must be fixed before production integration. The resulting `bytes32` is the `orderId` used by the contract and indexer.

## State machine

- `AWAITING_DEPOSIT` → `FUNDED` via buyer `deposit`
- `FUNDED` → `RELEASED` via buyer confirmation
- `FUNDED` → `REFUNDED` via buyer refund
- `FUNDED` → `DISPUTED` via buyer or seller dispute
- `DISPUTED` → `RELEASED` or `REFUNDED` via owner dispute resolution

A buyer must first call `createEscrow`, then approve USDC, then call `deposit`. No seller payout or buyer refund occurs before the relevant terminal action.

## Deployment preparation — do not deploy yet

Install dependencies locally:

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

Run tests:

```bash
forge test -vv
```

For Base Sepolia, use the verified Circle USDC deployment and a future deployment address only after review. For Base mainnet, use the verified Circle USDC deployment. Never put a private key in the repository or deploy from an unreviewed wallet.

No deployment script, private key, RPC secret, frontend address, or production configuration is included in this step.

## Security notes

- USDC is immutable and cannot be swept by the owner.
- Owner can resolve only `DISPUTED` escrows, to either the stored buyer or stored seller.
- Buyer/seller/amount cannot be changed after creation.
- `SafeERC20` and `ReentrancyGuard` protect token transfers.
- Duplicate order IDs are rejected.
- Unsupported ERC-20 tokens can be recovered only to an explicit recipient; configured USDC cannot be recovered.
- This contract has not been audited and must not hold real funds until professional review.
