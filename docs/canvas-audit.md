# Family canvas audit

November 2026. This file records what the rebuild of the family tree found, what it changed, and what is still open. It goes with:

- `data/people.json` (60 people), the only source of people data for the canvas, the side panel and the full profiles
- `data/sources.json` (59 sources)
- `family-tree.html`, `tree-canvas.css` and `tree-canvas.js` (the new canvas, ported from the Belfiore & Circelli site)
- `tests/verify-canvas.js` (automated checks) and `tests/screenshots/` (the screenshots taken at 1440, 1024 and 390 pixels)
- `family-tree-classic.html` (the previous family tree page, kept unchanged apart from a banner and four corrections)

Confidence words used here and on the site:

- **confirmed**: stated in a record that has been read for this revision
- **probable**: the best reading of the evidence, but not stated outright in a record
- **family tradition**: what the family says, with no document yet
- **unverified**: on earlier versions of the site, with no source recorded

## 0. What was read

- Pages: `index.html`, `family-crest.html`, `wedding.html`, `ron-egypt.html`, and the old `family-tree.html` (now `family-tree-classic.html`), including all the data embedded in its script (`PEOPLE`, `PHOTOS`, `RELATIONSHIPS`, `HISTORICAL_PORTRAITS`, `SOURCES`)
- Scripts and styles: `script.js`, `styles.css`
- Documents: `claude_code_handoff_brief_v2.md` and `fitzmaurice_family_genealogy_report (1).pdf` (the 2026 photo analysis, cited here as `genealogy-report`)
- Every image in `photos/`, `photos/portraits/`, `photos/heraldry/` and `photos/ron-egypt/`. The wedding album spreads, the photo labels, the newspaper cuttings and Ron's album pages were read from the photographs for this revision.
- What Sebastian and Amanda have said about the family in earlier conversations (cited as `family-account`)
- Published records found for this revision: the London Gazette of 23 April 1890, thepeerage.com, Wikipedia, the Metropolitan Museum of Art, the National Trust for Scotland, Encyclopaedia Britannica and the London Museum

Gaps in the inputs:

- There are **no civil records** in the collection: no birth, marriage or death certificates, no census pages, no service records. Almost every date for the FitzMaurice and Andrews families is therefore unverified or estimated.
- Ron's album is photographed in eight pages, `IMG_2650` to `IMG_2658`. There is no `IMG_2656`, so one page may be missing.
- `photos/IMG_8844.jpeg` is completely black. It is not used.
- A few web pages could not be opened directly in this session. Where that happened, the fact was taken only from a page that could be read, and otherwise left out.

## A. Person inventory

"Old tree" is what `family-tree-classic.html` showed (birth to death). "Named on pages" is an automated name match across the five content pages, so treat it as approximate. "Sources cited" counts distinct sources behind the profile's dates, facts, timeline and story, not counting general historical context. "Profile" is the length of the written story: thin is under about 500 characters, full is over about 1,400.

Living people are shown with name and relationship only. For them the table says only whether the old tree showed a birth year, without repeating it. None is shown on the new canvas.

"Where" is the part of the canvas the person sits in. **Family** is Sebastian's proven family. **Kin frame** is the dashed group beside Edward Dixon FitzMaurice for people whose place in the family is not known. **Orkney line** marks the Hamiltons and the Earls of Orkney, who connect to the family only through the disputed step from Henry Warrender to Edward Dixon (see B1). In the first version they were drawn in a separate frame; they are now joined to the tree by a dashed line marked "Disputed link".

