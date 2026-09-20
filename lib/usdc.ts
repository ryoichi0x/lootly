import type { Address } from "viem";
import { base, baseSepolia } from "viem/chains";

export const USDC_SYMBOL = "USDC" as const;
export const USDC_DECIMALS_FALLBACK = 6;

export const USDC_BY_CHAIN: Record<number, { chain: typeof base | typeof baseSepolia; address: Address; name: string }> = {
  [base.id]: { chain: base, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "Base" },
  [baseSepolia.id]: { chain: baseSepolia, address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", name: "Base Sepolia" },
};

export function getUsdcConfig(chainId: number | undefined) {
  return chainId ? USDC_BY_CHAIN[chainId] : undefined;
}

export function formatUsdcUnits(value: bigint, decimals: number) {
  const whole = value / 10n ** BigInt(decimals);
  const fraction = (value % 10n ** BigInt(decimals)).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function toUsdcUnits(amount: number, decimals = USDC_DECIMALS_FALLBACK) {
  if (!Number.isFinite(amount) || amount < 0) return 0n;
  const [whole, fraction = ""] = amount.toString().split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export const erc20ReadAbi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;
