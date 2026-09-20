export type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null; created_at: string };
export type Listing = { id: string; seller_id: string; game: string; title: string; price_usdc: number; rank: string | null; level: number | null; items: string[]; description: string; image_url: string | null; status: "active" | "sold" | "draft"; created_at: string; updated_at: string; profiles?: Profile | null };
export type OrderStatus = "pending" | "processing" | "delivered" | "completed" | "cancelled" | "disputed";
export type EscrowStatus = "awaiting_funding" | "funded" | "released" | "refunded" | "disputed";
export type Order = { id: string; listing_id: string; buyer_id: string; seller_id: string; amount_usdc: number; status: OrderStatus; created_at: string; updated_at: string; listings?: Listing | null; buyer?: Profile | null; seller?: Profile | null; escrows?: Escrow | null };
export type Escrow = { id: string; order_id: string; buyer_id: string; seller_id: string; amount_usdc: number; status: EscrowStatus; created_at: string; funded_at: string | null; released_at: string | null; cancelled_at: string | null };
export const games = ["All games", "Valorant", "Fortnite", "League of Legends", "Apex Legends", "Genshin Impact", "CS2"];
