"use client";
import { useMemo } from "react";
import type { Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useWalletStatus } from "@/components/wallet-status";
import { erc20ReadAbi, formatUsdcUnits, getUsdcConfig, USDC_FALLBACK_DECIMALS } from "@/lib/usdc";
import { shortenAddress } from "@/lib/wallet";

export type UsdcReadState = "disconnected" | "wrong_network" | "loading" | "success" | "error";

export function useUsdcBalance() {
  const { address, isConnected } = useAccount();
  const wallet = useWalletStatus();
  const config = getUsdcConfig(wallet.chainId);
  const onSupportedNetwork = Boolean(isConnected && address && config && !wallet.wrongNetwork);
  const decimalsRead = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "decimals", chainId: config?.chain.id, query: { enabled: onSupportedNetwork } });
  const decimals = decimalsRead.data === undefined ? USDC_FALLBACK_DECIMALS : Number(decimalsRead.data);
  const balanceRead = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "balanceOf", args: address ? [address as Address] : undefined, chainId: config?.chain.id, query: { enabled: onSupportedNetwork && !decimalsRead.isLoading && !decimalsRead.isError } });
  const state: UsdcReadState = !isConnected ? "disconnected" : !config || wallet.wrongNetwork ? "wrong_network" : decimalsRead.isLoading || balanceRead.isLoading ? "loading" : decimalsRead.isError || balanceRead.isError ? "error" : "success";
  return useMemo(() => ({ address, chainId: wallet.chainId, networkName: config?.name ?? "Unknown network", tokenAddress: config?.address, decimals, rawBalance: typeof balanceRead.data === "bigint" ? balanceRead.data : undefined, formattedBalance: typeof balanceRead.data === "bigint" ? formatUsdcUnits(balanceRead.data, decimals) : null, state, error: decimalsRead.error ?? balanceRead.error ?? null, refetch: async () => { await decimalsRead.refetch(); await balanceRead.refetch(); } }), [address, wallet.chainId, config, decimals, balanceRead.data, state, decimalsRead.error, balanceRead.error, decimalsRead.refetch, balanceRead.refetch]);
}

export function UsdcBalance({ compact = false }: { compact?: boolean }) {
  const balance = useUsdcBalance();
  const body = balance.state === "disconnected" ? <p className="text-sm text-zinc-500">Connect a wallet to read your real USDC balance.</p> : balance.state === "wrong_network" ? <p className="text-sm text-amber-300">Switch to Base to view the Base USDC balance.</p> : balance.state === "loading" ? <p className="text-sm text-zinc-500">Reading USDC balance from {balance.networkName}...</p> : balance.state === "error" ? <p className="text-sm text-red-300">Unable to read USDC balance. The RPC or token read failed.</p> : <p className="text-2xl font-semibold">{balance.formattedBalance} <span className="text-sm text-electric">USDC</span></p>;
  return <section className={compact ? "rounded-xl border border-line bg-black/20 p-4" : "rounded-2xl border border-line bg-panel p-6"}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Real Wallet Balance</p><p className="mt-2 text-xs text-zinc-500">Read directly from {balance.networkName}</p></div>{balance.address && <span className="text-xs text-zinc-500">{shortenAddress(balance.address)}</span>}</div><div className="mt-5">{body}</div>{balance.state === "success" && <p className="mt-3 text-xs text-zinc-600">Informational only. Lootly does not hold these funds.</p>}</section>;
}
