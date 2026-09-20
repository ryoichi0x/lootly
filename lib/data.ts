export type Listing = {
  id: string; game: string; title: string; price: number; rank: string; level: number;
  items: string[]; description: string; seller: string; rating: number; reviews: number; image: string; category: string;
};

export const listings: Listing[] = [
  { id: "valorant-01", game: "Valorant", title: "Radiant account · Elderflame set", price: 248, rank: "Radiant", level: 219, items: ["Elderflame Vandal", "Reaver Knife", "Arcane Sheriff"], description: "A stacked Radiant account with rare event cosmetics and a clean competitive history.", seller: "pixelvault", rating: 4.9, reviews: 128, image: "🎯", category: "FPS" },
  { id: "fortnite-01", game: "Fortnite", title: "OG Chapter 1 locker · 120+ skins", price: 390, rank: "Elite", level: 88, items: ["Black Knight", "Renegade Raider", "Galaxy"], description: "Classic OG locker with sought-after legacy skins and emotes.", seller: "vaultkeeper", rating: 5, reviews: 76, image: "⚡", category: "Battle Royale" },
  { id: "league-01", game: "League of Legends", title: "Emerald account · 180 skins", price: 175, rank: "Emerald I", level: 201, items: ["Jade Dragon Wukong", "Project Vayne", "180 skins"], description: "Deep champion pool, excellent skin collection, ready for ranked.", seller: "summonershop", rating: 4.8, reviews: 54, image: "◈", category: "MOBA" },
  { id: "apex-01", game: "Apex Legends", title: "Master S19 · Heirloom collection", price: 215, rank: "Master", level: 412, items: ["3 Heirlooms", "Wraith main", "Battle Pass maxed"], description: "High-level competitive account with three heirlooms and premium trackers.", seller: "dropzone", rating: 4.9, reviews: 91, image: "⌁", category: "FPS" },
  { id: "genshin-01", game: "Genshin Impact", title: "AR 60 · C6 Raiden · 42 limited 5-stars", price: 320, rank: "Adventure Rank 60", level: 60, items: ["C6 Raiden", "42 limited 5-stars", "Whale weapons"], description: "Endgame account with a complete roster and rare limited weapons.", seller: "teyvattrade", rating: 4.7, reviews: 39, image: "✦", category: "RPG" },
  { id: "cs2-01", game: "CS2", title: "Global Elite · Dragon Lore inventory", price: 890, rank: "Global Elite", level: 10, items: ["AWP Dragon Lore", "Butterfly Knife", "19k inventory"], description: "Premium inventory for collectors. Secure, original owner and fully verified.", seller: "floatmarket", rating: 5, reviews: 203, image: "◒", category: "FPS" }
];
export const games = ["All games", "Valorant", "Fortnite", "League of Legends", "Apex Legends", "Genshin Impact", "CS2"];
