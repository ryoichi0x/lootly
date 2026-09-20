# Lootly Escrow — Step 7B security hardening

Step 7B preserves the Step 7A architecture and adds authorization, state-machine, fuzz, accounting, isolation, recovery, and reentrancy coverage. The frontend, Supabase simulation, simulated balances, and wallet/payment flows remain unchanged.

## Business-logic limitation preserved

A buyer may refund a `FUNDED` escrow directly. The contract currently has no delivery confirmation, timeout, or dispute-window policy. Step 7B intentionally does not invent one. Step 7C must define those rules before production use.

## Order IDs

The fixed off-chain format remains:

```ts
keccak256(utf8ToBytes(`lootly:order:${orderUuid}`))
```

UUID normalization must be specified consistently by all clients before integration; this step does not silently change it.

## Test commands

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
forge test -vv
forge build
```

The contract remains undeployed and unaudited. It must not hold real funds.
