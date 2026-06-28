/**
 * Spec §5 (text tier) — the pure logic behind the inline catechism sheet.
 * No Catechism text lives here, only the precedence rule and the edition picker.
 *
 * pickTier resolves the sheet's PRIMARY content top-down (design spec §2):
 *   imported personal CCC (with cited ¶)  →  bundled Trent  →  vatican.va links.
 * In P1 there is no import path yet, so the sheet always passes `imported: false`
 * and the result is "trent" (or "links" if Trent failed to load). The "imported"
 * branch is the P2 seam, kept here so the resolver never has to change.
 */
import type { TrentFile, TrentEdition } from "./data";

/** Every Trent edition Fidelis can name. Only the *bundled* ones appear in
 *  TRENT_EDITIONS; "donovan" stays in the union as the seam for a future second
 *  edition (so isTrentEdition accepts a Donovan value if one is ever shipped). */
export type TrentEditionId = "donovan" | "mchughCallan";

/** The bundled Trent editions, in display order. Today only the modern-English
 *  McHugh-Callan 1923 (US-PD) ships; Donovan 1829 is a planned future addition. */
export const TRENT_EDITIONS: { id: TrentEditionId; label: string }[] = [
  { id: "mchughCallan", label: "McHugh-Callan (1923)" }
];

export const DEFAULT_TRENT_EDITION: TrentEditionId = "mchughCallan";

export function isTrentEdition(v: unknown): v is TrentEditionId {
  return v === "donovan" || v === "mchughCallan";
}

export type CatechismTier = "imported" | "trent" | "links";

/** The §2 precedence chain. `imported` is the P2 supersede tier (false in P1). */
export function pickTier(args: { imported: boolean; hasParas: boolean; trent: boolean }): CatechismTier {
  if (args.imported && args.hasParas) return "imported";
  if (args.trent) return "trent";
  return "links";
}

/** The preferred bundled edition, else the default, else any present, else null. */
export function pickEdition(file: TrentFile, pref: TrentEditionId): TrentEdition | null {
  return (
    file.editions[pref] ??
    file.editions[DEFAULT_TRENT_EDITION] ??
    Object.values(file.editions)[0] ??
    null
  );
}
