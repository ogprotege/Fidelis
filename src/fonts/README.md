# Bundled fonts

## EB Garamond — the Scripture face (spec §1.4)

Four woff2 files, the SIL Open Font License 1.1 face used for Scripture text
(Reader, Mass readings, the verse of the day, and the Settings preview). It
renders the Vulgate's æ and œ ligatures the way a printed Bible does.

| File | Subset | Style | Bytes |
| --- | --- | --- | --- |
| `eb-garamond-latin-400-normal.woff2` | latin | regular | 21,704 |
| `eb-garamond-latin-400-italic.woff2` | latin | italic | 22,172 |
| `eb-garamond-latin-ext-400-normal.woff2` | latin-ext | regular | 57,272 |
| `eb-garamond-latin-ext-400-italic.woff2` | latin-ext | italic | 45,940 |

Total: **147,088 bytes (≈144 KB)**. Weight 400 only (body + emphasis); no
red-letter weights — printing the Lord's words in red is refused (spec §1.4,
§13.7). The `latin` subset already covers æ (U+00E6) and œ (U+0152–0153); the
`latin-ext` subset adds the rest of extended Latin per the spec.

`@font-face` declarations, the matching `unicode-range`s, and `font-display:
swap` live in `src/styles.css`. The files are referenced from there so Vite
fingerprints and emits them under `dist/assets/`; the service worker
(`public/sw.js`) precaches them with the shell so the face survives offline.

### Provenance (pinned, like the corpus)

- Repackaged from **`@fontsource/eb-garamond@5.2.7`** (npm), which mirrors the
  Google Fonts woff2 subsets byte-for-byte.
  Tarball SHA-1 `68bd97f7a9b456815df6d48ae97da3aefc40b432`.
- Upstream: **The EB Garamond Project Authors**,
  <https://github.com/octaviopardo/EBGaramond12>, Copyright 2017.
- License: **SIL Open Font License, Version 1.1** — see `OFL.txt` in this
  folder. The font is bundled, not sold separately, and its reserved name is
  unchanged, so the OFL terms are met.

To refresh: `npm pack @fontsource/eb-garamond@<version>`, copy the four
`files/eb-garamond-{latin,latin-ext}-400-{normal,italic}.woff2` and `LICENSE`
(as `OFL.txt`) here, and update this table and the SHA-1.
