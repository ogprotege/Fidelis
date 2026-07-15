/** The Today in Church History layer (feature: the memory of the just). Text is
 *  drawn from public-domain sources and never AI-paraphrased (design spec §13);
 *  each event carries its footnote sources and a `verified` flag (the §3.4
 *  ledger). Keyed by "MM-DD"; a date may hold several events across years. */

export interface HistorySource {
  text: string;
  license: string;
  url?: string;
}

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
