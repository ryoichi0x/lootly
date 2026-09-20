"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/layout";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { games, type Listing } from "@/lib/data";

type Props = { listing?: Listing; mode?: "create" | "edit" };
export function ListingForm({ listing, mode = "create" }: Props) {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(listing?.image_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  function chooseImage(file?: File) { if (!file) return; if (file.size > 10 * 1024 * 1024) { setError("Images must be smaller than 10MB."); return; } if (!file.type.startsWith("image/")) { setError("Please choose a PNG, JPG, or WebP image."); return; } setError(""); setImage(file); setPreview(URL.createObjectURL(file)); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget); const price = Number(form.get("price")); const levelValue = String(form.get("level") || ""); const level = levelValue ? Number(levelValue) : null;
    if (!form.get("game") || !String(form.get("title")).trim() || !String(form.get("description")).trim()) { setError("Game, title, and description are required."); setSaving(false); return; }
    if (!Number.isFinite(price) || price <= 0) { setError("Price must be greater than zero."); setSaving(false); return; }
    if (String(form.get("title")).trim().length > 120 || String(form.get("description")).trim().length > 2000) { setError("Title or description is too long."); setSaving(false); return; }
    if (level !== null && (!Number.isInteger(level) || level <= 0 || level > 99999)) { setError("Level must be a positive whole number."); setSaving(false); return; }
    const supabase = getSupabaseBrowserClient(); const { data: auth } = await supabase.auth.getUser(); if (!auth.user) { router.push("/login?next=/sell"); return; }
    let imageUrl = listing?.image_url || null;
    if (image) { const path = `${auth.user.id}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`; const upload = await supabase.storage.from("listing-images").upload(path, image); if (upload.error) { setError(`Image upload failed: ${upload.error.message}`); setSaving(false); return; } imageUrl = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl; }
    const values = { game: form.get("game"), title: String(form.get("title")).trim(), price_usdc: price, rank: String(form.get("rank") || "").trim() || null, level, items: String(form.get("items") || "").split(",").map(x => x.trim()).filter(Boolean), description: String(form.get("description")).trim(), image_url: imageUrl, status: form.get("status") || "active" };
    const result = mode === "edit" && listing ? await supabase.from("listings").update(values).eq("id", listing.id).eq("seller_id", auth.user.id) : await supabase.from("listings").insert({ ...values, seller_id: auth.user.id });
    if (result.error) setError(result.error.message); else { setMessage(mode === "edit" ? "Listing updated." : "Listing published."); setTimeout(() => router.push("/dashboard"), 500); }
    setSaving(false);
  }
  return <form onSubmit={submit} className="mt-10 space-y-7 rounded-2xl border border-line bg-panel p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label>Game<select name="game" required defaultValue={listing?.game || ""} className="field"><option value="">Select a game</option>{games.filter(x => x !== "All games").map(x => <option key={x}>{x}</option>)}</select></label><label>Price (USDC)<input name="price" required min="0.01" step="0.01" type="number" defaultValue={listing?.price_usdc || ""} className="field"/></label></div><label>Account title<input name="title" required maxLength={120} defaultValue={listing?.title || ""} placeholder="e.g. Radiant account · rare skins" className="field"/></label><div className="grid gap-5 sm:grid-cols-2"><label>Rank<input name="rank" defaultValue={listing?.rank || ""} className="field"/></label><label>Level<input name="level" min="1" max="99999" type="number" defaultValue={listing?.level || ""} className="field"/></label></div><label>Items / skins<input name="items" defaultValue={listing?.items?.join(", ") || ""} placeholder="Elderflame Vandal, Reaver Knife..." className="field"/></label><label>Description<textarea name="description" required maxLength={2000} rows={5} defaultValue={listing?.description || ""} placeholder="Tell buyers what makes this account special..." className="field resize-none"/></label>{mode === "edit" && <label>Status<select name="status" defaultValue={listing?.status || "active"} className="field"><option value="active">Active</option><option value="sold">Sold</option><option value="draft">Draft</option></select></label>}<label>Listing image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseImage(e.target.files?.[0])} className="field file:mr-4 file:rounded-full file:border-0 file:bg-electric file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink"/>{preview ? <img src={preview} alt="Selected listing preview" className="mt-4 h-44 w-full rounded-xl object-cover"/> : <span className="mt-3 block rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">No image selected — a placeholder will be used.</span>}</label>{error && <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">{error}</p>}{message && <p className="rounded-xl border border-electric/30 bg-electric/5 p-4 text-sm text-electric">{message}</p>}<Button disabled={saving} className="w-full">{saving ? "Saving..." : mode === "edit" ? "Save changes" : "Publish listing"}</Button></form>;
}
