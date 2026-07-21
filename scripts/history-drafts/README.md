# History fact-check ledger

[← Docs index](../../docs/INDEX.md)

Proof-read audit trail for the v1.23.0 full-year chronicle expansion
("remember the days of old"). These reports are **not** runtime data and are
**not** wired into any build script — they record the four quarterly
fact-check passes over the 229 new events (208 clean / 20 corrected /
1 hedged).

| File | Months | Events |
|------|--------|--------|
| `factcheck-report-q1.json` | Jan–Mar | 59 |
| `factcheck-report-q2.json` | Apr–Jun | 54 |
| `factcheck-report-q3.json` | Jul–Sep | 57 |
| `factcheck-report-q4.json` | Oct–Dec | 59 |

The live corpus is `scripts/history.corpus.json`. Edit that file, then run
`npm run history` to regenerate `public/data/history/` and reseal the
manifest. See [CONTRIBUTING.md](../../CONTRIBUTING.md#editing-saints--church-history).
