"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ListingForm } from "@/components/listing-form";
export default function Sell() { const { user, loading } = useAuth(); const router = useRouter(); useEffect(() => { if (!loading && !user) router.replace("/login?next=/sell"); }, [loading, user, router]); if (loading || !user) return <main className="mx-auto max-w-3xl px-5 py-24 text-center text-zinc-500">Checking your account...</main>; return <main className="mx-auto max-w-3xl px-5 py-14"><p className="text-xs font-bold uppercase tracking-[.2em] text-electric">Start earning</p><h1 className="mt-3 text-5xl font-semibold tracking-tight">Sell your account.</h1><p className="mt-4 text-zinc-400">Create a clear listing and reach gamers around the world.</p><ListingForm /></main>; }
