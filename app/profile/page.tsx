"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { WalletStatusCard } from "@/components/wallet-provider";
import { normalizeWalletAddress, isValidEvmAddress, shortenAddress } from "@/lib/wallet";
import { useAccount } from "wagmi";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { address, isConnected, status } = useAccount();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!user) return;
    getSupabaseBrowserClient().from("profiles").select("wallet_address").eq("id", user.id).single().then(({ data, error: fetchError }) => {
      if (!fetchError && data) setWalletAddress(data.wallet_address || null);
    });
  }, [user]);

  async function saveWallet() {
    if (!user) return;
    const finalAddress = isConnected && address ? normalizeWalletAddress(address) : walletAddress;
    if (!finalAddress) {
      setError("No wallet connected to associate.");
      return;
    }
    if (!isValidEvmAddress(finalAddress)) {
      setError("Invalid wallet address.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: updateError } = await getSupabaseBrowserClient().from("profiles").update({ wallet_address: finalAddress }).eq("id", user.id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setWalletAddress(finalAddress);
    setNotice("Wallet saved to your Lootly profile.");
    setSaving(false);
  }

  if (authLoading || !user) return <main className="mx-auto max-w-3xl px-5 py-24 text-center text-zinc-500">Loading profile...</main>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Profile</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-tight">Your identity.</h1>
      <div className="mt-10 space-y-6">
        <WalletStatusCard />
        <div className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Connected Wallet</p>
          <p className="mt-4 text-lg font-semibold">{isConnected && address ? shortenAddress(address) : "Not connected"}</p>
          <p className="mt-2 text-sm text-zinc-500">Saved profile wallet: {walletAddress ? shortenAddress(walletAddress) : "Not saved"}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => saveWallet()} disabled={saving || !isConnected} className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">{saving ? "Saving..." : "Save wallet"}</button>
            <button onClick={() => { setWalletAddress(null); setNotice("Saved wallet cleared."); }} className="rounded-full border border-line px-4 py-2 text-sm text-zinc-200">Clear saved wallet</button>
          </div>
          {status === "disconnected" && <p className="mt-3 text-sm text-zinc-500">Connect a wallet to continue.</p>}
        </div>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-xl border border-electric/30 bg-electric/5 p-4 text-sm text-electric">{notice}</p>}
      </div>
    </main>
  );
}
