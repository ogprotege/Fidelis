/** The Today in Church History layer (feature: the memory of the just). Text is
 *  drawn from public-domain sources and never AI-paraphrased (design spec §13);
 *  each event carries its footnote sources and a `verified` flag (the §3.4
 *  ledger). Keyed by "MM-DD"; a date may hold several events across years. */

export interface HistorySource {
  text: string;
  /** "public-domain" for the primary source(s); "church-official" for an official
   *  Church source (e.g. vatican.va) for a modern event with no public-domain
   *  account; "reference" for notes. The build gate requires at least one
   *  "public-domain" OR "church-official" source. */
  license: string;
  url?: string;
}

import { nameTokens } from "./saints";

export interface HistoryEvent {
  id: string;
  day: string; // "MM-DD"
  year: number;
  title: string;
  shortBlurb: string;
  body: string[];
  sources: HistorySource[];
  verified: boolean;
}

export interface HistoryDay {
  day: string;
  events: HistoryEvent[];
}

/** The card's lead event (the same-subject de-dup): the first event NOT about
 *  the day's own saint, so the "In Church History" line never restates the
 *  Saint of the Day lead above it — an event whose title shares a distinctive
 *  name-token with the saint is the same subject. Falls back to the first
 *  (oldest) event when every event is about the saint: the pairing is then
 *  deliberate, and the event's own prose must add what the saint's entry does
 *  not. Pure; the list order (oldest-first) is the build's. */
export function leadHistoryEvent(
  events: HistoryEvent[],
  saintName: string | null | undefined
): HistoryEvent | null {
  if (events.length === 0) return null;
  if (!saintName) return events[0];
  const tokens = nameTokens(saintName);
  if (tokens.length === 0) return events[0];
  return (
    events.find((e) => {
      const title = new Set(nameTokens(e.title));
      return !tokens.some((t) => title.has(t));
    }) ?? events[0]
  );
}
