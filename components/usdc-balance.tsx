"use client";
import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { erc20ReadAbi, formatUsdcUnits, getUsdcConfig, USDC_DECIMALS_FALLBACK } from "@/lib/usdc";
import { useWalletStatus } from "@/components/wallet-status";
import { shortenAddress } from "@/lib/wallet";

type BalanceState = "disconnected" | "wrong_network" | "loading" | "success" | "error";
export function useUsdcBalance() {
  const { address, isConnected } = useAccount();
  const wallet = useWalletStatus();
  const config = getUsdcConfig(wallet.chainId);
  const canRead = Boolean(isConnected && address && !wallet.wrongNetwork && config);
  const decimalsQuery = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "decimals", chainId: config?.chain.id, query: { enabled: canRead } });
  const decimals = typeof decimalsQuery.data === "number" ? decimalsQuery.data : USDC_DECIMALS_FALLBACK;
  const balanceQuery = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "balanceOf", args: address ? [address as Address] : undefined, chainId: config?.chain.id, query: { enabled: canRead && !decimalsQuery.isLoading && !decimalsQuery.isError } });
  const state: BalanceState = !isConnected ? "disconnected" : wallet.wrongNetwork || !config ? "wrong_network" : decimalsQuery.isLoading || balanceQuery.isLoading ? "loading" : decimalsQuery.isError || balanceQuery.isError ? "error" : "success";
  return useMemo(() => ({ address, chainId: wallet.chainId, networkName: config?.name || "Unknown network", tokenAddress: config?.address, decimals, rawBalance: balanceQuery.data as bigint | undefined, formattedBalance: typeof balanceQuery.data === "bigint" ? formatUsdcUnits(balanceQuery.data, decimals) : null, state, error: decimalsQuery.error || balanceQuery.error || null, refetch: async () => { await decimalsQuery.refetch(); await balanceQuery.refetch(); } }), [address, wallet.chainId, config, decimals, balanceQuery.data, state, decimalsQuery.error, balanceQuery.error, decimalsQuery.refetch, balanceQuery.refetch]);
}
export function UsdcBalance({ compact = false }: { compact?: boolean }) {
  const balance = useUsdcBalance();
  const content = balance.state === "disconnected" ? <p className="text-sm text-zinc-500">Connect a wallet to read your real USDC balance.</p> : balance.state === "wrong_network" ? <p className="text-sm text-amber-300">Switch to Base to view your Lootly payment balance.</p> : balance.state === "loading" ? <p className="text-sm text-zinc-500">Reading Base USDC balance...</p> : balance.state === "error" ? <p className="text-sm text-red-300">Unable to read USDC balance. Please try again.</p> : <p className="text-2xl font-semibold">{balance.formattedBalance} <span className="text-sm text-electric">USDC</span></p>;
  return <section className={compact ? "rounded-xl border border-line bg-black/20 p-4" : "rounded-2xl border border-line bg-panel p-6"}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Real Wallet Balance</p><p className="mt-2 text-xs text-zinc-500">Read directly from {balance.networkName}</p></div>{balance.address && <span className="text-xs text-zinc-500">{shortenAddress(balance.address)}</span>}</div><div className="mt-5">{content}</div>{balance.state === "success" && <p className="mt-3 text-xs text-zinc-600">Informational only — not held by Lootly or its simulated escrow.</p>}</section>;
}