| Person | id | Where | Old tree (family-tree-classic.html) | Named on pages | Now shown | Sources cited | Media | Confidence | Profile |
|---|---|---|---|---|---|---|---|---|---|
| Edward Dixon FitzMaurice | edward-dixon-fitzmaurice | family | c.1850 to unknown | index, crest, classic | ? to ? | 8 | 4 | confirmed | full |
| Edith Madeleine FitzMaurice | edith-madeleine-fitzmaurice | kin frame | c.1875 to unknown | index, classic | ~1875? to ? | 5 | 4 | confirmed | moderate |
| Woman and girl, Camden Town | camden-town-portrait | kin frame | c.1865 to 1878 | none | ? to ? | 3 | 3 | unverified | moderate |
| Reg FitzMaurice | reg-fitzmaurice | family | c.1897 to after 1950 | index, classic | ~1897? to after 1950 | 8 | 7 | confirmed | moderate |
| Mrs R. FitzMaurice | mrs-r-fitzmaurice | family | not on old tree | none | ? to bef. 1950 | 2 | 1 | confirmed | thin |
| Bob FitzMaurice | bob-fitzmaurice | family | c.1900 to unknown | classic | ~1900? to ? | 5 | 2 | confirmed | thin |
| Babs FitzMaurice | babs-fitzmaurice | family | c.1895 to unknown | none | ~1895? to ? | 7 | 4 | probable | moderate |
| Mr H. G. Andrews | mr-hg-andrews | family | c.1890 to c.1940 to 1944 | none | ~1890? to WWII | 4 | 3 | confirmed | moderate |
| Mrs H. G. Andrews | mrs-hg-andrews | family | c.1890 to c.1940 to 1944 | none | ? to WWII | 4 | 2 | confirmed | thin |
| Herbert Andrews | herbert-andrews | family | c.1918 to unknown | classic | ~1918? to ? | 4 | 2 | confirmed | moderate |
| Sidney Andrews | sidney-andrews | family | c.1922 to c.1940 to 1944 | classic | ~1922? to WWII | 3 | 1 | family tradition | thin |
| Ronald Andrews | ronald-andrews | family | c.1920 to unknown | index, ron-egypt, classic | ? to ? | 7 | 13 | confirmed | full |
| Patricia Andrews | patricia-andrews | family | c.1920 to unknown | ron-egypt, classic | ? to ? | 4 | 10 | confirmed | full |
| Amanda Andrews Belfiore | amanda-belfiore | family | showed a birth year | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Robert Belfiore | robert-belfiore | family | no dates | classic | living (dates withheld) | 2 | 0 | confirmed | thin |
| Venetia Andrews Austin | venetia-austin | family | showed a birth year | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Gary Austin | gary-austin | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Sebastian Belfiore | sebastian-belfiore | family | showed a birth year | classic | living (dates withheld) | 2 | 0 | confirmed | thin |
| Valeria Belfiore | valeria-belfiore | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Alex Belfiore | alex-belfiore | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Lauren Belfiore | lauren-belfiore | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Max Austin | max-austin | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Lizzie Eley | lizzie-eley | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Ben Austin | ben-austin | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Mollie Wells | mollie-wells | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Enzo Belfiore | enzo-belfiore | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| Violet Belfiore | violet-belfiore | family | no dates | classic | living (dates withheld) | 1 | 0 | confirmed | thin |
| James II of Scotland | james-ii | Orkney line | 1430 to 1460 | index, crest, classic | 1430 to 1460 | 4 | 3 | confirmed | moderate |
| Mary Stewart | mary-stewart | Orkney line | c.1433 to 1465 | index, crest, classic | 1453 to 1488 | 5 | 1 | confirmed | moderate |
| James, 1st Lord Hamilton | james-hamilton-1st-lord | Orkney line | c.1415 to 1479 | index, crest, classic | ~1415 to 1479 | 4 | 1 | confirmed | moderate |
| James Hamilton, 1st Earl of Arran | arran-1 | Orkney line | c.1477 to 1529 | index, crest, classic | ~1475 to 1529 | 5 | 0 | confirmed | moderate |
| James Hamilton, Duke of Châtellerault | chatellerault | Orkney line | inside the "Hamilton Succession" group card (c.1530 to 1630) | index, crest, classic | ~1516 to 1575 | 4 | 0 | confirmed | moderate |
| John Hamilton, 1st Marquess of Hamilton | marquess-1 | Orkney line | inside the "Hamilton Succession" group card (c.1530 to 1630) | crest, classic | ~1540 to 1604 | 4 | 0 | confirmed | moderate |
| James Hamilton, 2nd Marquess of Hamilton | marquess-2 | Orkney line | inside the "Hamilton Succession" group card (c.1530 to 1630) | index, crest, classic | 1589 to 1625 | 4 | 0 | confirmed | moderate |
| James Hamilton, 1st Duke of Hamilton | duke-1 | Orkney line | inside the "Hamilton Succession" group card (c.1530 to 1630) | index, crest, classic | 1606 to 1649 | 4 | 3 | confirmed | moderate |
| Anne, 3rd Duchess of Hamilton | anne-duchess | Orkney line | 1631 to 1716 | crest, classic | 1632 to 1716 | 6 | 1 | confirmed | moderate |
| William Douglas, Duke of Hamilton | william-douglas | Orkney line | not on old tree | crest, classic | 1634 to 1694 | 5 | 0 | confirmed | moderate |
| George Hamilton, 1st Earl of Orkney | george-orkney | Orkney line | 1666 to 1737 | index, crest, classic | 1666 to 1737 | 4 | 5 | confirmed | moderate |
| Elizabeth Villiers, Countess of Orkney | elizabeth-villiers | Orkney line | c.1657 to 1733 | index, crest, classic | ~1657 to 1733 | 5 | 2 | confirmed | moderate |
| Anne O'Brien, 2nd Countess of Orkney | anne-countess | Orkney line | d. 1756 | crest, classic | 1696 to 1756 | 5 | 0 | confirmed | moderate |
| William O'Brien, 4th Earl of Inchiquin | william-obrien-inchiquin | Orkney line | not on old tree | classic | ~1700 to 1777 | 4 | 0 | confirmed | moderate |
| Mary O'Brien, 3rd Countess of Orkney | mary-3rd | Orkney line | inside the "O'Brien to FitzMaurice succession" group card (c.1756 to 1831) | crest, classic | ~1721 to 1791 | 4 | 0 | confirmed | moderate |
| John Petty, 1st Earl of Shelburne | john-petty-shelburne | Orkney line | not on old tree | classic | 1706 to 1761 | 5 | 0 | confirmed | moderate |
| Mary FitzMaurice, 4th Countess of Orkney | mary-4th | Orkney line | inside the "O'Brien to FitzMaurice succession" group card (c.1756 to 1831) | ron-egypt, classic | 1755 to 1831 | 6 | 0 | confirmed | moderate |
| Thomas FitzMaurice | thomas-fitzmaurice-mp | Orkney line | inside the "O'Brien to FitzMaurice succession" group card (c.1756 to 1831) | crest, classic | 1742 to 1793 | 5 | 0 | confirmed | moderate |
| William Petty, Lord Shelburne | lansdowne | Orkney line | 1737 to 1805 | index, classic | 1737 to 1805 | 5 | 2 | confirmed | moderate |
| John FitzMaurice, Viscount Kirkwall | kirkwall | Orkney line | inside the "O'Brien to FitzMaurice succession" group card (c.1756 to 1831) | none | 1778 to 1820 | 4 | 0 | confirmed | moderate |
| Thomas FitzMaurice, 5th Earl of Orkney | earl-5 | Orkney line | 1803 to 1877 | crest, classic | 1803 to 1877 | 5 | 1 | confirmed | moderate |
| George FitzMaurice, 6th Earl of Orkney | george-6th | Orkney line | not on old tree | classic | 1827 to 1889 | 3 | 1 | confirmed | moderate |
| Henry Warrender FitzMaurice | henry-warrender | Orkney line | 1828 to 1875 | index, crest, classic | 1828 to 1875 | 4 | 0 | confirmed | moderate |
| Frederick O'Bryen FitzMaurice | frederick-obryen | Orkney line | not on old tree | none | 1830 to 1867 | 4 | 0 | confirmed | moderate |
| Edmond FitzMaurice, 7th Earl of Orkney | edmond-7th | Orkney line | 1867 to 1951 | index | 1867 to 1951 | 8 | 3 | confirmed | full |
| Connie Gilchrist, Countess of Orkney | connie | Orkney line | 1865 to 1946 | index, crest, classic | 1865 to 1946 | 5 | 9 | confirmed | moderate |
| Lady Mary Gosling | lady-mary-fitzmaurice | Orkney line | not on old tree | none | 1903 to 1950 | 6 | 0 | confirmed | moderate |
| Douglas Commerel Menzies FitzMaurice | douglas-commerel-menzies | Orkney line | not on old tree | none | 1861 to ? | 4 | 0 | confirmed | moderate |
| Douglas Frederick Harold FitzMaurice | douglas-frederick-harold | Orkney line | not on old tree | none | 1890 to 1937 | 4 | 0 | confirmed | moderate |
| Dorothy FitzMaurice | dorothy-dickie | Orkney line | not on old tree | none | ? to ? | 4 | 0 | confirmed | moderate |
| Douglas Hubert FitzMaurice | douglas-hubert | Orkney line | not on old tree | none | 1916 to 1942 | 3 | 0 | confirmed | moderate |
| Cecil FitzMaurice, 8th Earl of Orkney | cecil-8th | Orkney line | 1919 to 1998 | none | 1919 to 1998 | 9 | 3 | confirmed | full |
| Rose FitzMaurice, Countess of Orkney | rose-silley | Orkney line | not on old tree | none | ? to 1995 | 4 | 1 | confirmed | moderate |

