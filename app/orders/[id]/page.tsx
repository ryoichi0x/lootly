"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/wallet";

export default function OrderPaymentMethod() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="rounded-2xl border border-line bg-panel p-5 text-zinc-500">Loading payment method…</div>;

  return (
    <section className="mt-8 rounded-2xl border border-line bg-panel p-6">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Payment Method</p>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Crypto Wallet</p>
          {isConnected && address ? (
            <p className="mt-2 text-sm text-zinc-300">{shortenAddress(address)}</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Not connected</p>
          )}
        </div>
        {isConnected && address ? (
          <button onClick={() => disconnect()} className="rounded-full border border-line px-4 py-2 text-sm text-zinc-200">Disconnect</button>
        ) : (
          <button onClick={() => openConnectModal?.()} className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-ink">Connect Wallet</button>
        )}
      </div>
      {isConnected && address ? (
        <div className="mt-4 rounded-xl border border-line bg-black/20 p-4 text-sm text-zinc-400">
          {chain?.id === 8453 ? "Connected to Base" : "Wrong network"}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-line bg-black/20 p-4 text-sm text-zinc-400">Connect Wallet to continue</div>
      )}
    </section>
  );
}
