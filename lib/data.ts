export type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null; created_at: string };
export type Listing = {
  id: string; seller_id: string; game: string; title: string; price_usdc: number; rank: string | null; level: number | null;
  items: string[]; description: string; image_url: string | null; status: "active" | "sold" | "draft"; created_at: string; updated_at: string;
  profiles?: Profile | null;
};
export const games = ["All games", "Valorant", "Fortnite", "League of Legends", "Apex Legends", "Genshin Impact", "CS2"];