### Media and who it is attached to

Large files have a reduced copy in `photos/view/` for the viewer; the "Open original" link in the viewer still opens the full file. Thumbnails are in `photos/thumbs/`.

| File | What it is | Source id | Shown on |
|---|---|---|---|
| `photos/babs-and-edward-with-boys.jpg` | Left: a girl on a verandah, "Eil..." written on the front. Right: a clergyman with two boys on a shingle beach | beach-snapshots | Edward Dixon FitzMaurice, Reg FitzMaurice, Bob FitzMaurice, Babs FitzMaurice |
| `photos/photo-backs-labeled.jpg` | The backs of two snapshots: "Auntie Babs, South Africa" and "Reg, Bob and their Father Edward Dixon Fitzmaurice" | photo-labels | Edward Dixon FitzMaurice, Reg FitzMaurice, Bob FitzMaurice, Babs FitzMaurice |
| `photos/edward-dixon-stuart-studio.jpg` | Cabinet card of a clergyman by Stuart, 47 and 49 Brompton Road, Knightsbridge: probably Edward Dixon FitzMaurice | stuart-card | Edward Dixon FitzMaurice |
| `photos/stuart-brothers-studio.jpg` | Brompton Road, Knightsbridge, on a coloured postcard (the street of the Stuart studio) | stuart-postcard | Edward Dixon FitzMaurice |
| `photos/edith-medallion-front.jpg` | Circular portrait of a young woman with flowers, inscribed on the back "Edith Madeleine Fitzmaurice c.1899" | edith-medallion | Edith Madeleine FitzMaurice |
| `photos/edith-medallion-back.jpg` | The back of the circular portrait: "Edith Madeleine Fitzmaurice c.1899" | edith-medallion | Edith Madeleine FitzMaurice |
| `photos/edith-medallion-held-garden.jpg` | The circular portrait held up in a garden | edith-medallion | Edith Madeleine FitzMaurice |
| `photos/lang-sims-woman.jpg` | Cabinet card of a standing woman by Lang Sims, Brixton Road and Folkestone: possibly Edith | lang-sims-card | Edith Madeleine FitzMaurice |
| `photos/cdv-mother-child-front.jpg` | Carte de visite: a seated woman and a young girl, J. Perriman, Camden Town | perriman-cdv | Woman and girl, Camden Town |
| `photos/cdv-perriman-back-flat.jpg` | The back of the carte de visite: J. Perriman, Camden Town School of Photography, No. 925 | perriman-cdv | Woman and girl, Camden Town |
| `photos/cdv-perriman-back-held.jpg` | The back of the carte de visite, held in the hand | perriman-cdv | Woman and girl, Camden Town |
| `photos/wedding-album-cover-inscription.jpg` | Wedding album, title pages: "Ronald and Patricia" and the dedication naming both sets of parents | album-1950 | Reg FitzMaurice, Mrs R. FitzMaurice, Mr H. G. Andrews, Mrs H. G. Andrews, Ronald Andrews, Patricia Andrews |
| `photos/wedding-church-steps-couple.jpg` | Wedding album: what the bride wore, and "two noticeably happy people" | album-1950 | Reg FitzMaurice, Ronald Andrews, Patricia Andrews |
| `photos/wedding-group-named-captions.jpg` | Wedding album: the guests on the church steps, twice, with every name written underneath | album-1950 | Reg FitzMaurice, Babs FitzMaurice, Herbert Andrews, Patricia Andrews |
| `photos/reg-fitzmaurice-portrait.jpg` | Studio portrait of a young man in a bow tie. Captioned as Reg on earlier pages; unlabelled | young-man-portrait | Reg FitzMaurice |
| `photos/south-africa-house-and-young-man.jpg` | A house with a verandah in a garden, and a young man in a dark suit. Both unlabelled | sa-snapshots | Reg FitzMaurice, Babs FitzMaurice |
| `photos/andrews-family-sepia.jpg` | The Andrews family: four men seated on the grass, three people behind them | andrews-family-photo | Mr H. G. Andrews, Mrs H. G. Andrews, Herbert Andrews, Sidney Andrews, Ronald Andrews |
| `photos/andrews-family-color.jpeg` | The Andrews family photograph, colourised | andrews-family-photo | Mr H. G. Andrews |
| `photos/ronald-andrews-workshop.jpeg` | Ronald Andrews at an engine on a workbench, overalls marked "3ERS" (colourised) | ron-workshop | Ronald Andrews |
| `photos/ron-egypt/IMG_2654.JPEG` | Ron's album: his press card as Art Editor of the Tura Times, and the First Peace Edition | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2652.JPEG` | Ron's album: the Double Wasp and Twin Wasp engines in the caves at Tura | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2653.JPEG` | Ron's album: the Erection Section, the smallest and the largest engines | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2650.JPEG` | Ron's album: drawing Deanna Durbin, and a note about a comrade named Reg | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2651.JPEG` | Ron's album: "search for perfection it was only" | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2655.JPEG` | Ron's album: "My first camera", Johnnie's prize picture, and the Nile | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2657.JPEG` | Ron's album: early photographs of Cairo, the Anglican Cathedral and the Opera Cinema | ron-album | Ronald Andrews |
| `photos/ron-egypt/IMG_2658.JPEG` | Ron's album: Tutankhamun's mask and coffin, and the note that the treasures were "stored in our caves" | ron-album | Ronald Andrews |
| `photos/wedding-aisle-first-photo.jpg` | Wedding album: the first photograph, the couple walking down the aisle | album-1950 | Ronald Andrews, Patricia Andrews |
| `photos/wedding-group-closeup-print.jpg` | A larger print of the wedding group on the steps of St Mary's, Wanstead, 11 February 1950 | album-1950 | Patricia Andrews |
| `photos/wedding-reception-venue-cake.jpg` | Wedding album: the car, the Wanstead house of Mr and Mrs Jack Winter, and the cutting of the cake | album-1950 | Patricia Andrews |
| `photos/wedding-reception-toast.jpg` | Wedding album: "feeding the multitude", and the toast "drunk in Sherry" | album-1950 | Patricia Andrews |
| `photos/wedding-departure-confetti.jpg` | Wedding album: one more picture before the train, and confetti at the car | album-1950 | Patricia Andrews |
| `photos/wedding-honeymoon-departure.jpg` | Wedding album: "And so to Waterloo and a Bournemouth Honeymoon" | album-1950 | Patricia Andrews |
| `photos/ruby-wedding-invitation-and-photos.jpg` | Invitation to the ruby wedding dinner at The French Horn, Sonning, with two prints of the 1950 group | ruby-invitation | Patricia Andrews |
| `photos/portraits/james2.jpg` | James II of Scotland, from the 15th-century manuscript of Jörg von Ehingen | portrait-files | James II of Scotland |
| `photos/portraits/james2_painted.jpg` | James II of Scotland, a later painted portrait | portrait-files | James II of Scotland |
| `photos/portraits/mary_of_guelders.jpg` | Mary of Guelders, his queen | portrait-files | James II of Scotland, Mary Stewart |
| `photos/portraits/hamilton_palace.jpg` | Hamilton Palace, Lanarkshire, later the seat of the Dukes of Hamilton (demolished in the 1920s) | portrait-files | James, 1st Lord Hamilton, James Hamilton, 1st Duke of Hamilton |
| `photos/portraits/hamilton_duke_vandyck.jpg` | James Hamilton, 1st Duke of Hamilton, by Sir Anthony van Dyck (as captioned on earlier pages) | portrait-files | James Hamilton, 1st Duke of Hamilton |
| `photos/portraits/hamilton_duke_mytens.jpg` | James Hamilton, 1st Duke of Hamilton, by Daniel Mytens (as captioned on earlier pages) | portrait-files | James Hamilton, 1st Duke of Hamilton |
| `photos/portraits/anne_hamilton.jpg` | Anne, 3rd Duchess of Hamilton | portrait-files | Anne, 3rd Duchess of Hamilton |
| `photos/portraits/george_hamilton.jpg` | George Hamilton, 1st Earl of Orkney | portrait-files | George Hamilton, 1st Earl of Orkney |
| `photos/portraits/george_hamilton_orkney_painting.jpg` | George Hamilton, 1st Earl of Orkney, by Martin Maingaud (as captioned on earlier pages) | portrait-files | George Hamilton, 1st Earl of Orkney |
| `photos/portraits/george_hamilton_orkney_bust.jpg` | Bust of George Hamilton, 1st Earl of Orkney, by John Michael Rysbrack (as captioned on earlier pages) | portrait-files | George Hamilton, 1st Earl of Orkney |
| `photos/portraits/battle_blenheim.jpg` | The Battle of Blenheim, 1704 | portrait-files | George Hamilton, 1st Earl of Orkney |
| `photos/portraits/cliveden_house.jpg` | Cliveden House, Buckinghamshire, his country house | portrait-files | George Hamilton, 1st Earl of Orkney, Elizabeth Villiers, Countess of Orkney |
| `photos/portraits/elizabeth_villiers.jpg` | Elizabeth Villiers, Countess of Orkney | portrait-files | Elizabeth Villiers, Countess of Orkney |
| `photos/portraits/lansdowne.jpg` | William Petty, 1st Marquess of Lansdowne, by Jean-Laurent Mosnier (as captioned on earlier pages) | portrait-files | William Petty, Lord Shelburne |
| `photos/portraits/bowood_house.jpg` | Bowood House, Wiltshire, the Lansdowne family seat | portrait-files | William Petty, Lord Shelburne |
| `photos/portraits/5th_earl_orkney.jpg` | Thomas FitzMaurice, 5th Earl of Orkney (as captioned on earlier pages) | portrait-files | Thomas FitzMaurice, 5th Earl of Orkney |
| `photos/portraits/viscount_kirkwall.jpg` | Viscount Kirkwall, Captain, 71st Highlanders, in the Crimea: George, the future 6th Earl | portrait-files | George FitzMaurice, 6th Earl of Orkney |
| `photos/portraits/connie_edmond_wing_lodge.png` | Connie and Edmond at their country home (captioned on earlier pages as Wing Lodge) | portrait-files | Edmond FitzMaurice, 7th Earl of Orkney, Connie Gilchrist, Countess of Orkney |
| `photos/korea-news-clipping.jpg` | Evening News, 1951: "Earl from Korea left a fortune. He scrubbed decks" | korea-clipping | Edmond FitzMaurice, 7th Earl of Orkney, Cecil FitzMaurice, 8th Earl of Orkney |
| `photos/heraldry/7th_earl_crest.png` | Arms shown on earlier pages as those of the 7th Earl | portrait-files | Edmond FitzMaurice, 7th Earl of Orkney |
| `photos/portraits/connie_gilchrist.jpg` | Harmony in Yellow and Gold: The Gold Girl, Connie Gilchrist, by Whistler (Metropolitan Museum of Art) | met-gold-girl | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/leighton_music_lesson.jpg` | The Music Lesson (1877) by Frederic Leighton; Connie is the girl with the lute | wiki-connie | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/connie_elliott_fry.jpg` | Connie Gilchrist, studio photograph by Elliott and Fry (as captioned on earlier pages) | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/connie_stereoscopic.jpg` | Connie Gilchrist, London Stereoscopic Company (as captioned on earlier pages) | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/connie_nadar.jpg` | Connie Gilchrist, Nadar's studio (as captioned on earlier pages) | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/connie_skipping.jpg` | Connie Gilchrist with a skipping rope | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/connie_countess_portrait.jpg` | Connie Gilchrist as a child (an engraving; earlier pages caption it as her as Countess) | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/gaiety_theatre.jpg` | The Gaiety Theatre, London | portrait-files | Connie Gilchrist, Countess of Orkney |
| `photos/portraits/cecil_devonshire.jpg` | Cecil FitzMaurice on the quayside beside the troopship Devonshire (press photograph) | devonshire-photo | Cecil FitzMaurice, 8th Earl of Orkney |
| `photos/orkney-marries-clipping.jpg` | Evening News, 27 November (1953): "Earl of Orkney marries", with a photograph of the bride | marries-clipping | Cecil FitzMaurice, 8th Earl of Orkney, Rose FitzMaurice, Countess of Orkney |

