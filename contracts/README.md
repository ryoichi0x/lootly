# Lootly Escrow — Step 7B security hardening

Step 7B preserves the Step 7A contract and adds explicit authorization, terminal-state, cross-order, fuzzed accounting, and malicious-token reentrancy coverage. The frontend, Supabase simulation, simulated balances, and wallet/payment flows remain unchanged.

## Business-logic limitation preserved

A buyer may refund a `FUNDED` escrow directly. The contract currently has no delivery confirmation, timeout, or dispute-window policy. Step 7B intentionally does not invent one. Step 7C must define those rules before production use.

## Order IDs

The fixed off-chain format remains:

```ts
keccak256(utf8ToBytes(`lootly:order:${orderUuid}`))
```

UUID normalization must be specified consistently by all clients before integration; this step does not silently change it.

## Tests

Run locally:

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vv
```

The reentrancy tests assert that the malicious token callback was attempted, returned failure, and returned the OpenZeppelin `ReentrancyGuardReentrantCall()` selector. The suite includes resolve-dispute and unsupported-token recovery reentrancy coverage.

A dedicated invariant handler was not added because the existing fuzz/state/accounting tests cover the required properties without adding unnecessary test architecture. Formal invariant-handler coverage remains future work.

The contract remains undeployed and unaudited. It must not hold real funds.
