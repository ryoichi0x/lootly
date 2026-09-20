import type { Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { isAddress } from "viem";

export const USDC_SYMBOL = "USDC" as const;
export const USDC_FALLBACK_DECIMALS = 6;

export const USDC_CONFIG = {
  [base.id]: { chain: base, name: "Base", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address },
  [baseSepolia.id]: { chain: baseSepolia, name: "Base Sepolia", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address },
} as const;

function configuredAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? value as Address : undefined;
}

export function getUsdcConfig(chainId?: number) {
  return chainId === undefined ? undefined : USDC_CONFIG[chainId as keyof typeof USDC_CONFIG];
}

export function getLootlyEscrowAddress(chainId?: number): Address | undefined {
  if (chainId === base.id) return configuredAddress(process.env.NEXT_PUBLIC_LOOTLY_ESCROW_ADDRESS_BASE);
  if (chainId === baseSepolia.id) return configuredAddress(process.env.NEXT_PUBLIC_LOOTLY_ESCROW_ADDRESS_BASE_SEPOLIA);
  return undefined;
}

export function formatUsdcUnits(value: bigint, decimals: number) {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function toUsdcUnits(amount: number | string, decimals: number) {
  const text = String(amount);
  if (!/^\d+(\.\d+)?$/.test(text)) return 0n;
  const [whole, fraction = ""] = text.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export const erc20ReadAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