### Things on earlier pages that were not carried into the canvas

None of these has a source in the collection. They are left on the pages where they are, and listed here so that nothing is lost.

- Ron "met Herbert in a market in Egypt". Where this story came from is not clear, so it is not used.
- Ron served with the "Desert Air Force" (classic tree). His press card puts him in No. 111 Maintenance Unit at Tura, which repaired engines; nothing links him to the Desert Air Force.
- Ron was in Egypt from 1942 to 1945 (classic tree). The album shows he was there at the end of the war in 1945; when he arrived is not recorded.
- Babs "emigrated to South Africa" and "returned to England for Patricia's wedding" (home page). The label says only "Auntie Babs, South Africa", and an "Auntie Babs" is in the 1950 group photographs. That she emigrated, and that the guest is the same woman, are both likely but not recorded.
- Edmond, 7th Earl, was known as "Lordy" in Stewkley and was chairman of the parish council (classic tree). Not checked.
- The Duke of Beaufort gave Connie away at her wedding (crest page and home page). Wikipedia describes the 8th Duke of Beaufort as her benefactor and adoptive father, which makes this plausible, but no account of the wedding was read.
- The Stuart studio "operated from this address from around 1888" (home page). Not checked.
- Edward Dixon's ministry was in West or South London (classic tree, from the Lang Sims and Hayes connections). This is a guess, and the Lang Sims card is not linked to him.

