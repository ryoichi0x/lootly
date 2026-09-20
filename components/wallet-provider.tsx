"use client";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";

const useTestnet = process.env.NEXT_PUBLIC_WALLET_NETWORK === "base-sepolia";
export const lootlyChain = useTestnet ? baseSepolia : base;
export const LOOTLY_CHAIN_ID = lootlyChain.id;
const config = getDefaultConfig({ appName: "Lootly", projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id", chains: [lootlyChain], transports: { [lootlyChain.id]: http() }, ssr: true });
const queryClient = new QueryClient();
export function WalletProvider({ children }: { children: React.ReactNode }) { return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider theme={darkTheme({ accentColor: "#c6f36b", accentColorForeground: "#09090b", borderRadius: "large" })}>{children}</RainbowKitProvider></QueryClientProvider></WagmiProvider>; }
