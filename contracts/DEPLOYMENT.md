# Step 7A contract development

The existing Lootly frontend, Supabase order system, simulated wallet balances, and simulated escrow are intentionally unchanged. This is a standalone design artifact only.

## Network configuration to verify before any deployment

- Base Sepolia chain ID: `84532`
- Base mainnet chain ID: `8453`
- Base USDC: verify the current official Circle deployment before deployment
- Base Sepolia USDC: verify the current official Circle deployment before deployment

The constructor requires the verified network-specific USDC address, so the contract cannot silently use an arbitrary token.
