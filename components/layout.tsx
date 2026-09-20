"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/wallet";

export function Header() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const wrongNetwork = !!address && !!chain && chain.id !== 8453;

  return (
    <header className="border-b border-line/70 bg-ink/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-electric text-ink font-black">L</span>
          <span className="text-lg">Lootly</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
          <Link href="/browse" className="hover:text-white">Browse</Link>
          <Link href="/sell" className="hover:text-white">Sell</Link>
          <Link href="/how-it-works" className="hover:text-white">How It Works</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/wallet" className="rounded-full border border-line px-4 py-2 text-sm text-zinc-200 hover:border-electric">Wallet</Link>
          {mounted && isConnected && address ? (
            <div className="flex items-center gap-2">
              {wrongNetwork && (
                <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-red-300">Wrong Network</span>
              )}
              <button onClick={() => disconnect()} className="rounded-full border border-line bg-panel px-3 py-2 text-sm text-zinc-200 hover:border-electric">{shortenAddress(address)}</button>
            </div>
          ) : (
            <button onClick={() => openConnectModal?.()} className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-ink">Connect Wallet</button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-10 text-sm text-zinc-500 sm:flex-row">
        <div>
          <p className="font-semibold text-zinc-200">Lootly</p>
          <p className="mt-2">Buy. Sell. Game.</p>
        </div>
        <div className="flex gap-6">
          <Link href="/browse">Browse</Link>
          <Link href="/sell">Sell</Link>
          <Link href="/how-it-works">How It Works</Link>
        </div>
      </div>
    </footer>
  );
}

export function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return <button className={`rounded-full bg-electric px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 ${className}`} {...props}>{children}</button>;
}