## B. Conflicts and errors

Each item gives what the sources say and a recommendation. Confidence is the confidence in the recommendation.

### B1. The link to the Earls of Orkney (the most important finding)

Earlier pages say Edward Dixon FitzMaurice was "almost certainly" a son of the Hon. Henry Warrender FitzMaurice, which would make him a brother of Edmond, 7th Earl of Orkney, and connect the family to the Earls of Orkney, the Dukes of Hamilton and James II of Scotland.

The records found for this revision contradict it:

- Henry Warrender FitzMaurice (7 July 1828 to 12 January 1875) married Sarah Jane Roose on 5 September 1861. The peerage lists four children: Henry George Hamilton (1863 to 1888), Edmond Walter (1867 to 1951), Isabella Emily (about 1868 to 1928) and Alexander (1874 to 1922). (`peerage-henry-warrender`)
- On 23 April 1890 the London Gazette (issue 26051, page 2823) printed a royal warrant giving the rank of an earl's children to the brother and sister of Edmond Walter, Earl of Orkney. It names only Alexander Edmond Fitzmaurice and Isabella Emily, wife of John Burnham Garrett, and calls Edmond the "eldest surviving son and heir". (`gazette-1890`)
- Edward Dixon was alive after 1890: the beach snapshot shows him with Reg and Bob as small boys, and the 2026 photo analysis dates it to about 1905 to 1920. Had he been a legitimate son of Henry Warrender, the warrant would have named him, and if older than Edmond he would have been Earl himself.

