# TIPS scouting form — visual QA

Final result: passed

Source of truth: `/Users/vaduvageorge/Downloads/MWOS TIPS Scouting Report 2027.pdf` (page 1), plus the client's screenshot attached on 2026-09-24. The original PDF and editable component were compared side by side in the in-app browser at 1280 × 1000; the implementation was also inspected at 390 × 844.

The previous form repeated a large Score/Notes card for every attribute, making the TIPS evaluation disproportionately long. The updated form uses the PDF's compact two-column T/I/P/S matrix on desktop, a single readable column on mobile, one header per table, subtle blue grid lines, section badges and subtitles, and a navy club banner. It preserves 44 px editing controls, score range 1–10, free-text notes, metadata, and a manually chosen overall assessment. The paper form's small writing boxes and saturated assessment blocks were intentionally adapted for keyboard/touch use.

Checks: no horizontal overflow at 390 px; score and note editing works; assessment radio selection works; existing report save route is unchanged. `npm run verify` passed: 301 tests, migration verification, TypeScript, and production build.

No remaining blocking visual issue was found in the tested viewports. Production verification is tracked separately in the release handoff.

## 2026-09-24 — stadium artwork in both TIPS headers

Source visual truth: `/Users/vaduvageorge/Downloads/ChatGPT Image 22 mai 2026, 14_33_23.png` (1672 × 941 px) and the two user screenshots of the existing headers. Implementation: the rendered `/scouting/individual/new` header classes (`mwos-tips-hero-page` and `mwos-tips-hero-report`), captured inline in the Codex in-app browser from the local preview; the browser integration did not persist screenshot files. The source image and rendered implementation were placed side by side in one browser comparison at a 1440 × 900 CSS viewport. Focused captures covered 768 × 900 and 390 × 844 CSS viewports at 1× density, with no density normalization needed.

First comparison finding [P1]: the bright central crest sat beneath the page description and the report title at tablet width. Fix: restrict the page description to the left column, darken the image while keeping text fully opaque, and enlarge/anchor the artwork to the left below 1024 px so the crest moves right. Post-fix captures at desktop, tablet and mobile show readable text, intact headings and button, and no horizontal overflow (390 px document width at 390 px viewport).

Fidelity check: existing Lato and serif heading fonts, text sizes, spacing, and copy were retained; the club artwork is a compressed 1672 × 941 JPEG from the supplied image (445 KB versus the 2.1 MB PNG), with no replacement illustration. Image opacity is 0.40/0.36 for the page/report headers on desktop and 0.30 on mobile over a solid dark-blue base. A conservative contrast calculation against a hypothetical white pixel in the artwork gives at least 4.74:1 for the page's 95%-white small text, 5.10:1 for the report's 90%-white subtitle, and 6.23:1 on mobile. Focus and semantics are unchanged. `npm run verify` passed (301 tests, migrations, TypeScript, build). The temporary preview produced one hot-reload-only duplicate-root console message; no production code uses that preview entry.

No P0/P1/P2 findings remain. Production browser verification follows the deployment.

final result: passed
