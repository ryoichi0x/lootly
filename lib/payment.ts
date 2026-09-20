import { LOOTLY_CHAIN_ID } from "@/components/wallet-provider";
export const PAYMENT_CURRENCY = "USDC" as const;
export type PaymentReadiness = "not_connected" | "wrong_network" | "unassociated" | "ready";
export function getPaymentReadiness(input: { address?: string; wrongNetwork: boolean; savedAddress?: string | null }): PaymentReadiness { if (!input.address) return "not_connected"; if (input.wrongNetwork) return "wrong_network"; if (!input.savedAddress || input.address.toLowerCase() !== input.savedAddress.toLowerCase()) return "unassociated"; return "ready"; }
export function preparePaymentSummary(input: { amount: number; buyerWallet?: string; sellerWallet?: string | null }) { return { amount: input.amount, currency: PAYMENT_CURRENCY, chainId: LOOTLY_CHAIN_ID, buyerWallet: input.buyerWallet || null, sellerWallet: input.sellerWallet || null, canExecute: false as const }; }
