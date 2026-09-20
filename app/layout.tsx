import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Header, Footer, AppShell } from "@/components/layout";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const metadata: Metadata = { title: "Lootly — Buy. Sell. Game.", description: "The premium marketplace for gaming accounts." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${inter.variable} bg-ink text-white antialiased`}><AppShell><Header />{children}<Footer /></AppShell></body></html>; }
