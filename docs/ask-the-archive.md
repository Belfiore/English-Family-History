# Stuart on this site

Stuart, the family archivist, answers questions about the FitzMaurice and Andrews families from the records on this site, and shows where each fact comes from: on his own page, `ask.html`, and from the Ask Stuart button on every other page. Everything runs in the visitor's browser; nothing a visitor types leaves the page.

How Stuart works (reading questions, the genealogy engine, the tools, the index, privacy and security, the button) is now part of the shared engine and documented there: `docs/stuart.md` in [Belfiore/family-site-engine](https://github.com/Belfiore/family-site-engine). This note keeps what is particular to this site.

## This site's settings

In `site.config.json`, under `stuart`:

- **The anchors**: Grandpa Ron (`ronald-andrews`, the left-hand side of the tree) and Grandma Pat (`patricia-andrews`, the right-hand side). Stuart describes people by them ("Grandma Pat and Grandpa Ron's daughter") and lists their descendants first in the name finder.
- **The story pages** Stuart reads, in reading order: the home page, branches, Falcke, Reg's sisters, Bennett, Andrews roots, cousins, Ron in Egypt, the wedding and the sources page. A new story page needs adding to `stuart.pages`, and its headings need `id`s so answers can link to them.
- **Left out**: the switched-off Family Crest page and the classic family tree (not in `stuart.pages`), and the Orkney and King James II line (`tree.hiddenRegions`), except Cecil FitzMaurice, who stays as the tree's suspected relative.
- **Starter questions, the help example, the overview and the photographs answer** are in the same block.

Living family members are answered like anyone else, from whatever their record in `data/people.json` holds. Their records hold no dates or places at present, so Stuart says the records do not give them.

## Testing

`node tests/verify-archive.js` checks Stuart against the built site: the index the build made; the genealogy engine on made-up families and on the real tree (it agrees with the family tree's own relationship labels on every pair of people); the 177 questions in `tests/archive-eval.json`; and, in a browser, his page, the button, the window and drawer on the story pages, phones, and the navigation bar on every page. `QUICK=1` runs the Node checks only; `SHOTS=1` writes screenshots to `tests/screenshots/`. The latest benchmark result is written to `docs/ask-the-archive-eval.json`.

`tests/archive-eval.html` runs the same 177 questions in a browser, from the built site.

## Evaluation report

Each question in `tests/archive-eval.json` says what a correct answer must contain, what it must not say, the kind of answer, and whether it should say the records cannot answer. Every citation must point to a listed source with a working link.

Most of the 177 measure questions the code was fixed against, so the useful numbers are the first-run results of the later rounds. After the first 76 questions, written alongside the code, three more rounds were written without looking at the code's patterns, asked once, judged by hand against the data, and only then fixed:

| Round | Questions | Right first time | Partly right | Wrong |
| --- | --- | --- | --- | --- |
| 2 | 46 | 21 (46%) | 9 | 16 |
| 3 | 30 | 13 (43%) | 6 | 11 |
| 4 | 25 | 16 (64%) | 3 | 6 |

Round 4 is the best estimate of how Stuart handles a question nobody has tried before: about two in three right, one in eight partly, one in four wrong. Most failures were a question read as the wrong kind, not wrong facts. The serious ones, all fixed:

- "Tell me about Grandpa Ron's time in Egypt" was answered "The records do not show Ronald Andrews in Egypt" because the structured records hold no Egyptian address. Tools that look for something in the structured records now fall back to the story passages first.
- "Did anyone fight at the Somme?" was read as a question about the surname Knight. Spelling corrections now need a plausible name position.
- "Who married at St Mary's, Battersea?" asked which Mary was meant.

When the rule that showed living people by name and relationship only was removed (engine 1.0.0), the one question that expected it ("When was Sebastian Belfiore born?") was changed to expect that the records do not give a birth.

## Accessibility

Target: WCAG 2.2 AA. Checked with axe-core 4.14 on Stuart's page (the introduction, the name finder open, several answers with sources open and a choice between people), the window and the drawer on two story pages, and the full-screen panel on a 320-pixel phone. Stuart's own parts had no violations. The remaining findings belong to the pages around him and predate him: the gold title above each story page's heading (3.1:1 against the cream background), no `main` landmark on the home page and story pages, and a second banner landmark on the home page.

Not checked: real screen readers (VoiceOver, NVDA, TalkBack) and voice control.

## When records change

Edit `data/*.json` or a story page and push. The build makes a new index for Stuart every time, so there is nothing to rebuild or commit by hand. To try it first, build locally (see the README) and run `node tests/verify-archive.js`.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| A new family member is missing from the name finder | Not marked `isLiving`, or not on the tree | Add them to `data/people.json` with `isLiving: true` |
| An answer reads the question wrongly | No pattern for that wording | Add the question to `tests/archive-eval.json`, then change the engine (`docs/stuart.md` there) |
| Stuart does not know a new page | Not in `stuart.pages` | Add it, with `id`s on its headings |
| Stuart's button covers a control on a page | The control is not in that page's `avoid` list | Add it under `widget.pages` in `site.config.json` |