**Recommendation:** treat the Orkney link as unproven. The first version of the canvas showed the Orkney line in a separate frame with no line to the family. At Seb's request (12 November 2026) the link is now drawn: Henry Warrender FitzMaurice is shown as Edward Dixon's father, with a dashed line labelled "Disputed link" on the canvas, an "unverified" link in the data, and a note in the relationship finder on every relationship that runs through it (for example, James II is Sebastian's 17× great-grandfather, flagged as disputed). The rest of Sebastian's direct line keeps the stronger styling; the Orkney ancestors above the disputed step do not. Update notes were added beside the claim on the home page and the crest page. **Confidence: high** that Edward Dixon was not a legitimate son of Henry Warrender. A connection to some other branch of the FitzMaurice family, or an illegitimate one, is not ruled out; nothing for or against it has been found. The quickest test is Edward Dixon's own birth or baptism record and his entry in Crockford's Clerical Directory, which gives the year and place of birth.

Everything on the earlier pages that rests on this link depends on the disputed step: "Cecil is Amanda's 3rd cousin once removed" (the canvas agrees, if the link holds), "Your ancestor about 5 generations back" (the 5th Earl is six generations back from Sebastian, if the link holds), "Sebastian is approximately 15 generations removed from King James II" (19, if the link holds), and the classic tree's relationship captions for every Orkney person.

### People and identity

| Item | What the sources say | Recommendation | Confidence |
|---|---|---|---|
| Edmond's name | Earlier pages call him "Edmond Walter Leighton FitzMaurice". The Gazette and the Evening News give "Edmond Walter Fitzmaurice"; "Leighton" comes from his address near Leighton Buzzard. | Fixed on the crest page and the classic tree. | high |
| "Reg, Bobs" and "Auntie Bobs" | The home page transcribes both labels with "Bobs". The labels read "Reg, Bob and their Father Edward Dixon Fitzmaurice" and "Auntie Babs, South Africa", and the family calls her Babs. | Fixed on the home page. | high for "Bob", moderate to high for "Babs" (the second letter is not perfectly clear) |
| Ron's father's name | One caption on the classic tree calls him "Sidney Andrews". The album gives his initials as H. G. Sidney is also the name the family gives Ron's younger brother, so the caption may have mixed them up. | Left as it is; the canvas shows him as Mr H. G. Andrews and flags the conflict. A birth or death certificate will settle it. | moderate |
| The father in the Andrews family photograph | The caption names "their father" in the front row (the man in the flat cap) and again in the back row. | Update note added on the home page. Ask Amanda which is right. | high that one is wrong |
| The bow tie portrait | Captioned as Reg on the home page and the classic tree. It is unlabelled, and the handoff brief lists the same image as "unknown young man". The same file is also in the repository as `unknown-young-man-bowtie.jpg`. | Shown on Reg's profile as a possible portrait only, with an update note on the home page. | moderate that it is not proven either way |
| Edith Madeleine FitzMaurice | Earlier pages make her Reg's sister. The photo analysis suggests she may be Edward Dixon's sister. Nothing in the collection says either. | Shown in the kin frame beside Edward Dixon, relationship unproven. | high that her place is unknown |
| The Camden Town carte de visite | Earlier pages call the sitters "unknown FitzMaurice ancestors". Nothing on the card names them. | Shown as one placeholder card in the kin frame, with no identities given. | high |
| "Reg" in Ron's album | A comrade called Reg was ill "on the Boat" and later died of a duodenal ulcer. | Noted on Ron's profile that this is not Reg FitzMaurice. | high |
| Mary Stewart's son | The classic tree calls James Hamilton, 1st Earl of Arran, her grandson and says he was Regent. He was her son, and the Regent was his son, the Duke of Châtellerault. | Corrected on the canvas; the classic tree is left as it is. | high |
| Edmond's daughter | The canvas originally had Edmond with no children. The peerage records an only child, Lady Mary Constance Hamilton FitzMaurice (1903 to 1950), later Lady Mary Gosling, who died ten months before him. The crest page is right about her. | Added to the canvas. | high |
| The 7th Earl and Cecil | The 1951 Evening News calls Edmond Cecil's great-uncle. By the peerage they were first cousins twice removed (both descend from the 5th Earl). | Canvas uses first cousin twice removed. | high |
| James II "the sixth monarch of the House of Stewart" | Classic tree and handoff brief. He was the fourth (Robert II, Robert III, James I, James II). | Left as it is; listed here. | high |

### Dates and places

| Item | What the sources say | Recommendation | Confidence |
|---|---|---|---|
| Wedding reception | `wedding.html` says the home of Mr and Mrs Jack Hinder; the classic tree says the Andrews family home. The album reads "the Wanstead home of Mr. and Mrs. Jack Winter", and another caption says "Jack took over the man's job of feeding the multitude". | Fixed on both pages. | high |
| Cecil's marriage | The crest page, home page and classic tree say November 1952. The peerage gives 27 November 1953, and the Evening News cutting (year torn off) gives his age as 34, which fits 1953 (he was born in July 1919). | Fixed on all three pages. | high |
| Edmond inherited "aged 16" | Classic tree. He was born on 24 May 1867 and succeeded on 21 October 1889, aged 22; the Evening News gives his age at death in 1951 as 84, which agrees. | Fixed on the classic tree. | high |
| Anne Hamilton's marriage "1643" | Crest page. She married William Douglas on 29 April 1656. | Update note added (the date comes from published sources, not a family record, so the text was kept). | high |
| The 5th Earl "1826" | Crest page heading. He succeeded his grandmother in 1831; 1826 was his marriage. | Update note added. | high |
| The 5th Earl as a representative peer, 1833 to 1871 | Classic tree. Wikipedia gives 14 January 1833 to 26 January 1874; one other site gives 1871. | Canvas uses 1833 to 1874. Check the House of Lords Journals if it matters. | moderate |
| Mary Stewart "c.1433 to 1465" | Classic tree. Wikipedia gives 13 May 1453 to May 1488. | Canvas uses 1453 to 1488; classic tree left as it is. | high |
| Connie "aged 73" | The Evening News says she died in 1946 aged 73. Born 23 January 1865, she was 81. | Noted on her profile. | high |
| Cecil's return | The classic tree and home page date the Devonshire photograph to 29 September 1951. The Evening News says he "arrived home by troopship last October". | Left as it is. The photograph's caption date should be checked with the picture agency. | moderate |
| The ruby wedding dinner | The invitation says "Saturday 10th March" with no year. 10 March was a Saturday in 1990, forty years after the wedding. | Canvas gives 1990 as probable. | high |
| Generations to James II | Earlier pages say Sebastian is "approximately 15 generations" from James II and Enzo and Violet 16. Even if the Orkney link were real, the chain on the canvas puts Sebastian 19 generations below James II. | Not shown; the link is unproven (B1). | high |
| Amanda and Venetia's birth years | The classic tree gives "c.1948" and "c.1950". The first is before her parents' wedding in February 1950. Both are unsourced, and both are living. | Not shown on the canvas (privacy). See F5. | high that the "c.1948" is wrong or a guess |
| Pat's birth year | Earlier pages give about 1920 with no source. The family says she was evacuated as a child, which suggests the late 1920s. | Shown as not known. Her birth certificate will settle it. | moderate |
| Babs's dates | Earlier pages give about 1895, with no source. The photo analysis dates her snapshot to about 1905 to 1920 from its format and the clothing. | Shown as unverified. Her age in the snapshot, once the date is narrowed, gives a rough check. | low |

### Claims without support

- "These clippings prove the family knew about their connection to Cecil" (home page). They show someone followed Cecil's story. Update note added.
- "He was scrubbing mess-decks as punishment when he learned he had inherited the Earldom" (home page). The cutting says he scrubbed the mess decks on the voyage home, after he had become Earl. Update note added.
- "Their only child, Lady Mary Constance, married but died without issue" (crest page). This is supported by the peerage, so no change.
- Ron's note that the treasures of Tutankhamun "were stored in our caves during the War". It is his own statement, shown as such; no other record in the collection confirms it.

## C. Unattributed and mislabelled content

- **Duplicate files.** `photos/IMG_8831.jpeg` to `IMG_8855.jpeg` are byte-for-byte copies of the named files in `photos/` (the handoff brief maps them). `IMG_8845.jpeg`, `reg-fitzmaurice-portrait.jpg` and `unknown-young-man-bowtie.jpg` are the same picture under three names, two of which disagree about who it is. Nothing was deleted. See F7.
- **`photos/IMG_8844.jpeg`** is completely black. Not used; not deleted.
- **`photos/portraits/cecil_devonshire.jpg`** carries an Alamy watermark. It is a press agency picture, and the site has no licence recorded for it. It is shown on Cecil's profile because it is already on the site. See F8.
- **`photos/stuart-brothers-studio.jpg`** is a coloured postcard of Brompton Road from the web, not a family item. Its licence is not recorded. It is shown on Edward Dixon's profile as a view of the street.
- **`photos/portraits/*`** are paintings, engravings and photographs of historical people and places, described on the classic tree as from Wikipedia and in the public domain. That was not checked image by image.
- **`photos/portraits/connie_countess_portrait.jpg`** is captioned on the classic tree as Connie "as Countess of Orkney", but it shows a young girl. It is captioned on the canvas as Connie as a child.
- **`photos/portraits/viscount_kirkwall.jpg`** is Roger Fenton's 1855 Crimean War photograph "Viscount Kirkwall, Captain 71st Highlanders". The classic tree's caption correctly names George, later the 6th Earl; it is not the earlier Viscount Kirkwall of 1778 to 1820. It is on George's profile.
- **`photos/portraits/5th_earl_orkney.jpg`** and the other portraits are captioned as they were on earlier pages; the identifications were not checked against the original collections.
- **`photos/ron-egypt/historical/*`** are general wartime images used on Ron's page. They are not family photographs and are not attached to anyone on the canvas.
- **`script.js`** holds an older `personData` list that no page loads. It was left unchanged.
- **`claude_code_handoff_brief_v2.md`** quotes, once, the family name that the family asked to keep off the site, in the instruction not to use it. Because the repository is published by GitHub Pages, that file is publicly reachable. It was left unchanged. See F10. Every other file was checked and does not contain the name. The ruby wedding transcription on the canvas withholds it.
- **Existing pages use em dashes** throughout (as `&mdash;`). They were left as they are; nothing new uses them.

## D. Gaps

The records that would move the most profiles from unverified to confirmed:

1. **Patricia's birth certificate** (GRO). It gives her date and place of birth, her father's full name and her mother's maiden name, which opens Reg's marriage and his wife's identity.
2. **Reg's birth certificate**, and the 1911 census, to confirm his father as Edward Dixon and find Bob's and Babs's real names.
3. **Edward Dixon in Crockford's Clerical Directory** and the 1881 to 1911 censuses: his birth, parents and parishes. This also settles B1 for good.
4. **The CWGC Civilian War Dead roll** for Andrews in East Ham: the names and death dates of Ron's parents and younger brother.
5. **Ron's RAF service record** (MOD), for his birth date, enlistment and postings.
6. **The 1939 Register**, which would show Pat as an evacuee and Ron's family in East Ham.
7. **Babs's first name** (the "Eil" on her photograph) and the UK outward passenger lists.

### Thin profiles

These profiles are short because almost nothing is recorded, not because sources were left out:

- Mrs R. FitzMaurice (Pat's mother): no name, no dates.
- Mrs H. G. Andrews: no name.
- Bob FitzMaurice: a name on a label.
- Sidney Andrews: name uncertain.
- The Orkney people with one or two lines of record, such as the 1st and 2nd Marquesses of Hamilton, William O'Brien and Douglas Commerel Menzies FitzMaurice.
- All fourteen living people, by design.

## E. Changes made

### Canvas and profiles

- `family-tree.html` is now the interactive canvas, ported from the Belfiore & Circelli site with the same layout, connectors, panel, profile, lightbox and relationship finder. Only the design (the FitzMaurice & Andrews burgundy, navy, cream and gold, with Cinzel, Cormorant Garamond and EB Garamond) and the data changed.
- Additions needed for this family, all driven by `people.json` so the behaviour stays the same elsewhere:
  - `layoutJoin`: a person with parents on the tree drawn beside a spouse who also has parents on the tree (Ron beside Pat; Thomas FitzMaurice MP beside Mary, 4th Countess), with a connector from his own parents.
  - `meta.regions`: an optional labelled frame around a group of people. It was used for the Orkney line in the first version and is now empty.
  - `parentLinkNote`: a parent link that the family tells but a record disputes. It is drawn dashed in burgundy with a "Disputed link" label, and the relationship finder explains the dispute on any relationship that runs through it. Only Edward Dixon's link to Henry Warrender uses it.
  - `meta.rootOrder`, `meta.kinAnchor`, `meta.kinLabel`, `meta.initialView`, `meta.directLineLabel`, `meta.familyLabel` and `meta.regionKicker`, for labels that were hard-coded for the Italian family.
  - Partners (Lizzie Eley, Mollie Wells) are shown with an "&" marker and described as partners in the relationship finder.
  - Short names in the relationship finder no longer turn "Mr H. G. Andrews" into "Mr", and drop trailing commas ("Anne," became "Anne").
  - The generation rail drops the date ranges, then the titles, when zoomed out far enough for labels to overlap; the numerals are wider to fit XVIII.
  - The starting view begins below the title box, so no card opens hidden behind it; on phones it centres on Sebastian.
  - The viewer's "Open original" link opens the full-size file where a reduced copy is shown.
- Every person has a story written from the sources only, with footnotes to `sources.json`, and every fact cites a source or is labelled unverified or family tradition.
- Living people have name and relationship only.

### Fixes to existing pages

Only where a legible record contradicts the page. Old text was replaced only for the item named.

| File | Was | Now | Evidence |
|---|---|---|---|
| `wedding.html` | Jack Hinder | Jack Winter | Wedding album caption |
| `index.html` | "Reg, Bobs and their Father..." and "Auntie Bobs" (twice) | "Reg, Bob..." and "Auntie Babs" | The photo labels |
| `index.html` | November 1952 (twice) | November 1953 | Peerage record; age 34 in the cutting |
| `family-crest.html` | Edmond Walter Leighton FitzMaurice | Edmond Walter FitzMaurice | London Gazette 1890; Evening News |
| `family-crest.html` | November 1952 | November 1953 | As above |
| `family-tree-classic.html` | Reception at the Andrews family home | the Wanstead home of Mr and Mrs Jack Winter | Wedding album caption |
| `family-tree-classic.html` | Edmond Walter Leighton FitzMaurice (twice); "aged 16" | Edmond Walter FitzMaurice; "aged 22" | Gazette; Evening News (aged 84 in 1951) |
| `family-tree-classic.html` | November 1952 (three times) | November 1953 | As above |
| `ron-egypt.html` | link to `index.html#wedding` (which does not exist) | link to `wedding.html` | Broken link |

### Update notes added beside existing text

Each is marked "Update, November 2026" and styled as a note, so the original text stays visible.

- `index.html`: the Orkney link (James II card); the cousin relationship and the mess decks (Cecil card); the clippings "prove" claim; the unlabelled bow tie portrait; the Andrews photograph caption.
- `family-crest.html`: 1656, not 1643; 1831, not 1826, and six generations, not five; the Orkney link (7th Earl item); the cousin relationship (two places).
- `family-tree-classic.html`: a banner at the top of the tree explaining that it is the earlier version and listing the corrections.

### Legacy files

- The old `family-tree.html` was moved, unchanged apart from the above, to `family-tree-classic.html`. Its earlier history stays in git under `family-tree.html`. The new canvas's key links to it. The site navigation's "Family Tree" link now opens the canvas.
- No image, document or page content was deleted.

### Checks

`node tests/verify-canvas.js` (Playwright with Chromium) passes with no failures. It checks:

- every source id in `people.json` resolves (786 references to 59 sources);
- no date, place, fact or timeline entry is unsourced unless labelled unverified or family tradition;
- no em dashes in the data, the canvas files or this audit, and no en dashes in the data;
- the fourteen living people have no birth, death, residence, occupation or timeline entries, and no year in their text;
- the withheld family name appears in no text file on the site except the handoff brief (C);
- no card text overflows at 1440, 1024 and 390 pixels wide;
- no page errors at any width;
- all connectors start and end on the right cards and cross no card; every child has exactly one incoming line, starting at a parent; exactly one disputed link is drawn, dashed and labelled;
- all 149 image and data paths resolve, and all 60 `#/person/` routes open the right profile, with alt text on every image and every footnote target present;
- the lightbox opens the album's dedication page with its transcription beside it;
- search finds people by name variants ("Herb.", "Ginger", "Fitzmaurice", "Seb");
- the "Read full story" button stays visible at the bottom of the panel, expands the panel in place (to over 70 per cent of the screen on desktop, full screen on phones), and the profile has every section; left and right arrows move in reading order, up goes to a parent and down to a child, previous and next show names, and Esc steps back to the summary and then closes;
- relationship labels for twenty test pairs (for example Sebastian to Reg, great-grandfather; Sebastian to Bob, great-great-uncle; Cecil to Edmond, 1st cousin twice removed; Sebastian to James II, 17× great-grandfather; Patricia to Cecil, 3rd cousin), every relationship through the disputed step says it is disputed and why, and every one of the 3,540 ordered pairs resolves to a label and a path;
- a real mouse drag from Sebastian's dot onto Robert shows the live label and line and then "Robert Belfiore is Sebastian's father."; R, then an arrow, then Enter, does the same from the keyboard;
- contrast, measured on the rendered page: 417 text elements meet WCAG AA (4.5 to 1, or 3 to 1 for large text), and every connector meets 3 to 1 against the canvas (the lightest, the marriage bar, is 3.5 to 1; ordinary lines are 4.0 to 1; the direct line is 8.9 to 1);
- every internal link on all six pages resolves.

## F. Decisions for Seb

1. **The Orkney line.** Decided on 12 November 2026: draw the link, marked as disputed. Still open: the home page and crest page tell the story as if the link were proven, with update notes beside it. Do you want their introductions reworded to match the canvas?
2. **The bow tie portrait.** Is it Reg? If anyone can confirm it, the profile can say so; if not, the caption on the home page should probably change.
3. **Babs.** She is shown as Reg's sister (Sebastian's great-great-aunt), as earlier pages had her. Amanda calls her "my auntie", which families often used for a great-aunt. Is that right, and does anyone know her real first name?
4. **Edith Madeleine.** Does anyone know whether she was Reg's sister, Edward Dixon's sister, or someone else?
5. **Living people on the old pages.** The classic tree shows a birth year for Sebastian and estimated birth years for Amanda and Venetia. The new canvas shows none. Do you want them removed from the classic tree too?
6. **Retiring the classic tree.** It is kept, with a banner, and linked from the canvas key. Keep it, or remove it once you are happy with the canvas?
7. **Duplicate images.** `IMG_8831` to `IMG_8855` duplicate the named files, and `IMG_8844` is black. Delete them?
8. **Image licences.** The Devonshire photograph of Cecil has an Alamy watermark, and the Brompton Road postcard is from the web. Replace them, buy a licence, or remove them?
9. **Sidney.** The family believes Ron's younger brother was called Sidney, and one caption gives Sidney as his father's name. Can Amanda say which, if either?
10. **The handoff brief.** It is publicly reachable on the published site and contains, once, the family name the family asked to keep off the site. Reword that line, or move the brief out of the published repository?
11. **The genealogy report PDF** is also publicly reachable. It does not contain the withheld name or any dates for living people, but you may prefer it not to be public.
12. **Em dashes on the existing pages.** Convert them, or leave the original pages as they were written?
