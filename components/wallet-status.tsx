"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOOTLY_CHAIN_ID } from "@/components/wallet-provider";
import { normalizeWalletAddress, shortenAddress } from "@/lib/wallet";
import { useAuth } from "@/components/auth-provider";

type WalletState = "not_connected" | "connected_unassociated" | "associated" | "different_wallet" | "disconnected_associated";
export function useWalletStatus() {
  const { user } = useAuth(); const { address, isConnected, chain, status } = useAccount(); const chainId = useChainId(); const { switchChain } = useSwitchChain(); const { disconnect } = useDisconnect();
  const [savedAddress, setSavedAddress] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => { let active = true; if (!user) { setSavedAddress(null); return; } getSupabaseBrowserClient().from("profiles").select("wallet_address").eq("id", user.id).single().then(({ data }) => { if (active) setSavedAddress(data?.wallet_address || null); }); return () => { active = false; }; }, [user]);
  const normalized = address ? normalizeWalletAddress(address) : null;
  const state: WalletState = !isConnected ? (savedAddress ? "disconnected_associated" : "not_connected") : !savedAddress ? "connected_unassociated" : normalized === savedAddress ? "associated" : "different_wallet";
  const wrongNetwork = isConnected && (!chain || chain.id !== LOOTLY_CHAIN_ID);
  const networkName = chain?.name || "Unknown network";
  const associate = async () => { if (!user || !normalized) throw new Error("Connect a wallet first."); setLoading(true); const { error } = await getSupabaseBrowserClient().from("profiles").update({ wallet_address: normalized }).eq("id", user.id); setLoading(false); if (error) throw error; setSavedAddress(normalized); };
  return useMemo(() => ({ address, normalized, savedAddress, isConnected, status, chain, chainId, networkName, wrongNetwork, state, loading, disconnect, switchToLootlyNetwork: () => switchChain?.({ chainId: LOOTLY_CHAIN_ID }), associate }), [address, normalized, savedAddress, isConnected, status, chain, chainId, networkName, wrongNetwork, state, loading, disconnect, switchChain, associate]);
}
export function WalletStatus({ compact = false }: { compact?: boolean }) { const { openConnectModal } = useConnectModal(); const wallet = useWalletStatus(); const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return <span className="text-sm text-zinc-500">Loading wallet...</span>; if (!wallet.isConnected) return <div className={compact ? "" : "rounded-2xl border border-line bg-panel p-5"}><p className="text-sm text-zinc-500">{wallet.state === "disconnected_associated" ? "Wallet disconnected" : "Not connected"}</p>{!compact && <button onClick={() => openConnectModal?.()} className="mt-3 rounded-full bg-electric px-4 py-2 text-sm font-semibold text-ink">Connect Wallet</button>}</div>; return <div className={compact ? "" : "rounded-2xl border border-line bg-panel p-5"}><div className="flex flex-wrap items-center gap-3"><p className="font-semibold">{shortenAddress(wallet.address!)}</p><span className={`rounded-full px-2.5 py-1 text-xs ${wallet.wrongNetwork ? "bg-red-400/10 text-red-300" : "bg-electric/10 text-electric"}`}>{wallet.wrongNetwork ? "Wrong Network" : "Connected"}</span></div>{!compact && <><p className="mt-2 text-sm text-zinc-500">{wallet.networkName}</p>{wallet.state === "connected_unassociated" && <p className="mt-3 text-sm text-amber-300">Connected but not associated with this Lootly profile.</p>}{wallet.state === "different_wallet" && <p className="mt-3 text-sm text-amber-300">A different wallet is connected than your saved profile wallet.</p>}{wallet.wrongNetwork && <button onClick={() => wallet.switchToLootlyNetwork()} className="mt-3 rounded-full border border-line px-4 py-2 text-sm hover:border-electric">Switch to {process.env.NEXT_PUBLIC_WALLET_NETWORK === "base-sepolia" ? "Base Sepolia" : "Base"}</button>}</>}</div>; }
export { LOOTLY_CHAIN_ID };
