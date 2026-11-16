# Etleq design direction

Owner of record for visual decisions. Filtered through the antislop rulebook
(github.com/miqdadbadjuber/anti-slop): every decorative choice below has a one-line reason.

## Identity: ignition at dusk, and the report on the desk

The brief's identity (section 6) is "ignition at dusk": deep ink night, warm sand, one ignition orange.
The owner later asked for a simple dark site. Both hold: the page is ink night, and the one recurring
object is **the audit report**, printed on sand paper, sitting on the dark desk.

The product is a report, so the report is the motif. Anywhere the site shows what an audit produces
(scorecard, sample findings, report preview), it renders as a sand "sheet" with mono layer numbers
`01`–`15` and severity marks. Nothing else uses the paper surface, so it stays meaningful.

## Dials

| Dial   | Value | Reason                                                                                                                               |
| ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ENERGY | 2     | Confident display type and one bright accent; no glow, no gradients.                                                                 |
| RHYTHM | 2     | Sequence, paper sheet, quote block and split FAQ each take a different shape, so the page does not repeat heading + grid + hairline. |
| MOTION | 1     | The hero walkthrough is the only motion. Sections no longer fade in (headings sat grey mid-fade).                                    |

## Color

| Token                           | Value                  | Use                                                                     |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `--ink-0`                       | `#0B0F14`              | Page background (brief ink-950).                                        |
| `--ink-1`                       | `#121821`              | Raised surfaces: header, cards, dialog.                                 |
| `--ink-2`                       | `#1C2430`              | Inputs, hover fills (brief ink-800).                                    |
| `--line`                        | `#273140`              | Dividers.                                                               |
| `--line-strong`                 | `#5F6B7C`              | Control borders (3.5:1 on ink-0, meets non-text contrast).              |
| `--fg`                          | `#F3EEE6`              | Primary text (brief sand-100).                                          |
| `--fg-2`                        | `#C4BCB0`              | Secondary text.                                                         |
| `--fg-3`                        | `#968F85`              | Tertiary text and captions (still AA on ink-0).                         |
| `--accent`                      | `#FF5A1F`              | Ignition: primary buttons, focus, the H1 second line. One accent only.  |
| `--paper`                       | `#F3EEE6`              | The report sheet.                                                       |
| `--paper-ink` / `--paper-muted` | `#0B0F14` / `#5E584F`  | Text on paper.                                                          |
| severity                        | pass / warn / critical | Green, amber, red, each with an ink and a paper variant that passes AA. |

The previous olive-green tints were off-brief and are removed.

## Type

- Headings: Alexandria (brief display face, Arabic and Latin). Previously overridden to the body face, which erased the brand.
- Body: IBM Plex Sans / IBM Plex Sans Arabic. Data, prices, layer numbers: IBM Plex Mono.
- Never letter-space Arabic. Minimum 12px for page text; 10px only inside the hero miniature app; 16px for inputs.

## Removed (antislop findings)

- Mono uppercase kicker above every heading (R-09 badge): kept only where it labels the report.
- Arrow glyph on every link and button (R-08): links are underlined instead.
- Gradient-filled heading text and radial glow behind the hero (R-01, R-13).
- Three identical numbered feature cards (R-14): the process is now an ordered sequence.
- Em dashes in button labels (R-02).
- Hover lift on cards and buttons (R-19, no purpose).
- Native FAQ triangles; lowercase social names; unlabeled footer columns.

## Shape

- One radius scale: 6px controls, 10px panels, 4px tags.
- One shadow, used only on the paper sheet (it sits on the desk).
