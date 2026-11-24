# Map audit

Phase 1 of the family map: the address directory from pull request #4 (data/places.json, 166 places and 280 events) checked against the sources, the record crops and the page text, then completed and linked into data/people.json. Started from commit 7639fee on grok/address-directory. Every change below is in data/places.json, data/people.json or data/sources.json in this branch.

How to read this: "checked" means the place or event was compared with its sources, the record crop and the sentence on the page and needed no change; "corrected" says what changed and why; "could not be checked" says what is missing. Coordinates that only place a point on the map are never a source for a family fact.

## Summary

- Places: 166 in the directory, 152 now. 14 removed (6 not real places in the family's life or joined labels, 8 superseded towns whose every fact now points at a more precise place), 5 merged into 2, 3 added that the pages name (Abbots Langley, St Marylebone, the Luton district).
- Events: 280 in the directory, 268 now. Facts that people.json already holds are rebuilt from people.json so each fact lives in one place; the rest are published facts from the pages and their record crops, now 58 of them.
- Every place now has coordinates. 36 are pins (a published address or named building known to within 150 metres), 90 are soft circles sized to the uncertainty, 26 are areas (registration districts, parishes, counties and countries).
- people.json: placeId added to every fact of the deceased that has a place, 50 timeline entries linked, 21 residence addresses filled from the pages, burial entries for 4 people, voyages for 5 people (7 voyages), and 5 corrections with Update notes.
- Record crops: every crop on the pages that shows a placed fact is attached to its event. Six are not: see "Crops not on the map".
- tests/verify-canvas.js still passes (run with the site fonts installed locally, as they are on the live site).

## Every place

Precision is what the record gives. Drawn as: pin, circle (soft halo sized to the uncertainty) or area. Stands today: yes, rebuilt, demolished or unknown, with the source in the next section.

| Place | Kind | Precision | Drawn as | Uncertainty | Variants | Events | Confidence | Sources | Coordinates found by |
|---|---|---|---|---|---|---|---|---|---|
| 1 Honey Street, Bodmin (`1-honey-street-bodmin`) | home | address | halo | 100 m |  | 1 | probable | census-bennett | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The point is on Honey Street; the house number was not matched, so the circle covers the street. |
| 10 Riles Road, Plaistow (`10-riles-road`) | home | address | halo | 1500 m |  | 1 | probable | census-cousins | Riles Road, E13, is in a 1938 list of London streets (loc-london-streets-1938) but is not on today's map, and where it ran has not been found. The circle covers Plaistow, the place the census names. |
| 113 Bourne Avenue, Harlington (`113-bourne-avenue`) | home | address | halo | 450 m |  | 1 | probable | electoral-fitzmaurice | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. Nos. 55 and 113 came back as the same point, so this is the middle of Bourne Avenue, not the house. |
| 118 Keeton Road, Bermondsey (`118-keeton-road`) | home | address | halo | 300 m |  | 1 | probable | census-cousins | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Keeton's Road, Bermondsey. The house number was not matched, so the point is the street. |
| 13 Gladding Road, Manor Park (`13-gladding-road`) | home | address | pin | 100 m |  | 1 | probable | census-cousins | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 13 Gladding Road, Manor Park, London, UK |
| 14 Waterloo Road, Whitstable (`14-waterloo-road-whitstable`) | home | address | pin | 100 m |  | 1 | confirmed | passenger-1923-armadale | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 14 Waterloo Road, Whitstable, UK |
| 15 Mornington Place, St Pancras (`15-mornington-place`) | home | address | halo | 120 m |  | 1 | probable | census-1891-spencer | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. Mornington Place is short; the point is on the street, not the house. The number may read 15b. |
| 16 York Road, Edgbaston (`16-york-road-edgbaston`) | home | address | pin | 100 m |  | 2 | confirmed | probate-robert-1895 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 16 York Road, Edgbaston, UK |
| 2 Elm Terrace, Wandsworth Road (`2-elm-terrace`) | home | address | halo | 1200 m |  | 1 | probable | census-1861-elm-terrace | Corrected. The directory's point was on Wandsworth's high street, not Wandsworth Road. Elm Terrace has not been found on a map, so the circle covers the stretch of Wandsworth Road in Battersea parish. |
| 23 Sutton Court Road, Plaistow (`23-sutton-court-road`) | home | address | pin | 100 m |  | 4 | confirmed, probable | census-cousins, cwgc-plaistow-1941, ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 23 Sutton Court Road, Plaistow, London, UK |
| 25 Compton Avenue, Brighton (`25-compton-avenue`) | home | address | pin | 100 m |  | 1 | probable | census-1891-brighton | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 25 Compton Avenue, Brighton, UK |
| 26 Turret Grove, Clapham (`26-turret-grove`) | home | address | pin | 100 m |  | 1 | probable | electoral-fitzmaurice | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 26 Turret Grove, Clapham, London, UK |
| Young Street, Canning Town (Nos. 3 and 5) (`young-street-canning-town`) | home | street | halo | 350 m | 3 Young Street, Canning Town; 5 Young Street, Canning Town | 1 | probable | census-cousins | The 1896 and 1902 street directories put Young Street off Victoria Dock Road between Nos. 242 and 243, just before Custom House station (loc-canning-town-directories). The street is not on today's map, so the circle is drawn near Custom House station. |
| 33 New Street, London Docks (`33-new-street`) | home | street | halo | 900 m |  | 1 | probable | gro-cousins-gall | New Street has not been found on a map. It was the family's abode at Arthur's baptism at St Peter, London Docks, so the circle is drawn round that church. |
| 34 Blythe Road, Hammersmith (`34-blythe-road`) | home | address | pin | 100 m |  | 1 | probable | electoral-fitzmaurice | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 34 Blythe Road, Hammersmith, London, UK |
| 40 Fisher Street, Canning Town (`40-fisher-street`) | home | address | pin | 100 m |  | 2 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 40 Fisher Street, Canning Town, London, UK |
| 42 Nestles Avenue, Hayes (`42-nestles-avenue`) | home | address | halo | 250 m |  | 2 | probable | electoral-fitzmaurice, probate-reg-1977 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Nestle's Avenue, Hayes. The house number 42 was not in OpenStreetMap, so the point is the street. |
| 48 Oxford Road South, Gunnersbury (`48-oxford-road-south`) | home | address | pin | 100 m |  | 1 | probable | electoral-may | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 48 Oxford Road South, Chiswick, London, UK |
| 55 Bourne Avenue, Hayes (`55-bourne-avenue`) | home | address | halo | 450 m |  | 1 | probable | register-1939 | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. Nos. 55 and 113 came back as the same point, so this is the middle of Bourne Avenue, not the house. |
| 55 Seymour Street, Higher Tranmere, Birkenhead (`55-seymour-street`) | home | address | halo | 250 m |  | 1 | probable | passenger-1925-edith | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Seymour Street, Higher Tranmere, Birkenhead. The house number 55 was not matched, so the point is the street. |
| 57 Rutland Street, Stepney (`57-rutland-street`) | home | address | halo | 1500 m |  | 1 | confirmed | parish-stepney-1871 | Rutland Street has not been found on a map. The circle covers Stepney, where William married from it in 1871. |
| 6 Cathles Road, Balham Hill (`6-cathles-road`) | home | address | pin | 100 m |  | 1 | probable | census-1911-caroline-spencer | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 6 Cathles Road, Balham, London, UK |
| 7 North Lane, Clapham Common (`7-north-clapham-common`) | home | street | halo | 1000 m | 7 North Side, Clapham; 7 North St., Clapham Common | 2 | probable | passenger-1925-marburn, passenger-1925-montrose-out | North Side, Clapham Common, and North Street, Clapham, are about a mile apart, and no North Lane has been found. The circle covers both. |
| 92 Harper Road, West Ham (`92-harper-road`) | home | address | halo | 2500 m |  | 1 | probable | census-cousins | Corrected. The directory's point was Harper Road in Southwark, south of the Thames, not West Ham. Harper Road in West Ham has not been found on a map, so the circle covers West Ham, the place the census names. |
| 94 Bury Road, Hemel Hempstead (`94-bury-road`) | home | address | pin | 100 m |  | 1 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: 94 Bury Road, Hemel Hempstead, UK |
| A.S.C. Mobilization Store, Aldershot (`aldershot-asc`) | military site | town | halo | 2500 m |  | 1 | confirmed | ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The store's building is not placed, so the circle covers Aldershot. |
| St John the Baptist, Aldenham (`aldenham-church`) | church | building | pin | 80 m |  | 1 | probable | census-andrews-stacey, parish-aldenham-1838 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St John the Baptist, Aldenham, UK |
| Aston (`aston`) | town | town | halo | 2000 m | Aston | 4 | probable | census-1871-aston, census-1881-aston, gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Aston, United Kingdom |
| Aston Manor (`aston-manor`) | town | town | halo | 2000 m |  | 1 | probable | census-1881-aston | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Aston Manor, United Kingdom |
| Battersea (`battersea`) | town | town | halo | 2000 m |  | 8 | confirmed, probable | census-1841-falcke, parish-battersea-1837, parish-battersea-1861, parish-falcke-1817 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Battersea, United Kingdom |
| Berkeley Lodge, Wimbledon (`berkeley-lodge`) | workplace | address | halo | 2500 m |  | 1 | probable | census-andrews-stacey | Berkeley Lodge has not been found on a map. The circle covers Wimbledon, the place the census names. |
| Bermondsey (`bermondsey`) | town | town | halo | 2000 m |  | 2 | confirmed, probable | census-cousins, gro-cousins-gall, register-1939 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Bermondsey, United Kingdom |
| Blean registration district (`blean-registration-district`) | registration district | registration district | area | 10000 m |  | 1 | confirmed | census-1911-whitstable, gro-indexes, news-1936-simmons | Drawn as an approximate area, a circle of about 10 km round the district. Blean district: Whitstable, Herne Bay and the parishes north of Canterbury. |
| Bodmin (`bodmin`) | town | town | halo | 2000 m | Bodmin | 25 | confirmed, probable | census-1921-lilian, census-bennett, gro-bennett-grigg, gro-lilian-death, probate-charles-bennett-1926 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Bodmin, United Kingdom |
| Bolingbroke Gardens, Battersea (`bolingbroke-gardens`) | home | street | halo | 1500 m |  | 1 | probable | census-1851-falcke | Bolingbroke Gardens has not been found on a map. The circle covers Battersea, the place the census names. |
| Braintree, Essex (`braintree-essex`) | town | town | halo | 2000 m |  | 1 | probable | gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Braintree, Essex, United Kingdom |
| Bridge registration district (`bridge-registration-district`) | registration district | registration district | area | 9000 m |  | 1 | probable | gro-edith-death | Drawn as an approximate area, a circle of about 9 km round the district. Bridge district: the villages south-east of Canterbury. |
| Brighton (`brighton`) | town | town | halo | 2000 m |  | 1 | probable | census-1891-brighton | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Brighton, United Kingdom |
| Brixton (`brixton`) | town | town | halo | 2000 m |  | 3 | confirmed, probable | census-1901-brixton, parish-brixton-1897 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Brixton, United Kingdom |
| Bushey (`bushey`) | town | town | halo | 2000 m | Bushey | 2 | confirmed, probable | census-andrews-stacey, parish-bushey-1888 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Bushey, United Kingdom |
| Canning Town (`canning-town`) | town | town | halo | 2000 m |  | 1 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Canning Town, United Kingdom |
| Canterbury (`canterbury`) | town | town | halo | 2000 m |  | 1 | probable | gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Canterbury, United Kingdom |
| Cape Supreme Court, Cape Town (`cape-supreme-court`) | venue | building | halo | 2500 m |  | 1 | probable | family-bob-south-africa | The court sat in Cape Town; the cases are undated and the building is not named, so the circle covers the city centre. |
| Cape Town (`cape-town`) | town | town | halo | 2000 m | Cape Town | 5 | confirmed, probable | passenger-1916-balmoral, passenger-1916-llanstephan, passenger-1923-armadale, passenger-1923-arundel | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Cape Town |
| Chalfont, Buckinghamshire (`chalfont-buckinghamshire`) | town | town | halo | 4000 m |  | 1 | probable | census-andrews-stacey | The record says Chalfont, which could be Chalfont St Giles or Chalfont St Peter; the circle covers both. |
| Chester Road, Boldmere (`chester-road-boldmere`) | home | street | halo | 900 m |  | 1 | probable | census-1901-fanny-boldmere | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. Chester Road is long; the circle covers the Boldmere stretch. |
| Chingford Mount Cemetery (`chingford-mount-cemetery`) | cemetery | building | pin | 150 m |  | 1 | confirmed | burial-chingford-1928, findagrave-214209661 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Chingford Mount Cemetery, United Kingdom |
| Chiswick (`chiswick`) | town | town | halo | 2000 m |  | 1 | probable | electoral-may | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Chiswick, United Kingdom |
| Claims Record Office, Kew (`claims-record-office`) | workplace | building | halo | 1500 m |  | 1 | probable | census-1921-lilian | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The office building is not placed, so the circle covers Kew, the place of work her 1921 census entry gives. |
| Clifton Ville, Westgate Terrace, Whitstable (`clifton-ville-whitstable`) | home | address | halo | 700 m |  | 1 | probable | census-1911-whitstable | Westgate Terrace is a Whitstable street today, but its exact line was not checked and which house was called Clifton Ville is not known. The circle covers the middle of Whitstable. |
| Colchester (`colchester`) | town | town | halo | 2000 m |  | 1 | probable | register-1939 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Colchester, United Kingdom |
| St John the Baptist Parish Church, Crowthorne (`st-john-the-baptist-crowthorne`) | church | building | pin | 100 m | Crowthorne | 1 | family tradition | family-testimony, st-john-crowthorne-churchyard | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. The point is St John the Baptist, which OpenStreetMap places on Church Street, Crowthorne. The church's own page gives Waterloo Road. |
| Crystal Palace dispersal unit (`crystal-palace`) | military site | building | halo | 250 m |  | 1 | confirmed | ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Crystal Palace, London, UK |
| Denham (`denham`) | town | town | halo | 2000 m | Denham, Buckinghamshire | 2 | probable | census-andrews-stacey, parish-denham-1834 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Denham, United Kingdom |
| St Mary's, Denham (`denham-church`) | church | building | halo | 250 m |  | 1 | probable | parish-denham-1834 | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The point was not checked against a listing map, so it is drawn as a small circle. |
| Denmark Street, Watford (`denmark-street-watford`) | home | street | halo | 200 m |  | 1 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Denmark Street, Watford, UK |
| Durban (`port-durban`) | port | town | halo | 2000 m |  | 1 | probable | passenger-1925-edith | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Durban, South Africa |
| East Ham Isolation Hospital (`east-ham-isolation-hospital`) | hospital | building | halo | 250 m |  | 1 | probable | census-1921-may | From 1902 the hospital stood at the end of Roman Road, south of The Greenway (loc-lost-hospitals-east-ham). The circle is drawn on that site. |
| East Ham registration district (`east-ham-registration-district`) | registration district | registration district | area | 3500 m |  | 1 | probable | gro-indexes | Drawn as an approximate area, a circle of about 4 km round the district. East Ham district, created in 1935 from West Ham district. |
| Egloshayle, Cornwall (`egloshayle-cornwall`) | parish | parish | area | 1500 m |  | 1 | probable | census-bennett | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Egloshayle, Cornwall, United Kingdom |
| Erdington (`erdington`) | town | town | halo | 2000 m |  | 1 | confirmed | probate-fanny-1917 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Erdington, United Kingdom |
| Essex South Western registration district (`essex-south-western-registration-district`) | registration district | registration district | area | 6500 m |  | 1 | probable | gro-indexes | Drawn as an approximate area, a circle of about 6 km round the district. Essex South Western district, 1935 to 1965: Cann Hall, Leyton, Walthamstow, Wanstead and Woodford (loc-ukbmd-districts). |
| Feltham, Middlesex (`feltham-middlesex`) | town | town | halo | 2000 m |  | 2 | confirmed, probable | electoral-may, probate-may-1971 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Feltham, England |
| France, Expeditionary Force (`france-ef`) | country | country | area | 300000 m |  | 1 | confirmed | ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: France |
| Greenwich registration district (`greenwich-registration-district`) | registration district | registration district | area | 4000 m |  | 1 | probable | gro-indexes | Drawn as an approximate area, a circle of about 4 km round the district. Greenwich district. |
| Hackney (`hackney`) | town | town | halo | 2000 m |  | 2 | probable | parish-hackney-1850 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Hackney, United Kingdom |
| Halstead (`halstead`) | town | town | halo | 2000 m |  | 1 | probable | gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Halstead, United Kingdom |
| Ham Farm, Aldenham (`ham-farm`) | farm | building | halo | 2500 m |  | 1 | probable | census-1901-ham-farm | Ham Farm is listed with the Hilfield Park estate between Aldenham and Watford in 1906 (loc-hilfield-estate-1906). The farmhouse is not placed exactly, so the circle covers the south of Aldenham parish. |
| Hammersmith registration district (`hammersmith-registration-district`) | registration district | registration district | area | 3000 m | Hammersmith district | 4 | probable | album-1950, electoral-fitzmaurice, family-testimony, gro-marriage-1927 | Drawn as an approximate area, a circle of about 3 km round the district. Hammersmith district. |
| Hampton Hill (`hampton-hill`) | town | town | halo | 2000 m |  | 1 | probable | census-1921-lilian | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Hampton Hill, United Kingdom |
| Harrow, Middlesex (`harrow-middlesex`) | town | town | halo | 3000 m |  | 1 | probable | census-1851-falcke | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. London Borough of Harrow |
| Hayes (`hayes`) | town | town | halo | 2000 m | Hayes | 2 | confirmed, probable | probate-reg-1977, register-1939 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Hayes, United Kingdom |
| High Cross, Aldenham (`high-cross-aldenham`) | farm | building | halo | 600 m |  | 3 | probable | census-1891-high-cross, census-andrews-stacey, census-walter-aldenham | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. High Cross, Aldenham |
| Islington (`islington`) | town | town | halo | 2000 m |  | 2 | probable | census-1891-spencer, census-1901-brixton, gro-edith-death | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Islington, United Kingdom |
| J. Perriman's studio, 3 Greenland Place, Camden Town (`perriman-greenland-place`) | studio | address | pin | 120 m |  | 1 | probable | perriman-cdv | Placed beside the Mother Red Cap at Camden Town, as the studio stamp says ('side of the Mother Red Cap'). |
| Kent (`kent`) | county | county | area | 40000 m |  | 2 | probable | gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Kent, United Kingdom |
| King's Norton registration district (`kings-norton-registration-district`) | registration district | registration district | area | 7000 m |  | 3 | probable | gro-indexes | Drawn as an approximate area, a circle of about 7 km round the district. King's Norton district, south of Birmingham. |
| Lambeth registration district (`lambeth-registration-district`) | registration district | registration district | area | 4500 m |  | 1 | probable | census-1911-whitstable, gro-indexes | Drawn as an approximate area, a circle of about 4 km round the district. Lambeth district. |
| Lang Sims studio, Brixton Road (`lang-sims-brixton`) | studio | address | halo | 250 m |  | 1 | probable | lang-sims-card | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Brixton Road, London. Number 437 was not matched as a building, so the point is the street. |
| Leavesden (`leavesden`) | town | town | halo | 2000 m | Leavesden, Hertfordshire | 1 | confirmed | census-andrews-stacey, parish-leavesden-1858 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Leavesden, United Kingdom |
| All Saints, Leavesden (`leavesden-church`) | church | building | pin | 60 m |  | 1 | confirmed | parish-leavesden-1858 | Corrected from the Leavesden village point to the church: Historic England list entry 1175616 (loc-nhle). |
| Leicester (`leicester`) | town | town | halo | 2000 m |  | 1 | confirmed | probate-rupert-1949 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Leicester, United Kingdom |
| Letchmore Heath (`letchmore-heath`) | town | town | halo | 2000 m |  | 2 | probable | census-andrews-stacey, census-walter-aldenham | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Letchmore Heath, United Kingdom |
| Lewisham registration district (`lewisham-registration-district`) | registration district | registration district | area | 5000 m |  | 1 | probable | gro-indexes | Drawn as an approximate area, a circle of about 5 km round the district. Lewisham district. |
| Little Bromwich, Aston (`little-bromwich-aston`) | town | town | halo | 2000 m |  | 2 | probable | census-1871-aston, gro-indexes | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Little Bromwich, Birmingham |
| Liverpool (`port-liverpool`) | port | town | halo | 1000 m | Liverpool | 1 | probable | passenger-1925-montrose-in, passenger-1925-montrose-out | Corrected. The directory's point was inland; this is the Pier Head landing stage on the Mersey. |
| Mansell Street, Whitechapel (`mansell-street`) | home | street | halo | 300 m |  | 1 | confirmed | parish-whitechapel-1827 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Mansell Street, Whitechapel, London, UK |
| Mead Cottage, Bushey (`mead-cottage`) | home | address | halo | 2000 m |  | 1 | probable | census-andrews-stacey | Mead Cottage has not been found on a map. The circle covers Bushey, the place the census names. |
| Mile End Old Town (`mile-end-old-town`) | parish | parish | area | 1500 m | Mile End | 3 | probable | census-1861-cousins, gro-cousins-gall | Moved to the middle of the old hamlet of Mile End Old Town, round Stepney Green. |
| Patchetts Green, Aldenham (`patchetts-green`) | town | town | halo | 900 m |  | 1 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Patchetts Green, Aldenham, UK |
| Plaistow (`plaistow`) | town | town | halo | 2000 m | Plaistow | 2 | probable | census-cousins, register-1939 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Plaistow, United Kingdom |
| Plymouth Road, Canning Town (`plymouth-road-canning-town`) | workplace | street | halo | 300 m |  | 1 | probable | census-cousins | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Plymouth Road, Canning Town |
| Plymouth registration district (`plymouth-registration-district`) | registration district | registration district | area | 6000 m |  | 1 | probable | gro-bennett-grigg | Drawn as an approximate area, a circle of about 6 km round the district. Plymouth district. |
| Poplar registration district (`poplar-registration-district`) | registration district | registration district | area | 3000 m |  | 1 | confirmed | gro-cousins-gall | Drawn as an approximate area, a circle of about 3 km round the district. Poplar district. |
| Port of London (`port-london`) | port | town | halo | 6000 m | London | 2 | confirmed, probable | passenger-1916-balmoral, passenger-1916-llanstephan | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Port of London, UK |
| Queen Street, Chelsea (`queen-street-chelsea`) | home | street | halo | 300 m |  | 1 | probable | parish-chelsea-falcke-baptisms | Queen Street, Chelsea, was later renamed Flood Street; the point is on Flood Street. |
| Royal Albert Docks, London (`royal-albert-docks`) | workplace | building | halo | 1500 m |  | 1 | probable | census-cousins | Corrected. The directory's point was the Royal Albert Dock in Liverpool. This is the Royal Albert Dock in London's docklands, where the Port of London Authority employed him in 1921. |
| Royal filling factory, Woolwich (`royal-filling-factory`) | workplace | building | halo | 2500 m |  | 2 | probable | register-1939 | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The factory's buildings are not placed, so the circle covers Woolwich. |
| Saint John, New Brunswick (`port-saint-john`) | port | town | halo | 2000 m | St John | 2 | probable | passenger-1925-marburn, passenger-1925-montrose-in, passenger-1925-montrose-out | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Saint John, New Brunswick, Canada |
| South Africa (`south-africa`) | country | country | area | 600000 m |  | 5 | confirmed, family tradition, probable | family-bob-south-africa, passenger-1916-balmoral, passenger-1916-llanstephan, passenger-1925-edith, photo-labels | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: South Africa |
| Southampton (`port-southampton`) | port | town | halo | 2000 m | Southampton | 4 | confirmed, probable | passenger-1923-armadale, passenger-1923-arundel, passenger-1925-edith, passenger-1925-marburn | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Southampton, UK |
| Spelthorne district, Middlesex (`spelthorne-registration-district`) | district | registration district | area | 9000 m |  | 1 | probable | electoral-fitzmaurice | Drawn as an approximate area, a circle of about 9 km round the district. Spelthorne district, Middlesex, as the electoral registers name it. |
| St Albans Abbey (`st-albans-abbey`) | church | building | pin | 80 m |  | 1 | confirmed | parish-st-albans-1889 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Albans Cathedral, St Albans, UK |
| St Albans, Hertfordshire (`st-albans-hertfordshire`) | town | town | halo | 2000 m |  | 2 | confirmed | census-andrews-stacey, gro-indexes, parish-st-albans-1889 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Albans, Hertfordshire, United Kingdom |
| St Andrew's, Plaistow (`st-andrews-plaistow`) | church | building | pin | 60 m |  | 1 | confirmed | parish-plaistow-1915 | Historic England list entry 1080967 (loc-nhle). |
| St Columb registration district (`st-columb-registration-district`) | registration district | registration district | area | 12000 m |  | 1 | probable | census-bennett, gro-bennett-grigg | Drawn as an approximate area, a circle of about 12 km round the district. St Columb district, Cornwall. |
| St Dunstan, Stepney (`st-dunstan-stepney`) | church | building | pin | 80 m |  | 2 | confirmed | parish-stepney-1829, parish-stepney-1832 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. St Dunstan's, Stepney High Street |
| St John, Hackney (`st-john-hackney`) | church | building | pin | 80 m |  | 1 | probable | census-1861-cousins, parish-hackney-1850 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St John at Hackney, London, UK |
| St Luke, Chelsea (the old parish church, now Chelsea Old Church) (`st-luke-chelsea`) | church | building | pin | 80 m |  | 2 | probable | parish-chelsea-falcke-baptisms | Corrected. The directory put the pin on the new St Luke's, Sydney Street, which was not consecrated until 1824. Before then St Luke's was the old parish church by the river, now Chelsea Old Church, so the 1818 and 1822 baptisms were there. |
| St Margaret, Ward End (`st-margaret-ward-end`) | church | building | pin | 60 m |  | 1 | confirmed | parish-wardend-1873 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. St Margaret, Ward End, Birmingham |
| St Martin in the Bull Ring, Birmingham (`st-martins-birmingham`) | church | building | pin | 60 m |  | 1 | confirmed | parish-birmingham-1827 | Corrected: the directory's point was off the church. |
| St Mary's Church, Wanstead (`st-marys-church-wanstead`) | church | building | pin | 60 m |  | 3 | confirmed, probable | album-1950 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Mary's Church, Wanstead, United Kingdom |
| St Mary's, Battersea (`st-marys-battersea`) | church | building | pin | 60 m |  | 13 | confirmed | burial-falcke-1849, parish-battersea-1837, parish-battersea-1861, parish-battersea-falcke-baptisms, parish-battersea-falcke-marriages, parish-falcke-1817 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Mary's, Battersea, United Kingdom |
| St Mary, Whitechapel (`st-mary-whitechapel`) | church | building | pin | 60 m |  | 1 | confirmed | parish-whitechapel-1827 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. The site of St Mary Whitechapel, now Altab Ali Park |
| St Matthew's, Brixton (`st-matthews-brixton`) | church | building | pin | 60 m |  | 1 | confirmed | parish-brixton-1897 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Matthew's, Brixton, United Kingdom |
| St Olave registration district (`st-olave-registration-district`) | registration district | registration district | area | 2000 m |  | 1 | probable | gro-cousins-gall | Drawn as an approximate area, a circle of about 2 km round the district. St Olave district: Bermondsey and Rotherhithe by the river. |
| St Pancras (`st-pancras`) | town | town | halo | 2000 m |  | 1 | probable | census-1891-spencer | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Pancras, United Kingdom |
| St Peter, London Docks (`st-peter-london-docks`) | church | building | pin | 80 m |  | 1 | probable | gro-cousins-gall | Placed on St Peter's church, Wapping Lane, which stands in the London Docks parish. |
| St Philip's, Stepney (`st-philips-stepney`) | church | building | pin | 60 m |  | 1 | confirmed | parish-stepney-1871 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Philip's, Stepney, United Kingdom |
| Staines (`staines`) | town | town | halo | 2000 m |  | 2 | confirmed | news-1936-simmons | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Staines, United Kingdom |
| Stanbridge, Bedfordshire (`stanbridge-bedfordshire`) | town | town | halo | 2000 m |  | 1 | probable | census-andrews-stacey | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Stanbridge, Bedfordshire, United Kingdom |
| Stepney (`stepney`) | town | town | halo | 2000 m | Stepney | 3 | confirmed, probable | gro-cousins-gall, parish-stepney-1832, parish-stepney-1871 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Stepney, United Kingdom |
| Stoke Damerel registration district (`stoke-damerel-registration-district`) | registration district | registration district | area | 3000 m |  | 1 | probable | census-bennett, gro-bennett-grigg | Drawn as an approximate area, a circle of about 3 km round the district. Stoke Damerel district: Devonport. |
| Stratford attestation office (`stratford-attestation`) | military site | town | halo | 1500 m |  | 1 | confirmed | ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The attestation office is not placed, so the circle covers Stratford. |
| Stuart studio, 47 and 49 Brompton Road, Knightsbridge (`stuart-brompton-road`) | studio | address | pin | 120 m |  | 1 | probable | stuart-card | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Brompton Road, Knightsbridge. The studio numbers 47 and 49 were not matched, so the point is the street. |
| Sutton Road, Aston Manor (`sutton-road-aston`) | home | street | halo | 1500 m |  | 1 | probable | census-1881-aston | Sutton Road in Aston Manor has not been found on a map. The circle covers Aston Manor, the place the census names. |
| The Nest, Chester Road, Erdington (`the-nest-erdington`) | home | address | halo | 900 m |  | 1 | probable | probate-fanny-1917 | OpenStreetMap Nominatim search on 23 November 2026 (osm-nominatim-2026), as in the address directory. The Nest was a house on Chester Road; the point is on the road, not the house. |
| Thetford, Norfolk (`thetford-norfolk`) | town | town | halo | 2000 m |  | 1 | probable | census-cousins, parish-stepney-1871 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Thetford, Norfolk, United Kingdom |
| Totternhoe, Bedfordshire (`totternhoe-bedfordshire`) | town | town | halo | 2000 m |  | 4 | probable | census-andrews-stacey, register-1939 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Totternhoe, Bedfordshire, United Kingdom |
| Tower of London (`tower-of-london`) | workplace | building | pin | 150 m |  | 1 | confirmed | parish-birmingham-1827, parish-stepney-1829, parish-stepney-1832, parish-whitechapel-1827 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Tower of London, United Kingdom |
| Tura, south of Cairo, Egypt (`tura`) | military site | town | halo | 6000 m |  | 1 | confirmed | ron-album | Corrected. The directory's point was Tura in Hungary. This is Tura on the Nile south of Cairo, where No. 111 Maintenance Unit worked in the old quarry caves (wiki-raf-tura). The caves are not placed exactly. |
| Uxbridge registration district (`uxbridge-registration-district`) | registration district | registration district | area | 9000 m |  | 1 | probable | gro-lilian-death | Drawn as an approximate area, a circle of about 9 km round the district. Uxbridge district: Uxbridge, Hayes, Harlington and the villages round them. |
| Royal Victoria Dock (the Victoria Docks) (`victoria-docks`) | workplace | building | halo | 1000 m |  | 1 | family tradition | family-arthur-cousins-1912 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Royal Victoria Dock, London, UK |
| Wandsworth registration district (`wandsworth-registration-district`) | registration district | registration district | area | 5000 m |  | 2 | probable | census-1911-whitstable, electoral-fitzmaurice, gro-indexes, probate-reg-1977 | Drawn as an approximate area, a circle of about 5 km round the district. Wandsworth district: Wandsworth, Clapham, Putney, Streatham and Tooting. |
| Ward End, Aston (`ward-end-aston`) | parish | parish | area | 2000 m |  | 1 | confirmed | gro-indexes, parish-wardend-1873 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Ward End, Birmingham |
| West Ham registration district (`west-ham-registration-district`) | registration district | registration district | area | 4500 m |  | 15 | confirmed, probable | burial-chingford-1928, census-1921-may, census-cousins, family-testimony, findagrave-214209661, freebmd-arthur-cousins-1912, gro-cousins-gall, gro-indexes, register-1939 | Drawn as an approximate area, a circle of about 4 km round the district. West Ham district. |
| Whitstable (`whitstable`) | town | town | halo | 2000 m | Whitstable | 2 | confirmed, probable | census-1911-whitstable, passenger-1923-armadale | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Whitstable, United Kingdom |
| Woolwich Dockyard (`woolwich-dockyard`) | military site | building | halo | 400 m |  | 1 | confirmed | ww1-andrews-file | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Woolwich Dockyard, London, UK |
| Brixham, Devon (`orkney-brixham-devon`) | town | town | halo | 2000 m |  | 1 | confirmed | marries-clipping | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Brixham, Devon, United Kingdom |
| Cliveden and Taplow, Buckinghamshire (`orkney-cliveden-and-taplow-buckinghamshire`) | venue | building | pin | 80 m |  | 1 | confirmed | wiki-george-orkney | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Cliveden House, Taplow |
| Dublin (`orkney-dublin`) | town | town | halo | 2000 m |  | 1 | confirmed | wiki-lansdowne | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Dublin |
| Hamilton Palace (`orkney-hamilton-palace`) | home | address | pin | 40 m |  | 1 | confirmed | wiki-marquess-2 | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Hamilton Palace |
| Holyrood Abbey, Edinburgh (`orkney-holyrood-abbey-edinburgh`) | church | building | pin | 80 m |  | 1 | confirmed | wiki-james-ii | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Holyrood Abbey, Edinburgh |
| Lantern Hatch, Itchingfield, near Horsham, Sussex (`orkney-lantern-hatch-itchingfield-near-horsham-sussex`) | home | address | halo | 2000 m |  | 1 | confirmed | korea-clipping | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Itchingfield. Lantern Hatch itself was not found, so the point is the village. |
| London (`orkney-london`) | town | town | halo | 2000 m |  | 1 | probable | site-earlier | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: London, United Kingdom |
| Roxburgh Castle (`orkney-roxburgh-castle`) | venue | building | pin | 80 m |  | 1 | confirmed | wiki-james-ii | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Roxburgh Castle |
| St Mary's, Brixham (`orkney-st-marys-brixham`) | church | building | pin | 80 m |  | 1 | confirmed | marries-clipping, peerage-cecil | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: St Mary's, Brixham, United Kingdom |
| Stirling (`orkney-stirling`) | town | town | halo | 2000 m |  | 1 | confirmed | wiki-mary-stewart | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Query: Stirling |
| The Tythe House, Stewkley, near Leighton Buzzard (`orkney-the-tythe-house-stewkley-near-leighton-buzzard`) | home | address | halo | 2000 m |  | 1 | confirmed | korea-clipping | OpenStreetMap Nominatim search on 23 November 2026, source osm-nominatim-2026. Stewkley. The Tythe House itself was not found, so the point is the village. |
| Abbots Langley (`abbots-langley`) | town | town | halo | 1500 m |  | 1 | probable | census-andrews-stacey | Added in the map build for a place the page names. Town centre; the census does not give a house. Placed at the centre of the town or area with a wide circle. |
| St Marylebone (`st-marylebone`) | parish | parish | area | 1500 m |  | 1 | probable | census-1861-marylebone-rwf | Added in the map build for a place the page names. The parish; the lodging house is not named on the page. Placed at the centre of the town or area with a wide circle. |
| Luton registration district (`luton-registration-district`) | registration district | registration district | area | 10000 m |  | 1 | probable | census-andrews-stacey, marriage-index-1863-andrews-field | Added in the map build for a place the page names. Luton district: Luton, Dunstable and the villages round them, including Totternhoe. Placed at the centre of the town or area with a wide circle. |

## Place by place: what was checked and what changed

- **1 Honey Street, Bodmin** (`1-honey-street-bodmin`): uncertainty 40 m to 100 m.
- **10 Riles Road, Plaistow** (`10-riles-road`): coordinates added (51.5280, 0.0240, about 1500 m); uncertainty None m to 1500 m.
- **113 Bourne Avenue, Harlington** (`113-bourne-avenue`): uncertainty 40 m to 450 m.
- **118 Keeton Road, Bermondsey** (`118-keeton-road`): uncertainty 200 m to 300 m.
- **13 Gladding Road, Manor Park** (`13-gladding-road`): uncertainty 40 m to 100 m.
- **14 Waterloo Road, Whitstable** (`14-waterloo-road-whitstable`): uncertainty 40 m to 100 m.
- **15 Mornington Place, St Pancras** (`15-mornington-place`): uncertainty 40 m to 120 m.
- **16 York Road, Edgbaston** (`16-york-road-edgbaston`): uncertainty 40 m to 100 m.
- **2 Elm Terrace, Wandsworth Road** (`2-elm-terrace`): moved from (51.4639, -0.1868) to (51.4705, -0.1395); uncertainty 40 m to 1200 m.
- **23 Sutton Court Road, Plaistow** (`23-sutton-court-road`): uncertainty 40 m to 100 m.
- **25 Compton Avenue, Brighton** (`25-compton-avenue`): uncertainty 40 m to 100 m.
- **26 Turret Grove, Clapham** (`26-turret-grove`): uncertainty 40 m to 100 m.
- **Young Street, Canning Town (Nos. 3 and 5)** (`3-young-street`): merged into `young-street-canning-town`: William at No. 3 and his son Robert at No. 5, next door, are one place on the map, as on the page.; coordinates added (51.5097, 0.0245, about 350 m).
- **33 New Street, London Docks** (`33-new-street`): coordinates added (51.5062, -0.0581, about 900 m); uncertainty None m to 900 m.
- **34 Blythe Road, Hammersmith** (`34-blythe-road`): uncertainty 40 m to 100 m.
- **40 Fisher Street, Canning Town** (`40-fisher-street`): uncertainty 40 m to 100 m.
- **42 Nestles Avenue, Hayes** (`42-nestles-avenue`): uncertainty 200 m to 250 m.
- **48 Oxford Road South, Gunnersbury** (`48-oxford-road-south`): uncertainty 40 m to 100 m.
- **Young Street, Canning Town (Nos. 3 and 5)** (`5-young-street`): merged into `young-street-canning-town`: William at No. 3 and his son Robert at No. 5, next door, are one place on the map, as on the page.; coordinates added (51.5097, 0.0245, about 350 m).
- **55 Bourne Avenue, Hayes** (`55-bourne-avenue`): uncertainty 40 m to 450 m.
- **55 Seymour Street, Higher Tranmere, Birkenhead** (`55-seymour-street`): uncertainty 200 m to 250 m; renamed to "55 Seymour Street, Higher Tranmere, Birkenhead".
- **57 Rutland Street, Stepney** (`57-rutland-street`): coordinates added (51.5174, -0.0462, about 1500 m); uncertainty None m to 1500 m.
- **6 Cathles Road, Balham Hill** (`6-cathles-road`): uncertainty 40 m to 100 m.
- **7 North Lane, Clapham Common** (`7-north-lane`): merged into `7-north-clapham-common`: Three 1925 passenger lists write the same number three ways. Which street is right is not known, so one place covers all three readings with a wide circle.; coordinates added (51.4638, -0.1508, about 1000 m).
- **7 North Lane, Clapham Common** (`7-north-side`): merged into `7-north-clapham-common`: Three 1925 passenger lists write the same number three ways. Which street is right is not known, so one place covers all three readings with a wide circle.; moved from (51.4613, -0.1593) to (51.4638, -0.1508).
- **7 North Lane, Clapham Common** (`7-north-street`): merged into `7-north-clapham-common`: Three 1925 passenger lists write the same number three ways. Which street is right is not known, so one place covers all three readings with a wide circle.; moved from (51.4664, -0.1424) to (51.4638, -0.1508).
- **92 Harper Road, West Ham** (`92-harper-road`): moved from (51.4968, -0.0938) to (51.5250, 0.0150); uncertainty 40 m to 2500 m.
- **94 Bury Road, Hemel Hempstead** (`94-bury-road`): uncertainty 40 m to 100 m.
- **A.S.C. Mobilization Store, Aldershot** (`aldershot-asc`): uncertainty 2000 m to 2500 m.
- **St John the Baptist, Aldenham** (`aldenham-church`): renamed to "St John the Baptist, Aldenham"; stands today: yes.
- **Aldenham, Hertfordshire** (`aldenham-hertfordshire`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **Aston** (`aston`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Aston Manor** (`aston-manor`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Battersea** (`battersea`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Berkeley Lodge, Wimbledon** (`berkeley-lodge`): uncertainty 2000 m to 2500 m.
- **Bermondsey** (`bermondsey`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Blean registration district** (`blean-registration-district`): moved from (51.3092, 1.0414) to (51.3300, 1.0800); uncertainty 4000 m to 10000 m.
- **Bodmin** (`bodmin`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Bolingbroke Gardens, Battersea** (`bolingbroke-gardens`): coordinates added (51.4708, -0.1722, about 1500 m); uncertainty None m to 1500 m.
- **Braintree, Essex** (`braintree-essex`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Bridge registration district** (`bridge-registration-district`): moved from (51.2456, 1.1253) to (51.2450, 1.1250); uncertainty 4000 m to 9000 m.
- **Brighton** (`brighton`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Brixton** (`brixton`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Burton Court, Chelsea** (`burton-court`): removed. Not a place in the family's life. Burton Court, Chelsea, was the Ministry of Pensions office that asked for Henry George's papers in August 1920; he never worked there. The request stays in the text of his card at Woolwich Dockyard.
- **Bushey** (`bushey`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Canning Town** (`canning-town`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Canning Town and Plaistow** (`canning-town-and-plaistow`): removed. Not a place: a joined label from people.json. Herbert's 1911 to 1921 home is 40 Fisher Street, Canning Town, on the page.
- **Canterbury** (`canterbury`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Cape Supreme Court, Cape Town** (`cape-supreme-court`): coordinates added (-33.9249, 18.4241, about 2500 m); uncertainty None m to 2500 m; renamed to "Cape Supreme Court, Cape Town".
- **Cape Town** (`cape-town`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Chalfont, Buckinghamshire** (`chalfont-buckinghamshire`): moved from (51.6681, -0.5612) to (51.6250, -0.5600); uncertainty 2000 m to 4000 m.
- **Chester Road, Boldmere** (`chester-road-boldmere`): uncertainty 200 m to 900 m.
- **Chingford Mount Cemetery** (`chingford-mount-cemetery`): uncertainty 80 m to 150 m; stands today: yes.
- **Chiswick** (`chiswick`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Claims Record Office, Kew** (`claims-record-office`): uncertainty 2000 m to 1500 m.
- **Clifton Ville, Westgate Terrace, Whitstable** (`clifton-ville-whitstable`): coordinates added (51.3606, 1.0241, about 700 m); uncertainty None m to 700 m.
- **Colchester** (`colchester`): checked: name, kind, precision and point agree with the page and the records; no change.
- **St John the Baptist Parish Church, Crowthorne** (`st-john-the-baptist-crowthorne`): uncertainty 80 m to 100 m; stands today: yes.
- **Crystal Palace dispersal unit** (`crystal-palace`): uncertainty 80 m to 250 m; stands today: demolished.
- **Denham** (`denham`): checked: name, kind, precision and point agree with the page and the records; no change.
- **St Mary's, Denham** (`denham-church`): uncertainty 80 m to 250 m; renamed to "St Mary's, Denham"; stands today: yes.
- **Denmark Street, Watford** (`denmark-street-watford`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Durban** (`port-durban`): checked: name, kind, precision and point agree with the page and the records; no change.
- **East Ham** (`east-ham`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **East Ham Isolation Hospital** (`east-ham-isolation-hospital`): coordinates added (51.5248, 0.0478, about 250 m); uncertainty None m to 250 m; stands today: demolished.
- **East Ham registration district** (`east-ham-registration-district`): moved from (51.5394, 0.0526) to (51.5400, 0.0550); uncertainty 4000 m to 3500 m.
- **Edgbaston** (`edgbaston`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **Egloshayle, Cornwall** (`egloshayle-cornwall`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Erdington** (`erdington`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Essex South Western registration district** (`essex-south-western-registration-district`): coordinates added (51.5850, 0.0100, about 6500 m); uncertainty None m to 6500 m.
- **Feltham, Middlesex** (`feltham-middlesex`): checked: name, kind, precision and point agree with the page and the records; no change.
- **France, Expeditionary Force** (`france-ef`): uncertainty 80000 m to 300000 m.
- **Greenwich registration district** (`greenwich-registration-district`): moved from (51.4821, -0.0045) to (51.4800, 0.0000).
- **Hackney** (`hackney`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Halstead** (`halstead`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Ham Farm, Aldenham** (`ham-farm`): coordinates added (51.6600, -0.3480, about 2500 m); uncertainty None m to 2500 m.
- **Hammersmith registration district** (`hammersmith-registration-district`): moved from (51.4920, -0.2236) to (51.4970, -0.2250); uncertainty 4000 m to 3000 m.
- **Hampton Hill** (`hampton-hill`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Harrow, Middlesex** (`harrow-middlesex`): uncertainty 8000 m to 3000 m.
- **Hayes** (`hayes`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Hemel Hempstead** (`hemel-hempstead`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **High Cross, Aldenham** (`high-cross-aldenham`): uncertainty 500 m to 600 m.
- **Islington** (`islington`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Islington and St Pancras** (`islington-and-st-pancras`): removed. Not a place: a joined label from people.json. Edith's 1891 home is 15 Mornington Place, St Pancras.
- **J. Perriman's studio, 3 Greenland Place, Camden Town** (`perriman-greenland-place`): uncertainty 40 m to 120 m; renamed to "J. Perriman's studio, 3 Greenland Place, Camden Town".
- **Kent** (`kent`): uncertainty 20000 m to 40000 m.
- **King's Norton registration district** (`kings-norton-registration-district`): moved from (52.4073, -1.9293) to (52.4400, -1.9200); uncertainty 4000 m to 7000 m.
- **Lambeth registration district** (`lambeth-registration-district`): moved from (51.4952, -0.1163) to (51.4680, -0.1150); uncertainty 4000 m to 4500 m.
- **Lang Sims studio, Brixton Road** (`lang-sims-brixton`): uncertainty 200 m to 250 m.
- **Lang Sims studio, Folkestone** (`lang-sims-folkestone`): removed. The site never mentions Folkestone. The card names a second Lang Sims studio there, but the site says the portrait is probably Edith at Brixton, so only Brixton Road is mapped.
- **Leavesden** (`leavesden`): checked: name, kind, precision and point agree with the page and the records; no change.
- **All Saints, Leavesden** (`leavesden-church`): moved from (51.6914, -0.4144) to (51.6955, -0.3884); uncertainty 80 m to 60 m; renamed to "All Saints, Leavesden"; stands today: yes.
- **Leicester** (`leicester`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Letchmore Heath** (`letchmore-heath`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Lewisham registration district** (`lewisham-registration-district`): moved from (51.4624, -0.0102) to (51.4450, 0.0100); uncertainty 4000 m to 5000 m.
- **Little Bromwich, Aston** (`little-bromwich-aston`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Liverpool** (`port-liverpool`): moved from (53.3933, -2.9166) to (53.4047, -2.9958); uncertainty 2000 m to 1000 m.
- **Mansell Street, Whitechapel** (`mansell-street`): uncertainty 200 m to 300 m.
- **Mead Cottage, Bushey** (`mead-cottage`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Mile End Old Town** (`mile-end-old-town`): moved from (51.5313, -0.0420) to (51.5215, -0.0440).
- **Patchetts Green, Aldenham** (`patchetts-green`): uncertainty 2000 m to 900 m.
- **Plaistow** (`plaistow`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Plymouth Road, Canning Town** (`plymouth-road-canning-town`): uncertainty 200 m to 300 m.
- **Plymouth registration district** (`plymouth-registration-district`): coordinates added (50.3760, -4.1430, about 6000 m); uncertainty None m to 6000 m.
- **Poplar registration district** (`poplar-registration-district`): moved from (51.5111, -0.0145) to (51.5100, -0.0150); uncertainty 4000 m to 3000 m.
- **Port of London** (`port-london`): uncertainty 2000 m to 6000 m.
- **Queen Street, Chelsea** (`queen-street-chelsea`): moved from (51.4893, -0.1755) to (51.4868, -0.1660); uncertainty 200 m to 300 m; modern address: Flood Street, Chelsea.
- **Royal Albert Docks, London** (`royal-albert-docks`): moved from (53.4001, -2.9925) to (51.5075, 0.0640); uncertainty 80 m to 1500 m; renamed to "Royal Albert Docks, London"; stands today: yes.
- **Royal filling factory, Woolwich** (`royal-filling-factory`): uncertainty 2000 m to 2500 m.
- **Saint John, New Brunswick** (`port-saint-john`): checked: name, kind, precision and point agree with the page and the records; no change.
- **South Africa** (`south-africa`): uncertainty 80000 m to 600000 m.
- **Southampton** (`port-southampton`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Spelthorne district, Middlesex** (`spelthorne-registration-district`): coordinates added (51.4550, -0.4500, about 9000 m); uncertainty None m to 9000 m; renamed to "Spelthorne district, Middlesex"; kind registration district to district.
- **St Albans Abbey** (`st-albans-abbey`): stands today: yes.
- **St Albans, Hertfordshire** (`st-albans-hertfordshire`): checked: name, kind, precision and point agree with the page and the records; no change.
- **St Andrew's, Plaistow** (`st-andrews-plaistow`): uncertainty 80 m to 60 m; stands today: yes.
- **St Columb registration district** (`st-columb-registration-district`): moved from (50.4243, -5.0235) to (50.4240, -5.0000); uncertainty 4000 m to 12000 m.
- **St Dunstan, Stepney** (`st-dunstan-stepney`): stands today: yes.
- **St John, Hackney** (`st-john-hackney`): stands today: yes.
- **St Luke, Chelsea (the old parish church, now Chelsea Old Church)** (`st-luke-chelsea`): moved from (51.4896, -0.1694) to (51.4830, -0.1708); renamed to "St Luke, Chelsea (the old parish church, now Chelsea Old Church)"; stands today: rebuilt.
- **St Margaret, Ward End** (`st-margaret-ward-end`): uncertainty 80 m to 60 m; stands today: yes.
- **St Martin in the Bull Ring, Birmingham** (`st-martins-birmingham`): moved from (52.4719, -1.8882) to (52.4770, -1.8932); uncertainty 80 m to 60 m; renamed to "St Martin in the Bull Ring, Birmingham"; stands today: rebuilt.
- **St Mary's Church, Wanstead** (`st-marys-church-wanstead`): uncertainty 80 m to 60 m; stands today: yes.
- **St Mary's, Battersea** (`st-marys-battersea`): uncertainty 80 m to 60 m; stands today: yes.
- **St Mary, Whitechapel** (`st-mary-whitechapel`): uncertainty 80 m to 60 m; stands today: demolished.
- **St Matthew's, Brixton** (`st-matthews-brixton`): uncertainty 80 m to 60 m; stands today: yes.
- **St Olave registration district** (`st-olave-registration-district`): coordinates added (51.4970, -0.0700, about 2000 m); uncertainty None m to 2000 m.
- **St Pancras** (`st-pancras`): checked: name, kind, precision and point agree with the page and the records; no change.
- **St Peter, London Docks** (`st-peter-london-docks`): coordinates added (51.5062, -0.0581, about 80 m); uncertainty None m to 80 m; stands today: yes.
- **St Philip's, Stepney** (`st-philips-stepney`): uncertainty 80 m to 60 m; stands today: rebuilt.
- **Staines** (`staines`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Stanbridge, Bedfordshire** (`stanbridge-bedfordshire`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Stepney** (`stepney`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Stoke Damerel registration district** (`stoke-damerel-registration-district`): uncertainty 4000 m to 3000 m.
- **Stratford attestation office** (`stratford-attestation`): uncertainty 2000 m to 1500 m.
- **Stuart studio, 47 and 49 Brompton Road, Knightsbridge** (`stuart-brompton-road`): uncertainty 200 m to 120 m; renamed to "Stuart studio, 47 and 49 Brompton Road, Knightsbridge".
- **Sutton Road, Aston Manor** (`sutton-road-aston`): coordinates added (52.5158, -1.8728, about 1500 m); uncertainty None m to 1500 m.
- **The Nest, Chester Road, Erdington** (`the-nest-erdington`): uncertainty 40 m to 900 m.
- **Thetford, Norfolk** (`thetford-norfolk`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Totternhoe, Bedfordshire** (`totternhoe-bedfordshire`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Tower of London** (`tower-of-london`): uncertainty 80 m to 150 m; stands today: yes.
- **Tura, south of Cairo, Egypt** (`tura`): moved from (47.6093, 19.5949) to (29.9300, 31.3000); uncertainty 2000 m to 6000 m; renamed to "Tura, south of Cairo, Egypt".
- **Uxbridge registration district** (`uxbridge-registration-district`): moved from (51.5450, -0.4817) to (51.5400, -0.4700); uncertainty 4000 m to 9000 m.
- **Royal Victoria Dock (the Victoria Docks)** (`victoria-docks`): uncertainty 80 m to 1000 m; renamed to "Royal Victoria Dock (the Victoria Docks)"; stands today: yes.
- **Wandsworth registration district** (`wandsworth-registration-district`): moved from (51.4570, -0.1933) to (51.4550, -0.1650); uncertainty 4000 m to 5000 m.
- **Ward End, Aston** (`ward-end-aston`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Watford** (`watford`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **West Ham registration district** (`west-ham-registration-district`): moved from (51.5281, 0.0046) to (51.5300, 0.0100); uncertainty 4000 m to 4500 m.
- **Whitechapel** (`whitechapel`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **Whitstable** (`whitstable`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Wimbledon** (`wimbledon`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **Windsor** (`windsor`): removed. Pat's birthplace as the family remembers it. Records beat memory: the birth is mapped at the Hammersmith district and the card says the family remembers Windsor (family). The old point was also wrong (near Lambourn, 60 km west of Windsor).
- **Woolwich** (`woolwich`): removed. Superseded: every fact that pointed here now points at a more precise place on the same record (see the place table).
- **Woolwich Dockyard** (`woolwich-dockyard`): uncertainty 80 m to 400 m.
- **Y.M.C.A., Saint John** (`ymca-saint-john`): removed. Reg's stated destination in Saint John, not a place he is known to have been. Kept as words on the Saint John voyage card.
- **Brixham, Devon** (`orkney-brixham-devon`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Cliveden and Taplow, Buckinghamshire** (`orkney-cliveden-and-taplow-buckinghamshire`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Dublin** (`orkney-dublin`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Hamilton Palace** (`orkney-hamilton-palace`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Holyrood Abbey, Edinburgh** (`orkney-holyrood-abbey-edinburgh`): stands today: yes.
- **Lantern Hatch, Itchingfield, near Horsham, Sussex** (`orkney-lantern-hatch-itchingfield-near-horsham-sussex`): checked: name, kind, precision and point agree with the page and the records; no change.
- **London** (`orkney-london`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Roxburgh Castle** (`orkney-roxburgh-castle`): checked: name, kind, precision and point agree with the page and the records; no change.
- **St Mary's, Brixham** (`orkney-st-marys-brixham`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Stirling** (`orkney-stirling`): checked: name, kind, precision and point agree with the page and the records; no change.
- **The Tythe House, Stewkley, near Leighton Buzzard** (`orkney-the-tythe-house-stewkley-near-leighton-buzzard`): checked: name, kind, precision and point agree with the page and the records; no change.
- **Abbots Langley** (`abbots-langley`): added. The page names it; Added in the map build for a place the page names. Town centre; the census does not give a house. Placed at the centre of the town or area with a wide circle.
- **St Marylebone** (`st-marylebone`): added. The page names it; Added in the map build for a place the page names. The parish; the lodging house is not named on the page. Placed at the centre of the town or area with a wide circle.
- **Luton registration district** (`luton-registration-district`): added. The page names it; Added in the map build for a place the page names. Luton district: Luton, Dunstable and the villages round them, including Totternhoe. Placed at the centre of the town or area with a wide circle.

## Event by event

Each of the 280 directory events, and what became of it. Facts already in people.json are now built from people.json (marked "fact"); the rest are page events (marked "page").

| # | Directory place | Type | People | Date as entered | Outcome |
|---|---|---|---|---|---|
| 1 | `1-honey-street-bodmin` | lived | Charles Bennett, Annie Bennett | 1901 | fact: corrected, now at `bodmin` (the place the record gives at the right precision) |
| 2 | `10-riles-road` | lived | Herbert C. Cousins | 1911 | page: checked against the crop and caption; kept |
| 3 | `113-bourne-avenue` | lived | Baron Reginald FitzMaurice, Eileen Sybil FitzMaurice | 1936 to 1937 | fact: corrected, now at `spelthorne-registration-district` (the place the record gives at the right precision) |
| 4 | `118-keeton-road` | lived | William Cousins, Annie Cousins, Arthur E. Cousins | 1881 | page: checked against the crop and caption; kept |
| 5 | `13-gladding-road` | lived | Rosina Maud Andrews | 1901 | page: checked against the crop and caption; kept |
| 6 | `14-waterloo-road-whitstable` | lived | Edward Dixon FitzMaurice | 15 October 1923 | fact: checked; corrected date now as the record words it: "1923" |
| 7 | `15-mornington-place` | lived | Edith Madeline FitzMaurice, Caroline Spencer | 1891. The house number may read 15b. | fact: checked; corrected date now as the record words it: "1891" |
| 8 | `16-york-road-edgbaston` | died | Robert W. FitzMaurice | 10 May 1895 | fact: checked; corrected date now as the record words it: "10 May 1895, Edgbaston, aged 64" |
| 9 | `2-elm-terrace` | lived | Fanny Mary Falcke | 1861 | page: checked against the crop and caption; kept |
| 10 | `23-sutton-court-road` | lived | William Cousins, Amelia Cousins, Henry George Andrews, Rosina Maud Andrews, Sidney George Andrews | 1911 to 19 April 1941 | fact: checked; corrected people now Henry George Andrews, Rosina Maud Andrews; date now as the record words it: "1921 to 1941"; crops now none |
| 11 | `25-compton-avenue` | lived | Edward Dixon FitzMaurice | 1891, schedule 206, lodger | fact: checked; corrected date now as the record words it: "1891" |
| 12 | `26-turret-grove` | lived | Baron Reginald FitzMaurice | 1925 to 1926 | fact: corrected, now at `wandsworth-registration-district` (the place the record gives at the right precision) |
| 13 | `3-young-street` | lived | William Cousins | 1901 | page: checked against the crop and caption; kept (merged place) |
| 14 | `33-new-street` | lived | Arthur E. Cousins | 9 January 1872 | fact: corrected, now at `mile-end-old-town` (the place the record gives at the right precision) |
| 15 | `34-blythe-road` | lived | Baron Reginald FitzMaurice, Eileen Sybil FitzMaurice | 1931 to 1933 | fact: corrected, now at `hammersmith-registration-district` (the place the record gives at the right precision) |
| 16 | `40-fisher-street` | lived | Herbert Andrews, Lucy Andrews, Henry George Andrews | 1911 | fact: checked; corrected people now Herbert Andrews, Lucy Andrews; date now as the record words it: "1911 to 1921" |
| 17 | `42-nestles-avenue` | lived | Baron Reginald FitzMaurice | 1938 to 1977 | fact: checked; corrected date now as the record words it: "1938 to about 1972" |
| 18 | `48-oxford-road-south` | lived | May F. Cousins | 1948 | fact: corrected, now at `chiswick` (the place the record gives at the right precision) |
| 19 | `5-young-street` | lived | Robert H. Cousins | 1901 | page: checked against the crop and caption; kept (merged place) |
| 20 | `55-bourne-avenue` | lived | Eileen Sybil FitzMaurice, Leslie Hugh Simmons | 1939 | fact: checked; matches the page and its source |
| 21 | `55-seymour-street` | lived | Edith Madeline FitzMaurice | 24 November 1925 | page: checked against the crop and caption; kept |
| 22 | `57-rutland-street` | lived | William Cousins | 15 January 1871 | fact: corrected, now at `st-philips-stepney` (the place the record gives at the right precision) |
| 23 | `6-cathles-road` | lived | Caroline Spencer | 1911 | page: checked against the crop and caption; kept |
| 24 | `7-north-lane` | lived | Baron Reginald FitzMaurice | 7 February 1925 | page: checked against the crop and caption; kept (merged place) |
| 25 | `7-north-side` | sailed | Baron Reginald FitzMaurice | 15 February 1925 | page: now a voyage in people.json, drawn as an arc between its ports |
| 26 | `7-north-street` | lived | Baron Reginald FitzMaurice | 14 March 1925 | page: checked against the crop and caption; kept (merged place) |
| 27 | `92-harper-road` | lived | William Cousins, Annie Cousins | 1891 | page: checked against the crop and caption; kept |
| 28 | `94-bury-road` | lived | Herbert Andrews, Lucy Andrews, Henry George Andrews | 1901 | fact: checked; matches the page and its source |
| 29 | `aldershot-asc` | served | Henry George Andrews | 13 November 1916 | page: checked against the crop and caption; kept |
| 30 | `aldenham-church` | baptised | Mary Stacey | 4 November 1838 | fact: checked; corrected date now as the record words it: "baptised 4 November 1838" |
| 31 | `aldenham-hertfordshire` | lived | Henry Stacey | 1871 | fact: corrected, now at `patchetts-green` (the place the record gives at the right precision) |
| 32 | `aldenham-hertfordshire` | born | Mary Stacey | 1838-11-04 | fact: corrected, now at `aldenham-church` (the place the record gives at the right precision) |
| 33 | `aldenham-hertfordshire` | lived | George Andrews | 1881 | fact: corrected, now at `high-cross-aldenham` (the place the record gives at the right precision) |
| 34 | `aston` | lived | Edward Dixon FitzMaurice | 1872 to 1881 | fact: checked; matches the page and its source |
| 35 | `aston` | worked | Robert W. FitzMaurice | 1871 | fact: checked; matches the page and its source |
| 36 | `aston` | born | Arthur Percy FitzMaurice | summer 1867, Aston | fact: checked; matches the page and its source |
| 37 | `aston` | born | Walter FitzMaurice | late 1869, Aston | fact: checked; matches the page and its source |
| 38 | `aston-manor` | lived | Robert W. FitzMaurice | 1881 | fact: corrected, now at `sutton-road-aston` (the place the record gives at the right precision) |
| 39 | `aston-manor` | worked | Robert W. FitzMaurice | 1881 | fact: checked; matches the page and its source |
| 40 | `battersea` | died | William G. Falcke | 1849-08-27 | fact: not mapped; the fact has no place in people.json |
| 41 | `battersea` | worked | William G. Falcke | 1817 to 1849 | fact: checked; corrected crops now 1841-falcke-household-battersea.jpg |
| 42 | `battersea` | born | Eliza C. Falcke | about 1821, as aged 20 in 1841 | fact: checked; matches the page and its source |
| 43 | `battersea` | born | Jane Falcke | about 1826, as aged 15 in 1841 | fact: checked; matches the page and its source |
| 44 | `battersea` | born | Charlotte Falcke | about 1828, as aged 13 in 1841 | fact: checked; matches the page and its source |
| 45 | `battersea` | born | Elizabeth Falcke | about 1830, as aged 11 in 1841 | fact: checked; matches the page and its source |
| 46 | `battersea` | born | Frederick Falcke | about 1832, as aged 9 in 1841 | fact: checked; matches the page and its source |
| 47 | `battersea` | born | Emily Falcke | about 1834, as aged 7 in 1841 | fact: checked; matches the page and its source |
| 48 | `battersea` | born | Fanny Mary Falcke | 1836-12-03 | fact: checked; corrected date now as the record words it: "3 December 1836" |
| 49 | `berkeley-lodge` | worked | Herbert Andrews | 1881 | fact: checked; matches the page and its source |
| 50 | `bermondsey` | born | Rosina Maud Andrews | 1881-11-14 | fact: checked; corrected date now as the record words it: "14 November 1881, Bermondsey" |
| 51 | `bermondsey` | worked | William Cousins | 1881 | fact: checked; matches the page and its source |
| 52 | `blean-registration-district` | born | Eileen Sybil FitzMaurice | late 1907, Blean district, Kent | fact: checked; matches the page and its source |
| 53 | `bodmin` | born | Lilian FitzMaurice | about March 1900, Bodmin | fact: checked; matches the page and its source |
| 54 | `bodmin` | lived | Lilian FitzMaurice | 1900 to 1911 | fact: checked; matches the page and its source |
| 55 | `bodmin` | died | Charles Bennett | 1925-12-05 | fact: checked; corrected date now as the record words it: "5 December 1925, Bodmin, aged 77"; crops now 1926-charles-bennett-probate-calendar.jpg |
| 56 | `bodmin` | lived | Charles Bennett | 1891 to 1925 | fact: checked; corrected crops now 1891-charles-bennett-household-bodmin.jpg, 1911-charles-bennett-household-bodmin.jpg |
| 57 | `bodmin` | worked | Charles Bennett | 1891 | fact: checked; matches the page and its source |
| 58 | `bodmin` | worked | Charles Bennett | 1901 | fact: checked; matches the page and its source |
| 59 | `bodmin` | worked | Charles Bennett | 1911 | fact: checked; matches the page and its source |
| 60 | `bodmin` | died | Annie Bennett | spring 1912, Bodmin, aged 48 | fact: checked; matches the page and its source |
| 61 | `bodmin` | worked | Annie Bennett | 1911 | fact: checked; matches the page and its source |
| 62 | `bodmin` | born | James A. Bennett | late 1883, Bodmin | fact: checked; matches the page and its source |
| 63 | `bodmin` | died | James A. Bennett | early 1884, Bodmin, aged 0 | fact: checked; matches the page and its source |
| 64 | `bodmin` | born | Gilbert Bennett | late 1884, Bodmin | fact: checked; matches the page and its source |
| 65 | `bodmin` | worked | Gilbert Bennett | 1901 to 1911 | fact: checked; matches the page and its source |
| 66 | `bodmin` | born | Reginald Bennett | late 1886, Bodmin | fact: checked; matches the page and its source |
| 67 | `bodmin` | worked | Reginald Bennett | 1901 | fact: checked; matches the page and its source |
| 68 | `bodmin` | born | Minnie Bennett | spring 1888, Bodmin | fact: checked; matches the page and its source |
| 69 | `bodmin` | worked | Minnie Bennett | 1911 | fact: checked; matches the page and its source |
| 70 | `bodmin` | born | Harry Bennett | spring 1890, Bodmin | fact: checked; matches the page and its source |
| 71 | `bodmin` | born | Sidney Bennett | spring 1892, Bodmin | fact: checked; matches the page and its source |
| 72 | `bodmin` | born | Frederick C. Bennett | spring 1894, Bodmin | fact: checked; matches the page and its source |
| 73 | `bodmin` | died | Frederick C. Bennett | spring 1895, Bodmin, aged 1 | fact: checked; matches the page and its source |
| 74 | `bodmin` | born | Francis Bennett | late 1895, Bodmin | fact: checked; matches the page and its source |
| 75 | `bodmin` | born | Floyd Bennett | summer 1898, Bodmin | fact: checked; matches the page and its source |
| 76 | `bodmin` | born | Harold V. Bennett | spring 1902, Bodmin | fact: checked; matches the page and its source |
| 77 | `bodmin` | died | Harold V. Bennett | early 1904, Bodmin, aged 1 | fact: checked; matches the page and its source |
| 78 | `bolingbroke-gardens` | lived | Elizabeth Falcke | 1851 | page: checked against the crop and caption; kept |
| 79 | `braintree-essex` | died | Herbert C. Cousins | probably early 1953, Braintree district, aged 69 | fact: checked; matches the page and its source |
| 80 | `bridge-registration-district` | died | Edith Madeline FitzMaurice | early 1929, Bridge district, Kent, aged 61 | fact: checked; matches the page and its source |
| 81 | `brighton` | lived | Edward Dixon FitzMaurice | 1891 | fact: corrected, now at `25-compton-avenue` (the place the record gives at the right precision) |
| 82 | `brighton` | worked | Edward Dixon FitzMaurice | 1891 | fact: checked; matches the page and its source |
| 83 | `brixton` | lived | Edward Dixon FitzMaurice | 1897 | fact: checked; corrected people now Edward Dixon FitzMaurice, Edith Madeline FitzMaurice |
| 84 | `brixton` | worked | Edward Dixon FitzMaurice | 1897 | fact: checked; matches the page and its source |
| 85 | `brixton` | worked | Edward Dixon FitzMaurice | 1901 | fact: checked; matches the page and its source |
| 86 | `brixton` | lived | Edith Madeline FitzMaurice | 1897 | fact: checked; corrected people now Edward Dixon FitzMaurice, Edith Madeline FitzMaurice |
| 87 | `burton-court` | worked | Henry George Andrews | 12 August 1920 | page: removed with the place (see above) |
| 88 | `bushey` | lived | Henry Stacey | 1881 to 1891 | fact: checked; corrected crops now 1891-henry-stacey-household-bushey.jpg |
| 89 | `bushey` | married | Herbert Andrews, Lucy Andrews | 1888-05-17 | fact: checked; corrected date now as the record words it: "17 May 1888" |
| 90 | `canning-town` | lived | Henry George Andrews | 1911 | fact: corrected, now at `40-fisher-street` (the place the record gives at the right precision) |
| 91 | `canning-town` | worked | Henry George Andrews | 1911 | fact: checked; matches the page and its source |
| 92 | `canning-town-and-plaistow` | lived | Herbert Andrews | 1911 to 1921 | fact: corrected, now at `40-fisher-street` (the place the record gives at the right precision) |
| 93 | `canterbury` | died | Eileen Sybil FitzMaurice | probably early 1996, Canterbury, aged 88 | fact: checked; matches the page and its source |
| 94 | `cape-supreme-court` | civil case | Edward Robert FitzMaurice | undated | page: checked against the crop and caption; kept |
| 95 | `cape-town` | lived | Edward Dixon FitzMaurice | 1916 to about 1923 | fact: checked; matches the page and its source |
| 96 | `cape-town` | worked | Edward Dixon FitzMaurice | 1923 | fact: checked; matches the page and its source |
| 97 | `chalfont-buckinghamshire` | born | Henry Stacey | about 1801 to 1806, Chalfont | fact: checked; matches the page and its source |
| 98 | `chester-road-boldmere` | lived | Fanny Mary Falcke | 1901 | page: checked against the crop and caption; kept |
| 99 | `chingford-mount-cemetery` | buried | Edward Dixon FitzMaurice | 1928-06-07 | fact: corrected, now at `west-ham-registration-district` (the place the record gives at the right precision) |
| 100 | `chiswick` | lived | May F. Cousins | 1948 to 1967 | fact: checked; matches the page and its source |
| 101 | `claims-record-office` | worked | Lilian FitzMaurice | 1921 | fact: checked; matches the page and its source |
| 102 | `clifton-ville-whitstable` | lived | Edward Dixon FitzMaurice, Edith Madeline FitzMaurice, Edward Robert FitzMaurice, Baron Reginald FitzMaurice, Eileen Sybil FitzMaurice | 1911 | fact: checked; corrected crops now 1911-fitzmaurice-household-whitstable-names.jpg, 1911-fitzmaurice-household-whitstable-occupations.jpg |
| 103 | `colchester` | worked | May F. Cousins | 1939 | fact: checked; corrected crops now 1939-may-f-cousins-register-colchester.jpg |
| 104 | `st-john-the-baptist-crowthorne` | buried | Ronald Andrews | 2010 (family) | fact: corrected; the death has no published place, so the death is listed under "Not yet on the map" and the churchyard carries the burial (family) instead |
| 105 | `st-john-the-baptist-crowthorne` | buried | Patricia Andrews | 2020 (family) | fact: corrected; the death has no published place, so the death is listed under "Not yet on the map" and the churchyard carries the burial (family) instead |
| 106 | `crystal-palace` | served | Henry George Andrews | 5 November 1919 | page: checked against the crop and caption; kept |
| 107 | `denham` | worked | Henry Stacey | 1841 | fact: checked; matches the page and its source |
| 108 | `denham` | born | Henry Stacey | 1834-03-16 | fact: corrected, now at `denham-church` (the place the record gives at the right precision) |
| 109 | `denham` | lived | Henry Stacey | 1834 to 1841 | fact: checked; corrected crops now 1841-stacey-household-denham-p1.jpg |
| 110 | `denham-church` | baptised | Henry Stacey | 16 March 1834 | fact: checked; corrected date now as the record words it: "baptised 16 March 1834" |
| 111 | `denmark-street-watford` | worked | Lucy Andrews | 1881 | fact: checked; matches the page and its source |
| 112 | `port-durban` | sailed | Edith Madeline FitzMaurice | 24 November 1925, from Durban on the Saxon | page: now a voyage in people.json, drawn as an arc between its ports |
| 113 | `east-ham` | worked | May F. Cousins | 1921 | fact: corrected, now at `east-ham-isolation-hospital` (the place the record gives at the right precision) |
| 114 | `east-ham-isolation-hospital` | worked | May F. Cousins | 1921 | fact: checked; matches the page and its source |
| 115 | `east-ham-registration-district` | married | Herbert William Andrews | probably 1940 | fact: checked; matches the page and its source |
| 116 | `edgbaston` | died | Robert W. FitzMaurice | 1895-05-10 | fact: corrected, now at `16-york-road-edgbaston` (the place the record gives at the right precision) |
| 117 | `edgbaston` | lived | Robert W. FitzMaurice | 1895 | fact: corrected, now at `16-york-road-edgbaston` (the place the record gives at the right precision) |
| 118 | `egloshayle-cornwall` | born | Charles Bennett | about 1849 to 1851, Egloshayle | fact: checked; matches the page and its source |
| 119 | `erdington` | died | Fanny Mary Falcke | 1917-10-25 | fact: checked; corrected date now as the record words it: "25 October 1917, Erdington, aged 80" |
| 120 | `essex-south-western-registration-district` | died | Herbert Andrews | probably early 1951, Essex South Western district, aged 84 | fact: checked; matches the page and its source |
| 121 | `feltham-middlesex` | died | May F. Cousins | 1971-09-27 | fact: checked; corrected date now as the record words it: "27 September 1971"; crops now 1971-may-florence-cousins-probate-calendar.jpg |
| 122 | `feltham-middlesex` | lived | May F. Cousins | 1968 to 1971 | fact: checked; matches the page and its source |
| 123 | `france-ef` | served | Henry George Andrews | 9 January 1917 to 6 November 1919 | page: checked against the crop and caption; kept |
| 124 | `greenwich-registration-district` | born | Edith Marjorie FitzMaurice | late 1899, Greenwich district | fact: checked; matches the page and its source |
| 125 | `hackney` | lived | William Cousins | 1850 | fact: checked; corrected people now William Cousins, Elizabeth Cousins |
| 126 | `hackney` | worked | William Cousins | 1850 | fact: checked; matches the page and its source |
| 127 | `hackney` | lived | Elizabeth Cousins | 1850 | fact: checked; corrected people now William Cousins, Elizabeth Cousins |
| 128 | `hackney` | born | William Cousins | 1850-12-01 | fact: corrected, now at `st-john-hackney` (the place the record gives at the right precision) |
| 129 | `halstead` | worked | Herbert C. Cousins | 1911 to 1939 | fact: checked; matches the page and its source |
| 130 | `ham-farm` | lived | Henry Stacey, Mary Stacey | 1901 | fact: corrected, now at `patchetts-green` (the place the record gives at the right precision) |
| 131 | `hammersmith-registration-district` | lived | Baron Reginald FitzMaurice | 1927 to 1933 | fact: checked; matches the page and its source |
| 132 | `hammersmith-registration-district` | married | Baron Reginald FitzMaurice, Lilian FitzMaurice | probably late 1927 | fact: checked; matches the page and its source |
| 133 | `hammersmith-registration-district` | lived | Lilian FitzMaurice | 1927 to 1929 | fact: checked; matches the page and its source |
| 134 | `hammersmith-registration-district` | born | Patricia Andrews | probably early 1929, Hammersmith district | fact: checked; matches the page and its source |
| 135 | `hampton-hill` | lived | Lilian FitzMaurice | 1921 | fact: checked; matches the page and its source |
| 136 | `hampton-hill` | worked | Lilian FitzMaurice | 1921 | fact: corrected, now at `claims-record-office` (the place the record gives at the right precision) |
| 137 | `harrow-middlesex` | born | Elizabeth Falcke | about 1796 to 1797, Harrow | fact: checked; matches the page and its source |
| 138 | `hayes` | died | Baron Reginald FitzMaurice | 1977-03-31 | fact: checked; corrected date now as the record words it: "31 March 1977, Hayes" |
| 139 | `hayes` | lived | Baron Reginald FitzMaurice | 1938 to about 1972 | fact: corrected, now at `42-nestles-avenue` (the place the record gives at the right precision) |
| 140 | `hayes` | lived | Lilian FitzMaurice | 1938 to 1939 | fact: corrected, now at `42-nestles-avenue` (the place the record gives at the right precision) |
| 141 | `hayes` | lived | Eileen Sybil FitzMaurice | 1939 | fact: corrected, now at `55-bourne-avenue` (the place the record gives at the right precision) |
| 142 | `hayes` | lived | Leslie Hugh Simmons | 1939 | fact: corrected, now at `55-bourne-avenue` (the place the record gives at the right precision) |
| 143 | `hayes` | worked | Leslie Hugh Simmons | 1939 | fact: checked; matches the page and its source |
| 144 | `hemel-hempstead` | lived | Henry George Andrews | 1901 | fact: corrected, now at `94-bury-road` (the place the record gives at the right precision) |
| 145 | `hemel-hempstead` | lived | Herbert Andrews | 1901 | fact: corrected, now at `94-bury-road` (the place the record gives at the right precision) |
| 146 | `high-cross-aldenham` | lived | George Andrews, Alice Andrews | 1891 | fact: checked; corrected date now as the record words it: "1881"; crops now 1881-george-andrews-household-aldenham-p1.jpg, 1881-george-andrews-household-aldenham-p2.jpg |
| 147 | `islington` | born | Edith Madeline FitzMaurice | about 1866 to 1869, Islington | fact: checked; matches the page and its source |
| 148 | `islington` | born | Caroline Spencer | about 1843 to 1849, Islington | fact: checked; matches the page and its source |
| 149 | `islington-and-st-pancras` | lived | Edith Madeline FitzMaurice | 1891 | fact: corrected, now at `15-mornington-place` (the place the record gives at the right precision) |
| 150 | `perriman-greenland-place` | photographed | no one named | between 1865 and 1878 | page: checked against the crop and caption; kept |
| 151 | `kent` | lived | Eileen Sybil FitzMaurice | later life | fact: checked; matches the page and its source |
| 152 | `kent` | married | Eileen Sybil FitzMaurice |  | fact: checked; matches the page and its source |
| 153 | `kings-norton-registration-district` | born | William R. FitzMaurice | summer 1862, King's Norton district | fact: checked; matches the page and its source |
| 154 | `kings-norton-registration-district` | born | Eliza Ada FitzMaurice | early 1864, King's Norton district | fact: checked; matches the page and its source |
| 155 | `kings-norton-registration-district` | born | John Rupert FitzMaurice | spring 1865, King's Norton district | fact: checked; matches the page and its source |
| 156 | `lambeth-registration-district` | born | Edward Robert FitzMaurice | spring 1901, Lambeth district | fact: checked; matches the page and its source |
| 157 | `lang-sims-brixton` | photographed | Edith Madeline FitzMaurice | about 1899 | page: checked against the crop and caption; kept |
| 158 | `lang-sims-folkestone` | photographed | Edith Madeline FitzMaurice | about 1899 | page: removed with the place (see above) |
| 159 | `leavesden` | married | Henry Stacey, Mary Stacey | 1858-06-05 | fact: corrected, now at `leavesden-church` (the place the record gives at the right precision) |
| 160 | `leavesden` | born | Lucy Andrews | spring 1865, Watford district | fact: checked; matches the page and its source |
| 161 | `leavesden-church` | married | Henry Stacey, Mary Stacey | 5 June 1858 | fact: checked; matches the page and its source |
| 162 | `leicester` | died | John Rupert FitzMaurice | 1949-09-21 | fact: checked; corrected date now as the record words it: "21 September 1949, Leicester, aged 84" |
| 163 | `letchmore-heath` | worked | Robert Walter | 1841 | fact: checked; corrected crops now 1841-walters-household-aldenham.jpg |
| 164 | `lewisham-registration-district` | died | Edith Marjorie FitzMaurice | summer 1900, Lewisham district, under 1 year | fact: checked; matches the page and its source |
| 165 | `little-bromwich-aston` | lived | Robert W. FitzMaurice | 1871 | fact: checked; corrected crops now 1871-fitzmaurice-household-aston.jpg |
| 166 | `little-bromwich-aston` | born | Harry FitzMaurice | about 1866, Little Bromwich | fact: checked; matches the page and its source |
| 167 | `port-liverpool` | sailed | Baron Reginald FitzMaurice | 7 February 1925, Montrose, to Saint John | page: now a voyage in people.json, drawn as an arc between its ports |
| 168 | `mansell-street` | lived | William FitzMaurice, John FitzMaurice, Eliza FitzMaurice | 25 December 1827 | fact: corrected, now at `st-mary-whitechapel` (the place the record gives at the right precision) |
| 169 | `mead-cottage` | lived | Henry Stacey, Mary Stacey | 1881 | fact: corrected, now at `bushey` (the place the record gives at the right precision) |
| 170 | `mile-end-old-town` | born | John Richard FitzMaurice | 1829-11-04 | fact: corrected, now at `st-dunstan-stepney` (the place the record gives at the right precision) |
| 171 | `mile-end-old-town` | lived | William Cousins | 1861 | fact: checked; corrected people now William Cousins (Father of William), William Cousins (Dock labourer, of Plaistow), Elizabeth Cousins |
| 172 | `mile-end-old-town` | worked | William Cousins | 1861 | fact: checked; matches the page and its source |
| 173 | `mile-end-old-town` | lived | Elizabeth Cousins | 1861 | fact: checked; corrected people now William Cousins (Father of William), William Cousins (Dock labourer, of Plaistow), Elizabeth Cousins |
| 174 | `mile-end-old-town` | born | Arthur E. Cousins | late 1871, Mile End Old Town | fact: checked; matches the page and its source |
| 175 | `patchetts-green` | lived | Henry Stacey, Mary Stacey, Lucy Andrews | 1871 | fact: checked; matches the page and its source |
| 176 | `plaistow` | died | Henry George Andrews | 1941-04-19 | fact: corrected, now at `23-sutton-court-road` (the place the record gives at the right precision) |
| 177 | `plaistow` | lived | Henry George Andrews | 1921 to 1941 | fact: corrected, now at `23-sutton-court-road` (the place the record gives at the right precision) |
| 178 | `plaistow` | died | Rosina Maud Andrews | 1941-04-19 | fact: corrected, now at `23-sutton-court-road` (the place the record gives at the right precision) |
| 179 | `plaistow` | lived | Rosina Maud Andrews | 1921 to 1941 | fact: corrected, now at `23-sutton-court-road` (the place the record gives at the right precision) |
| 180 | `plaistow` | lived | Herbert William Andrews | 1921 to 1939 | fact: checked; matches the page and its source |
| 181 | `plaistow` | died | Sidney George Andrews | 1941-04-19 | fact: corrected, now at `23-sutton-court-road` (the place the record gives at the right precision) |
| 182 | `plaistow` | worked | William Cousins | 1911 to 1921 | fact: checked; matches the page and its source |
| 183 | `plymouth-road-canning-town` | worked | Herbert Andrews | 1921, night work | fact: not mapped; the fact has no place in people.json |
| 184 | `plymouth-registration-district` | died | Floyd Bennett | probably 1970, Plymouth district | fact: checked; matches the page and its source |
| 185 | `poplar-registration-district` | born | Amelia Cousins | summer 1877, Poplar district | fact: checked; matches the page and its source |
| 186 | `port-london` | sailed | Edward Dixon FitzMaurice, Edith Madeline FitzMaurice, Edward Robert FitzMaurice, Baron Reginald FitzMaurice, Eileen Sybil FitzMaurice | 1916 | page: now a voyage in people.json, drawn as an arc between its ports |
| 187 | `queen-street-chelsea` | lived | William G. Falcke, Elizabeth Falcke | 1818 to 1822 | page: checked against the crop and caption; kept |
| 188 | `royal-albert-docks` | worked | Henry George Andrews | 1921 | fact: checked; matches the page and its source |
| 189 | `royal-filling-factory` | worked | Henry George Andrews, Herbert William Andrews | 1939 | fact: checked; corrected people now Henry George Andrews |
| 190 | `port-saint-john` | sailed | Baron Reginald FitzMaurice | 15 February 1925 to 6 March 1925 | page: now a voyage in people.json, drawn as an arc between its ports |
| 191 | `south-africa` | worked | Edward Dixon FitzMaurice | 1916 | fact: checked; corrected crops now tw1916-p284-fitzmaurice.jpg |
| 192 | `south-africa` | lived | Edith Madeline FitzMaurice | about 1916 to 1925 | fact: checked; matches the page and its source |
| 193 | `south-africa` | lived | Eileen Sybil FitzMaurice | about 1916 to the 1920s | fact: checked; matches the page and its source |
| 194 | `south-africa` | lived | Edward Robert FitzMaurice | The family believes Bob stayed in South Africa | page: checked against the crop and caption; kept |
| 195 | `port-southampton` | sailed | Edward Dixon FitzMaurice, Edith Madeline FitzMaurice, Baron Reginald FitzMaurice | 1923 to 1925 | page: now a voyage in people.json, drawn as an arc between its ports |
| 196 | `spelthorne-registration-district` | lived | Baron Reginald FitzMaurice | 1934 to 1937 | fact: checked; matches the page and its source |
| 197 | `st-albans-abbey` | baptised | Henry George Andrews | 9 June 1889 | fact: corrected, now at `st-albans-hertfordshire` (the place the record gives at the right precision) |
| 198 | `st-albans-hertfordshire` | born | Henry George Andrews | April 1889, St Albans | fact: checked; matches the page and its source |
| 199 | `st-albans-hertfordshire` | lived | Henry George Andrews | 1889 | fact: checked; matches the page and its source |
| 200 | `st-andrews-plaistow` | married | Henry George Andrews, Rosina Maud Andrews | 1915-04-18 | fact: checked; corrected date now as the record words it: "18 April 1915" |
| 201 | `st-columb-registration-district` | born | Annie Bennett | early 1864, St Columb district | fact: checked; matches the page and its source |
| 202 | `st-dunstan-stepney` | baptised | John Richard FitzMaurice, Robert W. FitzMaurice | 1829 to 1832 | fact: checked; corrected people now John Richard FitzMaurice; date now as the record words it: "baptised 4 November 1829, St Dunstan's, Stepney"; crops now 1829-baptism-john-richard.jpg |
| 203 | `st-john-hackney` | baptised | William Cousins | 1 December 1850 | fact: checked; corrected people now William Cousins (Dock labourer, of Plaistow), William Cousins (Father of William), Elizabeth Cousins; date now as the record words it: "probably baptised 1 December 1850, St John, Hackney" |
| 204 | `st-luke-chelsea` | baptised | Eliza C. Falcke, Jane Falcke | 1818 to 1822 | page: checked against the crop and caption; kept |
| 205 | `st-margaret-ward-end` | baptised | Edward Dixon FitzMaurice | 19 June 1873 | fact: corrected, now at `ward-end-aston` (the place the record gives at the right precision) |
| 206 | `st-martins-birmingham` | married | John FitzMaurice, Eliza FitzMaurice | 1827-02-03 | fact: checked; corrected date now as the record words it: "3 February 1827"; crops now 1827-marriage-st-martin.jpg, 1827-marriage-signatures.jpg |
| 207 | `st-marys-church-wanstead` | married | Ronald Andrews, Patricia Andrews | 1950-02-11 | fact: checked; corrected date now as the record words it: "11 February 1950" |
| 208 | `st-marys-battersea` | married | William G. Falcke, Elizabeth Falcke | 1817-10-15 | fact: checked; corrected date now as the record words it: "15 October 1817"; crops now 1817-falcke-macfarlin-marriage-battersea-entry125.jpg |
| 209 | `st-marys-battersea` | married | Robert W. FitzMaurice, Fanny Mary Falcke | 1861-09-14 | fact: checked; corrected date now as the record words it: "14 September 1861"; crops now 1861-marriage-robert-fanny.jpg |
| 210 | `st-mary-whitechapel` | baptised | William FitzMaurice | 25 December 1827 | fact: checked; corrected date now as the record words it: "born 23 December 1827, baptised 25 December 1827, Whitechapel" |
| 211 | `st-matthews-brixton` | married | Edward Dixon FitzMaurice, Edith Madeline FitzMaurice | 1897-08-02 | fact: checked; corrected date now as the record words it: "2 August 1897"; crops now 1897-marriage-brixton.jpg |
| 212 | `st-olave-registration-district` | born | Horatio Cousins | summer 1879, St Olave district | fact: checked; matches the page and its source |
| 213 | `st-pancras` | worked | Edith Madeline FitzMaurice | 1891 | fact: checked; matches the page and its source |
| 214 | `st-peter-london-docks` | baptised | Arthur E. Cousins | 9 January 1872 | fact: corrected, now at `mile-end-old-town` (the place the record gives at the right precision) |
| 215 | `st-philips-stepney` | married | William Cousins, Annie Cousins | 1871-01-15 | fact: checked; corrected date now as the record words it: "15 January 1871" |
| 216 | `staines` | married | Eileen Sybil FitzMaurice, Leslie Hugh Simmons | summer 1936 | fact: checked; corrected crops now 1936-bucks-advertiser-simmons-fitzmaurice-wedding.jpg |
| 217 | `staines` | lived | Leslie Hugh Simmons | 1936 | fact: checked; matches the page and its source |
| 218 | `stanbridge-bedfordshire` | born | Elizabeth Field | about 1805 to 1806, Stanbridge | fact: checked; matches the page and its source |
| 219 | `stepney` | born | Robert W. FitzMaurice | 1832-09-30 | fact: corrected, now at `st-dunstan-stepney` (the place the record gives at the right precision) |
| 220 | `stepney` | lived | Robert W. FitzMaurice | 1832 | fact: checked; matches the page and its source |
| 221 | `stepney` | worked | William Cousins | 1871 | fact: checked; matches the page and its source |
| 222 | `stepney` | born | Robert H. Cousins | late 1874, Stepney | fact: checked; matches the page and its source |
| 223 | `stoke-damerel-registration-district` | married | Charles Bennett, Annie Bennett | probably 1882 | fact: checked; matches the page and its source |
| 224 | `stratford-attestation` | served | Henry George Andrews | 7 December 1915 | page: checked against the crop and caption; kept |
| 225 | `stuart-brompton-road` | photographed | Edward Dixon FitzMaurice | about 1895 | page: checked against the crop and caption; kept |
| 226 | `sutton-road-aston` | lived | Robert W. FitzMaurice, Edward Dixon FitzMaurice | 1881 | fact: checked; corrected people now Robert W. FitzMaurice, Fanny Mary Falcke, Edward Dixon FitzMaurice |
| 227 | `the-nest-erdington` | died | Fanny Mary Falcke | 25 October 1917 | fact: corrected, now at `erdington` (the place the record gives at the right precision) |
| 228 | `thetford-norfolk` | born | Annie Cousins | about 1846, Thetford, Norfolk | fact: checked; matches the page and its source |
| 229 | `totternhoe-bedfordshire` | born | George Andrews | about 1843, Totternhoe | fact: checked; matches the page and its source |
| 230 | `totternhoe-bedfordshire` | lived | George Andrews | 1871 | fact: checked; corrected people now George Andrews, Herbert Andrews; crops now 1871-george-andrews-household-totternhoe.jpg |
| 231 | `totternhoe-bedfordshire` | born | Alice Andrews | about 1837 to 1838, Totternhoe | fact: checked; matches the page and its source |
| 232 | `totternhoe-bedfordshire` | born | Herbert Andrews | 1865-11-12 | fact: checked; corrected date now as the record words it: "12 November 1865, Totternhoe" |
| 233 | `totternhoe-bedfordshire` | lived | Herbert Andrews | 1871 | fact: checked; corrected people now George Andrews, Herbert Andrews; crops now 1871-george-andrews-household-totternhoe.jpg |
| 234 | `tower-of-london` | worked | John FitzMaurice | 1827 to 1832 | fact: checked; matches the page and its source |
| 235 | `tura` | served | Ronald Andrews | 1945 | fact: checked; matches the page and its source |
| 236 | `uxbridge-registration-district` | died | Lilian FitzMaurice | late 1947, Uxbridge district, aged 47 | fact: checked; matches the page and its source |
| 237 | `victoria-docks` | died | Arthur E. Cousins | 1912 (family statement) | page: checked against the crop and caption; kept |
| 238 | `wandsworth-registration-district` | born | Baron Reginald FitzMaurice | 1904-05-26 | fact: checked; corrected date now as the record words it: "26 May 1904, Wandsworth district" |
| 239 | `wandsworth-registration-district` | lived | Baron Reginald FitzMaurice | 1904, and 1925 to 1926 | fact: checked; matches the page and its source |
| 240 | `ward-end-aston` | born | Edward Dixon FitzMaurice | 1872-10-21 | fact: checked; corrected date now as the record words it: "born 21 October 1872, baptised 19 June 1873 at Ward End, Aston" |
| 241 | `watford` | worked | Lucy Andrews | 1881 | fact: corrected, now at `denmark-street-watford` (the place the record gives at the right precision) |
| 242 | `west-ham-registration-district` | born | Herbert William Andrews | 1916, West Ham district | fact: checked; matches the page and its source |
| 243 | `west-ham-registration-district` | born | Sidney George Andrews | spring 1923, West Ham district | fact: checked; matches the page and its source |
| 244 | `west-ham-registration-district` | born | Ronald Andrews | probably summer 1921, West Ham | fact: checked; matches the page and its source |
| 245 | `west-ham-registration-district` | lived | Herbert Andrews | 1939 | fact: checked; matches the page and its source |
| 246 | `west-ham-registration-district` | worked | Herbert Andrews | 1939 | fact: checked; matches the page and its source |
| 247 | `west-ham-registration-district` | died | Lucy Andrews | probably 1932, West Ham district, aged 67 | fact: checked; matches the page and its source |
| 248 | `west-ham-registration-district` | died | William Cousins | probably late 1922, West Ham district, aged 71 | fact: checked; matches the page and its source |
| 249 | `west-ham-registration-district` | died | Annie Cousins | probably 1900, West Ham district, aged 53 | fact: checked; matches the page and its source |
| 250 | `west-ham-registration-district` | died | Arthur E. Cousins | probably early 1912, West Ham, aged 40 | fact: checked; corrected crops now 1912-q1-arthur-e-cousins-death-index-west-ham-4a-136-freebmd.jpg |
| 251 | `west-ham-registration-district` | died | Amelia Cousins | probably early 1915, West Ham, aged 37 | fact: checked; matches the page and its source |
| 252 | `west-ham-registration-district` | born | Herbert C. Cousins | 1883-04-01 | fact: checked; corrected date now as the record words it: "1 April 1883, West Ham district" |
| 253 | `west-ham-registration-district` | born | Grace Cousins | spring 1884, West Ham district | fact: checked; matches the page and its source |
| 254 | `west-ham-registration-district` | born | May F. Cousins | spring 1886, West Ham district | fact: checked; matches the page and its source |
| 255 | `west-ham-registration-district` | lived | May F. Cousins | 1886 | fact: checked; matches the page and its source |
| 256 | `whitechapel` | born | William FitzMaurice | 1827-12-23 | fact: corrected, now at `st-mary-whitechapel` (the place the record gives at the right precision) |
| 257 | `whitstable` | lived | Edward Dixon FitzMaurice | 1911 | fact: corrected, now at `clifton-ville-whitstable` (the place the record gives at the right precision) |
| 258 | `whitstable` | lived | Edward Dixon FitzMaurice | 1923 | fact: corrected, now at `14-waterloo-road-whitstable` (the place the record gives at the right precision) |
| 259 | `whitstable` | worked | Edward Dixon FitzMaurice | 1911 | fact: checked; matches the page and its source |
| 260 | `whitstable` | worked | Edward Dixon FitzMaurice | 1923 | fact: checked; matches the page and its source |
| 261 | `whitstable` | lived | Edith Madeline FitzMaurice | 1911 | fact: corrected, now at `clifton-ville-whitstable` (the place the record gives at the right precision) |
| 262 | `whitstable` | lived | Baron Reginald FitzMaurice | 1911 | fact: corrected, now at `clifton-ville-whitstable` (the place the record gives at the right precision) |
| 263 | `whitstable` | lived | Eileen Sybil FitzMaurice | 1911 | fact: corrected, now at `clifton-ville-whitstable` (the place the record gives at the right precision) |
| 264 | `wimbledon` | worked | Herbert Andrews | 1881 | fact: corrected, now at `berkeley-lodge` (the place the record gives at the right precision) |
| 265 | `windsor` | born | Patricia Andrews | the family remembers Windsor, which is not the registered birthplace | fact: corrected, now at `hammersmith-registration-district` (the place the record gives at the right precision) |
| 266 | `woolwich` | worked | Henry George Andrews | 1939 | fact: corrected, now at `royal-filling-factory` (the place the record gives at the right precision) |
| 267 | `woolwich` | worked | Herbert William Andrews | 1939 | fact: corrected, now at `royal-filling-factory` (the place the record gives at the right precision) |
| 268 | `woolwich-dockyard` | served | Henry George Andrews | 3 December 1919 | page: checked against the crop and caption; kept |
| 269 | `ymca-saint-john` | sailed | Baron Reginald FitzMaurice | 15 February 1925, stated destination | page: removed with the place (see above) |
| 270 | `orkney-brixham-devon` | lived | Rose FitzMaurice, Countess of Orkney | 1953 | fact: checked; matches the page and its source |
| 271 | `orkney-cliveden-and-taplow-buckinghamshire` | lived | George Hamilton, 1st Earl of Orkney |  | fact: checked; matches the page and its source |
| 272 | `orkney-dublin` | born | William Petty, Lord Shelburne | May 1737 | fact: checked; matches the page and its source |
| 273 | `orkney-hamilton-palace` | born | James Hamilton, 1st Duke of Hamilton | 1606-06-19 | fact: checked; corrected date now as the record words it: "19 June 1606" |
| 274 | `orkney-holyrood-abbey-edinburgh` | born | James II of Scotland | 1430-10-16 | fact: checked; corrected date now as the record words it: "16 October 1430" |
| 275 | `orkney-lantern-hatch-itchingfield-near-horsham-sussex` | lived | Dorothy FitzMaurice | 1951 | fact: checked; matches the page and its source |
| 276 | `orkney-london` | died | James Hamilton, 1st Duke of Hamilton | 1649 | fact: checked; matches the page and its source |
| 277 | `orkney-roxburgh-castle` | died | James II of Scotland | 1460-08-03 | fact: checked; corrected date now as the record words it: "3 August 1460" |
| 278 | `orkney-st-marys-brixham` | married | Cecil FitzMaurice, 8th Earl of Orkney, Rose FitzMaurice, Countess of Orkney | 1953-11-27 | fact: checked; corrected date now as the record words it: "27 November 1953" |
| 279 | `orkney-stirling` | born | Mary Stewart | 1453-05-13 | fact: checked; corrected date now as the record words it: "13 May 1453" |
| 280 | `orkney-the-tythe-house-stewkley-near-leighton-buzzard` | lived | Edmond FitzMaurice, 7th Earl of Orkney |  | fact: checked; matches the page and its source |

## Changes to people.json and sources.json

- `sources.json passenger-1925-edith`: Note said no street was published; the page publishes 55 Seymour Street, so the note now says so.
- `edward-dixon-fitzmaurice.death.place`: Was "Chingford Mount Cemetery" (the burial). Now "West Ham district" from the death index shown on the Falcke page, with an Update note.
- `george-andrews.spouses`: Marriage date and place were empty; the 1863 marriage index on the page gives late 1863, Luton district.
- `alice-andrews.spouses`: Marriage date and place were empty; the 1863 marriage index on the page gives late 1863, Luton district.
- `mrs-r-fitzmaurice.occupations[0].place`: Was "Hampton Hill"; the 1921 crop gives her place of work as Kew. Hampton Hill stays as her residence.
- `burial` added for Edward Dixon FitzMaurice (Chingford Mount, 13 June 1928), William Gottlob Falcke (St Mary's, Battersea, 27 August 1849), and Ronald and Patricia Andrews (the churchyard at Crowthorne, family). The tree profile now shows it.
- `voyages` added for Edward Dixon (Balmoral Castle 1916, Armadale Castle and Arundel Castle 1923), Edith (Llanstephan Castle 1916, probably; Saxon 1925), Bob, Reg and Eileen (Llanstephan Castle 1916, probably) and Reg (Montrose and Marburn 1925). The tree profile lists them.
- `placeId` added beside the existing place strings for every fact of the deceased that has a place, and on 50 timeline entries. Living people's facts are not linked.
- Two timeline entries become map events of their own: Reg giving Patricia away and Herb at the wedding, both at St Mary's, Wanstead, on 11 February 1950 (type "celebrated").
- New sources (locations only, never family facts): `loc-nhle`, `loc-survey-of-london-st-philip`, `loc-wiki-st-andrew-plaistow`, `loc-wiki-st-margaret-ward-end`, `loc-lost-hospitals-east-ham`, `loc-ukbmd-districts`, `loc-canning-town-directories`, `loc-london-streets-1938`, `loc-hilfield-estate-1906`, `loc-wiki-churches`, `loc-map-build-2026`.
- New sources gathering records the pages already publish with their images: `parish-battersea-falcke-baptisms`, `parish-battersea-falcke-marriages`, `census-1861-marylebone-rwf`, `census-walter-aldenham`.

### Addresses moved from the pages into residences[].address

Only where the page publishes the street for the whole span of the residence. Where the address covers only part of the span (for example 26 Turret Grove for Reg's "Wandsworth, 1904, and 1925 to 1926"), the residence keeps its area and the address is a page event of its own.

| Fact | Address | Why | Sources |
|---|---|---|---|
| `edward-dixon-fitzmaurice.residences[1]` | 25 Compton Avenue, Brighton | Published on the page for this residence. | census-1891-brighton |
| `edward-dixon-fitzmaurice.residences[3]` | Clifton Ville, Westgate Terrace, Whitstable | Published on the page for this residence. | census-1911-whitstable |
| `edward-dixon-fitzmaurice.residences[5]` | 14 Waterloo Road, Whitstable | Published on the page for this residence. | passenger-1923-armadale |
| `edith-madeleine-fitzmaurice.residences[0]` | 15 Mornington Place, St Pancras | Published on the page for this residence. | census-1891-spencer |
| `edith-madeleine-fitzmaurice.residences[2]` | Clifton Ville, Westgate Terrace, Whitstable | Published on the page for this residence. | census-1911-whitstable |
| `reg-fitzmaurice.residences[1]` | Clifton Ville, Westgate Terrace, Whitstable | Published on the page for this residence. | census-1911-whitstable |
| `reg-fitzmaurice.residences[4]` | 42 Nestles Avenue, Hayes | The page: "from 1938 42 Nestles Avenue, Hayes, where he lived until he died in 1977". | electoral-fitzmaurice, probate-reg-1977 |
| `mrs-r-fitzmaurice.residences[3]` | 42 Nestles Avenue, Hayes | Electoral register 1938: Reg and Lilian at 42 Nestles Avenue. | electoral-fitzmaurice |
| `mr-hg-andrews.residences[1]` | 94 Bury Road, Hemel Hempstead | Published on the page for this residence. | census-andrews-stacey |
| `mr-hg-andrews.residences[2]` | 40 Fisher Street, Canning Town | Published on the page for this residence. | census-andrews-stacey |
| `mr-hg-andrews.residences[3]` | 23 Sutton Court Road, Plaistow | The 1911 caption: "the house where Rosina and Henry George later lived and died"; the army file gives the address in 1915 and 1919; he was killed there in 1941. | census-cousins, cwgc-plaistow-1941 |
| `mrs-hg-andrews.residences[0]` | 23 Sutton Court Road, Plaistow | As for Henry George. | census-cousins, cwgc-plaistow-1941 |
| `robert-william-fitzmaurice.residences[2]` | Sutton Road, Aston Manor | Published on the page for this residence. | census-1881-aston |
| `robert-william-fitzmaurice.residences[3]` | 16 York Road, Edgbaston | Published on the page for this residence. | probate-robert-1895 |
| `eileen-sybil-fitzmaurice.residences[0]` | Clifton Ville, Westgate Terrace, Whitstable | Published on the page for this residence. | census-1911-whitstable |
| `eileen-sybil-fitzmaurice.residences[2]` | 55 Bourne Avenue, Hayes | Published on the page for this residence. | register-1939 |
| `leslie-hugh-simmons.residences[1]` | 55 Bourne Avenue, Hayes | Published on the page for this residence. | register-1939 |
| `henry-stacey.residences[1]` | Patchetts Green, Aldenham | Published on the page for this residence. | census-andrews-stacey |
| `george-andrews.residences[1]` | High Cross, Aldenham | Published on the page for this residence. | census-andrews-stacey |
| `herbert-andrews-sr.residences[1]` | 94 Bury Road, Hemel Hempstead | Published on the page for this residence. | census-andrews-stacey |
| `herbert-andrews-sr.residences[2]` | 40 Fisher Street, Canning Town | The 1911 census and the 1921 crop both give 40 Fisher Street. | census-andrews-stacey |

## Points placed by hand

These places had no point in the directory, or a point on the wrong place, so the map build placed them by hand from the place's published description (source `loc-map-build-2026`), or drew a circle round the place the record names. Four are pins: three churches and the Perriman studio beside the Mother Red Cap. The rest are areas or soft circles. Please check each one by eye on a map.

| Place | Kind | Drawn as | Point | How it was placed |
|---|---|---|---|---|
| 2 Elm Terrace, Wandsworth Road (`2-elm-terrace`) | home | halo within 1200 m | 51.4705, -0.1395 | Corrected. The directory's point was on Wandsworth's high street, not Wandsworth Road. Elm Terrace has not been found on a map, so the circle covers the stretch of Wandsworth Road in Battersea parish. |
| 33 New Street, London Docks (`33-new-street`) | home | halo within 900 m | 51.5062, -0.0581 | New Street has not been found on a map. It was the family's abode at Arthur's baptism at St Peter, London Docks, so the circle is drawn round that church. |
| 57 Rutland Street, Stepney (`57-rutland-street`) | home | halo within 1500 m | 51.5174, -0.0462 | Rutland Street has not been found on a map. The circle covers Stepney, where William married from it in 1871. |
| 7 North Lane, Clapham Common (`7-north-clapham-common`) | home | halo within 1000 m | 51.4638, -0.1508 | North Side, Clapham Common, and North Street, Clapham, are about a mile apart, and no North Lane has been found. The circle covers both. |
| 92 Harper Road, West Ham (`92-harper-road`) | home | halo within 2500 m | 51.5250, 0.0150 | Corrected. The directory's point was Harper Road in Southwark, south of the Thames, not West Ham. Harper Road in West Ham has not been found on a map, so the circle covers West Ham, the place the census names. |
| Berkeley Lodge, Wimbledon (`berkeley-lodge`) | workplace | halo within 2500 m | 51.4215, -0.2064 | Berkeley Lodge has not been found on a map. The circle covers Wimbledon, the place the census names. |
| Blean registration district (`blean-registration-district`) | registration district | area within 10000 m | 51.3300, 1.0800 | Drawn as an approximate area, a circle of about 10 km round the district. Blean district: Whitstable, Herne Bay and the parishes north of Canterbury. |
| Bolingbroke Gardens, Battersea (`bolingbroke-gardens`) | home | halo within 1500 m | 51.4708, -0.1722 | Bolingbroke Gardens has not been found on a map. The circle covers Battersea, the place the census names. |
| Bridge registration district (`bridge-registration-district`) | registration district | area within 9000 m | 51.2450, 1.1250 | Drawn as an approximate area, a circle of about 9 km round the district. Bridge district: the villages south-east of Canterbury. |
| Cape Supreme Court, Cape Town (`cape-supreme-court`) | venue | halo within 2500 m | -33.9249, 18.4241 | The court sat in Cape Town; the cases are undated and the building is not named, so the circle covers the city centre. |
| Chalfont, Buckinghamshire (`chalfont-buckinghamshire`) | town | halo within 4000 m | 51.6250, -0.5600 | The record says Chalfont, which could be Chalfont St Giles or Chalfont St Peter; the circle covers both. |
| Clifton Ville, Westgate Terrace, Whitstable (`clifton-ville-whitstable`) | home | halo within 700 m | 51.3606, 1.0241 | Westgate Terrace is a Whitstable street today, but its exact line was not checked and which house was called Clifton Ville is not known. The circle covers the middle of Whitstable. |
| East Ham registration district (`east-ham-registration-district`) | registration district | area within 3500 m | 51.5400, 0.0550 | Drawn as an approximate area, a circle of about 4 km round the district. East Ham district, created in 1935 from West Ham district. |
| Greenwich registration district (`greenwich-registration-district`) | registration district | area within 4000 m | 51.4800, 0.0000 | Drawn as an approximate area, a circle of about 4 km round the district. Greenwich district. |
| Hammersmith registration district (`hammersmith-registration-district`) | registration district | area within 3000 m | 51.4970, -0.2250 | Drawn as an approximate area, a circle of about 3 km round the district. Hammersmith district. |
| J. Perriman's studio, 3 Greenland Place, Camden Town (`perriman-greenland-place`) | studio | pin | 51.5389, -0.1419 | Placed beside the Mother Red Cap at Camden Town, as the studio stamp says ('side of the Mother Red Cap'). |
| King's Norton registration district (`kings-norton-registration-district`) | registration district | area within 7000 m | 52.4400, -1.9200 | Drawn as an approximate area, a circle of about 7 km round the district. King's Norton district, south of Birmingham. |
| Lambeth registration district (`lambeth-registration-district`) | registration district | area within 4500 m | 51.4680, -0.1150 | Drawn as an approximate area, a circle of about 4 km round the district. Lambeth district. |
| Lewisham registration district (`lewisham-registration-district`) | registration district | area within 5000 m | 51.4450, 0.0100 | Drawn as an approximate area, a circle of about 5 km round the district. Lewisham district. |
| Liverpool (`port-liverpool`) | port | halo within 1000 m | 53.4047, -2.9958 | Corrected. The directory's point was inland; this is the Pier Head landing stage on the Mersey. |
| Mead Cottage, Bushey (`mead-cottage`) | home | halo within 2000 m | 51.6442, -0.3622 | Mead Cottage has not been found on a map. The circle covers Bushey, the place the census names. |
| Mile End Old Town (`mile-end-old-town`) | parish | area within 1500 m | 51.5215, -0.0440 | Moved to the middle of the old hamlet of Mile End Old Town, round Stepney Green. |
| Plymouth registration district (`plymouth-registration-district`) | registration district | area within 6000 m | 50.3760, -4.1430 | Drawn as an approximate area, a circle of about 6 km round the district. Plymouth district. |
| Poplar registration district (`poplar-registration-district`) | registration district | area within 3000 m | 51.5100, -0.0150 | Drawn as an approximate area, a circle of about 3 km round the district. Poplar district. |
| Queen Street, Chelsea (`queen-street-chelsea`) | home | halo within 300 m | 51.4868, -0.1660 | Queen Street, Chelsea, was later renamed Flood Street; the point is on Flood Street. |
| Royal Albert Docks, London (`royal-albert-docks`) | workplace | halo within 1500 m | 51.5075, 0.0640 | Corrected. The directory's point was the Royal Albert Dock in Liverpool. This is the Royal Albert Dock in London's docklands, where the Port of London Authority employed him in 1921. |
| Spelthorne district, Middlesex (`spelthorne-registration-district`) | district | area within 9000 m | 51.4550, -0.4500 | Drawn as an approximate area, a circle of about 9 km round the district. Spelthorne district, Middlesex, as the electoral registers name it. |
| St Columb registration district (`st-columb-registration-district`) | registration district | area within 12000 m | 50.4240, -5.0000 | Drawn as an approximate area, a circle of about 12 km round the district. St Columb district, Cornwall. |
| St Luke, Chelsea (the old parish church, now Chelsea Old Church) (`st-luke-chelsea`) | church | pin | 51.4830, -0.1708 | Corrected. The directory put the pin on the new St Luke's, Sydney Street, which was not consecrated until 1824. Before then St Luke's was the old parish church by the river, now Chelsea Old Church, so the 1818 and 1822 baptisms were there. |
| St Martin in the Bull Ring, Birmingham (`st-martins-birmingham`) | church | pin | 52.4770, -1.8932 | Corrected: the directory's point was off the church. |
| St Olave registration district (`st-olave-registration-district`) | registration district | area within 2000 m | 51.4970, -0.0700 | Drawn as an approximate area, a circle of about 2 km round the district. St Olave district: Bermondsey and Rotherhithe by the river. |
| St Peter, London Docks (`st-peter-london-docks`) | church | pin | 51.5062, -0.0581 | Placed on St Peter's church, Wapping Lane, which stands in the London Docks parish. |
| Stoke Damerel registration district (`stoke-damerel-registration-district`) | registration district | area within 3000 m | 50.3810, -4.1630 | Drawn as an approximate area, a circle of about 3 km round the district. Stoke Damerel district: Devonport. |
| Sutton Road, Aston Manor (`sutton-road-aston`) | home | halo within 1500 m | 52.5158, -1.8728 | Sutton Road in Aston Manor has not been found on a map. The circle covers Aston Manor, the place the census names. |
| Uxbridge registration district (`uxbridge-registration-district`) | registration district | area within 9000 m | 51.5400, -0.4700 | Drawn as an approximate area, a circle of about 9 km round the district. Uxbridge district: Uxbridge, Hayes, Harlington and the villages round them. |
| Wandsworth registration district (`wandsworth-registration-district`) | registration district | area within 5000 m | 51.4550, -0.1650 | Drawn as an approximate area, a circle of about 5 km round the district. Wandsworth district: Wandsworth, Clapham, Putney, Streatham and Tooting. |
| West Ham registration district (`west-ham-registration-district`) | registration district | area within 4500 m | 51.5300, 0.0100 | Drawn as an approximate area, a circle of about 4 km round the district. West Ham district. |
| Abbots Langley (`abbots-langley`) | town | halo within 1500 m | 51.7016, -0.4166 | Added in the map build for a place the page names. Town centre; the census does not give a house. Placed at the centre of the town or area with a wide circle. |
| St Marylebone (`st-marylebone`) | parish | area within 1500 m | 51.5225, -0.1550 | Added in the map build for a place the page names. The parish; the lodging house is not named on the page. Placed at the centre of the town or area with a wide circle. |
| Luton registration district (`luton-registration-district`) | registration district | area within 10000 m | 51.8790, -0.4700 | Added in the map build for a place the page names. Luton district: Luton, Dunstable and the villages round them, including Totternhoe. Placed at the centre of the town or area with a wide circle. |

## What stands today, and Street View

Street View is offered only for places with a published address or a named building known to within about 600 metres. No Google key was available for the build, so no panorama has been fixed or looked at: every viewpoint below is `checked: false`. The no-key link asks Google Maps for the panorama nearest the place with no heading, and Google turns that panorama to face the place. With a build key, tools/streetview-viewpoints.mjs fills the panorama position, its date and the heading from the panorama to the building; after that each view still needs a look before it is marked checked.

| Place | Stands today | Source or reason | Street View subject | Viewpoint |
|---|---|---|---|---|
| 1 Honey Street, Bodmin | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 50.47114, -4.71826; not yet checked |
| 10 Riles Road, Plaistow | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| 113 Bourne Avenue, Harlington | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.50247, -0.43315; not yet checked |
| 118 Keeton Road, Bermondsey | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.49735, -0.06320; not yet checked |
| 13 Gladding Road, Manor Park | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.55393, 0.04531; not yet checked |
| 14 Waterloo Road, Whitstable | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.35894, 1.02284; not yet checked |
| 15 Mornington Place, St Pancras | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.53366, -0.14117; not yet checked |
| 16 York Road, Edgbaston | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 52.47295, -1.94159; not yet checked |
| 2 Elm Terrace, Wandsworth Road | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1200 metres. The panel offers the Then and Today maps instead. |
| 23 Sutton Court Road, Plaistow | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.52567, 0.03351; not yet checked |
| 25 Compton Avenue, Brighton | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 50.83012, -0.14564; not yet checked |
| 26 Turret Grove, Clapham | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.46779, -0.14047; not yet checked |
| Young Street, Canning Town (Nos. 3 and 5) | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 350 metres. The panel offers the Then and Today maps instead. |
| 33 New Street, London Docks | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 900 metres. The panel offers the Then and Today maps instead. |
| 34 Blythe Road, Hammersmith | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.49710, -0.21265; not yet checked |
| 40 Fisher Street, Canning Town | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.51902, 0.01843; not yet checked |
| 42 Nestles Avenue, Hayes | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.50206, -0.42133; not yet checked |
| 48 Oxford Road South, Gunnersbury | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.48896, -0.27924; not yet checked |
| 55 Bourne Avenue, Hayes | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.50247, -0.43315; not yet checked |
| 55 Seymour Street, Higher Tranmere, Birkenhead | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 53.38159, -3.02238; not yet checked |
| 57 Rutland Street, Stepney | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| 6 Cathles Road, Balham Hill | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.45053, -0.14507; not yet checked |
| 7 North Lane, Clapham Common | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1000 metres. The panel offers the Then and Today maps instead. |
| 92 Harper Road, West Ham | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2500 metres. The panel offers the Then and Today maps instead. |
| 94 Bury Road, Hemel Hempstead | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.75580, -0.47598; not yet checked |
| St John the Baptist, Aldenham | yes | The parish church still stands (loc-wiki-churches). | original building | target 51.67341, -0.35291; not yet checked |
| Berkeley Lodge, Wimbledon | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2500 metres. The panel offers the Then and Today maps instead. |
| Bolingbroke Gardens, Battersea | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| Cape Supreme Court, Cape Town | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2500 metres. The panel offers the Then and Today maps instead. |
| Chester Road, Boldmere | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 900 metres. The panel offers the Then and Today maps instead. |
| Chingford Mount Cemetery | yes | Still a cemetery, run by the London Borough of Waltham Forest, whose burial register records Edward (burial-chingford-1928). | original building | target 51.62174, -0.01198; not yet checked |
| Claims Record Office, Kew | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| Clifton Ville, Westgate Terrace, Whitstable | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 700 metres. The panel offers the Then and Today maps instead. |
| St John the Baptist Parish Church, Crowthorne | yes | The parish church and its churchyard (st-john-crowthorne-churchyard). | original building | target 51.36823, -0.79788; not yet checked |
| Crystal Palace dispersal unit | demolished | The Crystal Palace was destroyed by fire in 1936 (loc-wiki-churches). | site only | target 51.41937, -0.07113; not yet checked |
| St Mary's, Denham | yes | The medieval parish church still stands. | original building | target 51.58191, -0.50217; not yet checked |
| Denmark Street, Watford | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 200 metres. The panel offers the Then and Today maps instead. |
| East Ham Isolation Hospital | demolished | The site is now a primary and a secondary school (loc-lost-hospitals-east-ham). | site only | target 51.52480, 0.04780; not yet checked |
| Ham Farm, Aldenham | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2500 metres. The panel offers the Then and Today maps instead. |
| High Cross, Aldenham | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.67766, -0.34195; not yet checked |
| J. Perriman's studio, 3 Greenland Place, Camden Town | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.53892, -0.14187; not yet checked |
| Lang Sims studio, Brixton Road | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.46139, -0.11572; not yet checked |
| All Saints, Leavesden | yes | Sir George Gilbert Scott's church of 1853, listed Grade II (loc-nhle 1175616). The 1858 wedding was in this building. | original building | target 51.69550, -0.38840; not yet checked |
| Mansell Street, Whitechapel | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 300 metres. The panel offers the Then and Today maps instead. |
| Mead Cottage, Bushey | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2000 metres. The panel offers the Then and Today maps instead. |
| Plymouth Road, Canning Town | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 300 metres. The panel offers the Then and Today maps instead. |
| Queen Street, Chelsea | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 300 metres. The panel offers the Then and Today maps instead. |
| Royal Albert Docks, London | yes | The dock is still there; its quays are now London City Airport and offices (loc-wiki-churches lists the docks with the other places checked). | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| Royal filling factory, Woolwich | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2500 metres. The panel offers the Then and Today maps instead. |
| St Albans Abbey | yes | St Albans Abbey, now St Albans Cathedral (loc-wiki-churches). | original building | target 51.75053, -0.34256; not yet checked |
| St Andrew's, Plaistow | yes | James Brooks's church of 1868 to 1870 still stands, listed Grade II; damaged in the Blitz and repaired, it is no longer a parish church and is now offices (loc-nhle 1080967, loc-wiki-st-andrew-plaistow). | original building | target 51.52450, 0.02830; not yet checked |
| St Dunstan, Stepney | yes | The medieval church still stands (loc-wiki-churches). | original building | target 51.51685, -0.04167; not yet checked |
| St John, Hackney | yes | St John-at-Hackney, built 1792 to 1797, still stands (loc-wiki-churches). | original building | target 51.54908, -0.05324; not yet checked |
| St Luke, Chelsea (the old parish church, now Chelsea Old Church) | rebuilt | Chelsea Old Church was largely destroyed by a bomb in 1941 and rebuilt after the war (loc-wiki-churches). | rebuilt on the site | target 51.48300, -0.17080; not yet checked |
| St Margaret, Ward End | yes | The church of 1834, listed Grade II (loc-nhle 1220802), closed in 2005 and is now a community centre (loc-wiki-st-margaret-ward-end). | original building | target 52.49560, -1.83400; not yet checked |
| St Martin in the Bull Ring, Birmingham | rebuilt | The church was rebuilt in 1873 to 1875, so the 1827 wedding was in the earlier building on this site (loc-wiki-churches). | rebuilt on the site | target 52.47700, -1.89320; not yet checked |
| St Mary's Church, Wanstead | yes | St Mary's, Wanstead, of 1787 to 1790, still stands (loc-wiki-churches). | original building | target 51.57131, 0.03253; not yet checked |
| St Mary's, Battersea | yes | St Mary's, Battersea, of 1775 to 1777, still stands (loc-wiki-churches). | original building | target 51.47655, -0.17543; not yet checked |
| St Mary, Whitechapel | demolished | St Mary Matfelon was destroyed by bombing in 1940 and cleared; the site is now Altab Ali Park (loc-wiki-churches). | site only | target 51.51619, -0.06852; not yet checked |
| St Matthew's, Brixton | yes | St Matthew's, Brixton, of 1822 to 1824, still stands (loc-wiki-churches). | original building | target 51.45969, -0.11595; not yet checked |
| St Peter, London Docks | yes | St Peter's, London Docks, built in the 1860s, still stands (loc-wiki-churches). | original building | target 51.50620, -0.05810; not yet checked |
| St Philip's, Stepney | rebuilt | The 1871 wedding was in the chapel of 1818 to 1821. It was replaced in 1888 to 1892 by the present church, now the Whitechapel Library (loc-survey-of-london-st-philip, loc-nhle 1065066). | rebuilt on the site | target 51.51730, -0.06050; not yet checked |
| Stuart studio, 47 and 49 Brompton Road, Knightsbridge | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.50034, -0.16255; not yet checked |
| Sutton Road, Aston Manor | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 1500 metres. The panel offers the Then and Today maps instead. |
| The Nest, Chester Road, Erdington | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 900 metres. The panel offers the Then and Today maps instead. |
| Tower of London | yes | Still standing (loc-wiki-churches). | original building | target 51.50822, -0.07619; not yet checked |
| Royal Victoria Dock (the Victoria Docks) | yes | The Royal Victoria Dock is still a dock basin. | none | Not precise enough for Street View: the place is known only to within about 1000 metres. The panel offers the Then and Today maps instead. |
| Woolwich Dockyard | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.49366, 0.05331; not yet checked |
| Cliveden and Taplow, Buckinghamshire | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 51.55855, -0.68890; not yet checked |
| Hamilton Palace | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 55.77641, -4.03203; not yet checked |
| Holyrood Abbey, Edinburgh | yes | The abbey church survives as a roofless ruin. | original building | target 55.95315, -3.17165; not yet checked |
| Lantern Hatch, Itchingfield, near Horsham, Sussex | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2000 metres. The panel offers the Then and Today maps instead. |
| Roxburgh Castle | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 55.59661, -2.45616; not yet checked |
| St Mary's, Brixham | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | nearest public view | target 50.38661, -3.50359; not yet checked |
| The Tythe House, Stewkley, near Leighton Buzzard | unknown | Not yet checked against the historic OS maps and Street View. Listed in docs/map-audit.md for checking. | none | Not precise enough for Street View: the place is known only to within about 2000 metres. The panel offers the Then and Today maps instead. |

Houses marked unknown have not been checked against the historic OS maps or Street View yet: the old maps are only reachable from a browser, and that check is listed for you below. None is marked as standing or gone without a source.

## Images and licences

Only photographs from the family collection, already published on the site, are used as "then" images. Nothing is downloaded from elsewhere and no Google imagery is saved. The coloured Brompton Road postcard is not used, because its origin is not recorded.

| Place | File | Credit | Licence | Source |
|---|---|---|---|---|
| J. Perriman's studio, 3 Greenland Place, Camden Town | `photos/cdv-perriman-back-flat.jpg` | Family collection | Family collection. Published on this site by the family; not for reuse. | `perriman-cdv` |
| J. Perriman's studio, 3 Greenland Place, Camden Town | `photos/cdv-mother-child-front.jpg` | Family collection | Family collection. Published on this site by the family; not for reuse. | `perriman-cdv` |
| Lang Sims studio, Brixton Road | `photos/lang-sims-woman.jpg` | Family collection | Family collection. Published on this site by the family; not for reuse. | `lang-sims-card` |
| South Africa | `photos/babs-and-edward-with-boys.jpg` | Family collection | Family collection. Published on this site by the family; not for reuse. | `beach-snapshots` |
| St Mary's Church, Wanstead | `photos/wedding-group-closeup-print.jpg` | Family collection, wedding album | Family collection. Published on this site by the family; not for reuse. | `album-1950` |
| St Mary's Church, Wanstead | `photos/wedding-church-steps-couple.jpg` | Family collection, wedding album | Family collection. Published on this site by the family; not for reuse. | `album-1950` |
| Stuart studio, 47 and 49 Brompton Road, Knightsbridge | `photos/edward-dixon-stuart-studio.jpg` | Family collection | Family collection. Published on this site by the family; not for reuse. | `stuart-card` |
| Tura, south of Cairo, Egypt | `photos/view/ron-album-2652.jpg` | Family collection, Ron's album | Family collection. Published on this site by the family; not for reuse. | `ron-album` |

Record crops shown on the map are the site's own crops in images/records, opened in the same lightbox as the pages. Historic maps come from the National Library of Scotland through MapTiler and carry the NLS attribution whenever they are on screen.

## Crops not on the map

- 1824 and 1826 Battersea baptisms of William Gottlob junior and Emma Falcke: they are not on the tree, so there is no one to put on the map.
- 1859 marriage of Emma Frances Fitz Maurice and Samuel Dixon: not on the tree; the link to the family is not proved.
- 1914 Tramway and Railway World and the medal index card: no place in the record.
- 1936 banns at St Peter and St Paul, Harlington: struck through and cancelled; the wedding is mapped at Staines, where the newspaper places it.

## The directory's open questions (section 8 of docs/address-directory.md)

1. Still open: no place for her occupation. Not mapped.
2. Still open. Not mapped.
3. Resolved for the map: the death has no place, so it is listed under "Not yet on the map"; the burial is mapped at Crowthorne (family).
4. As 3.
5. Still open: born abroad, no place.
6. Still open.
7. Still open.
8. Still open.
9. Still open.
10. Still open.
11. Still open.
12. Resolved: this is the elder Henry Stacey (henry-stacey-elder). The younger Henry's marriage is mapped at All Saints, Leavesden.
13. Still open.
14. Still open.
15. Still open.
16. Still open.
17. Resolved: the marriage index on the Andrews page gives late 1863, Luton district. Added to people.json with an Update note and mapped as an area.
18. As 17.
19. Resolved for the map: the 1921 bakery in Plymouth Road is a page event; occupations[1] covers 1901 to 1921 and keeps no single place.
20. occupations[2] is mapped at Plaistow. spouses[0] now points at St Philip's, Stepney, and the 57 Rutland Street address he gave is its own page event.
21. Still open.
22. Still open.
23. Still open.
24. Still open: only Bolingbroke Gardens is entered. It is not on a map yet, so it is drawn as a circle over Battersea.
25. Accepted: those events stay at town or district level.
26. Resolved: the occupation now says Kew (Update note); Hampton Hill stays as her residence.
27. Accepted: 1 Honey Street is mapped for 1901 only; the 1891 to 1925 residence stays at Bodmin.
28. Resolved: mapped at the Hammersmith district; the card says the family remembers Windsor (family). The Windsor pin is removed.
29. Still open, and out of scope for this build.
30. Kept as the directory left it. See question 6 below.
31. Kept: 1916.
32. Kept out.
33. Kept out.
34. Mapped twice as the site has it: the registration in the West Ham district (probably him) and the drowning in the Victoria Docks (family statement).
35. Mapped: the family belief as a family statement over South Africa, and the two undated court cases at Cape Town.
36. Kept: both marriages are mapped by place only, with no living person named on the map.
37. Done: every registration district is drawn as an area and worded "registered in the ... district".
38. Worked: stands today is now filled from listing and history sources for the churches and landmarks; houses stay unknown until checked.
39. Kept off the map. The possible Carlow origin is not mapped either.
40. Worked: every one is now on the map, at the precision the sources allow (see the place table).

## Leads outside this build (not added)

- Edith's 1925 address. The Reg's brother and sisters page, the Sources page and the passenger-list crop read 55 Seymour Street, Higher Tranmere, Birkenhead, and the map follows the site. The research notes passed on with this build read the same list as 86 Seymour Street. One of the two is a misreading. If it is 86, only the house number on the map changes: the point is on Seymour Street either way. (The build brief also called 55 Seymour Street "Camden Town"; that was a slip, the site says Birkenhead.)
- The identity of "E. Fitzmaurice" of 7 North Side, Clapham, on the Canadian list: not identified, and not named as Reg's mother.
- The search for Bob's son: not started.

## Open questions for Seb and Mum

1. Edith's address in November 1925: 55 or 86 Seymour Street, Higher Tranmere? A look at the Saxon list image settles it.
2. Pat's birthplace: the family remembers Windsor. Is there anything (a birth certificate, a christening card) that would tie the Hammersmith registration to a Windsor address?
3. Where did Ron and Pat live after the wedding? No address after 1950 is published, and the map shows none.
4. Which street is "7 North Lane, Clapham Common"? The three 1925 lists give North Lane, North Side and North Street. Does anyone remember a family address in Clapham?
5. Clifton Ville, Westgate Terrace, Whitstable: does the family have a photo of the house, or know which number it was?
6. Reg's second wife: the registers name an Elizabeth C. Fitzmaurice at 42 Nestles Avenue from 1949. The map shows Reg there to 1977 and does not name her. If she may still be living, should the pin stop at 1949?
7. Bolingbroke Gardens and Pottery Lane (Battersea, 1851): would you like the second line of the census read and entered?
8. 23 Sutton Court Road: does the family know whether the house was destroyed on 19 April 1941 or damaged and repaired? The map says "unknown" until Bomb Sight and the post-war maps are checked.
9. Ham Farm, Aldenham: does anyone know where the farmhouse stood? It is drawn as a wide circle.
10. The Street View viewpoints listed above all need a look. Without a build key the map opens the panorama nearest each place, facing it.

## Not yet on the map

Dated facts of people who have died that have no place yet. The map lists them in its "Not yet on the map" tray with what is known; in Timeline mode they still get their moment, with "Place not known".

- Rosina Maud Andrews: occupation, 1921 to 1939 (Home duties)
- Sidney George Andrews: occupation, 1939 (Junior clerk, hardwood merchant)
- Ronald Andrews: death, 2010 (family)
- Patricia Andrews: death, 2020 (family)
- William G. Falcke: birth, about 1793, born abroad
- Robert W. FitzMaurice: occupation, 1861 (Surveyor)
- John Rupert FitzMaurice: occupation, 1895 (Quarry owner)
- Walter FitzMaurice: occupation, 1895 (Contractor)
- Charles Spencer: death, before April 1891
- Charles Spencer: occupation, by 1891 (Builder and contractor)
- Leslie Hugh Simmons: birth, probably 10 April 1905
- Ann Stacey: birth, about 1801 to 1806
- Robert Walter: birth, about 1808 to 1809
- Mary Walter: birth, about 1808, as aged 33 in 1841
- Henry Stacey: occupation, 1861 to 1891 (Farm labourer, or agricultural labourer)
- George Andrews: occupation, 1871 to 1881 (Agricultural labourer)
- Herbert Andrews: occupation, 1901 to 1921 (Journeyman baker)
- William Cousins: occupation, 1871 (Clerk)
- John Gall: death, before 15 January 1871
- John Gall: occupation, by 1871 (Brewer)
- Amelia Cousins: occupation, 1911 (Cook)

## Things for Seb to do

- Create a MapTiler key (free tier) for the old Ordnance Survey maps, restrict it to the HTTP origin https://belfiore.github.io in MapTiler's console, and put it in `config.js` as `MAPTILER_KEY`. Until then the Then button and the period maps say they need it.
- Optionally, create a Google Maps Embed API key restricted to the HTTP referrer https://belfiore.github.io/* and to the Maps Embed API only, and put it in `config.js` as `GOOGLE_EMBED_KEY`. With it Street View opens inside the page; without it the button opens Google Maps in a new tab.
- Optionally, use a separate Google key for the build-time Street View lookups (`GOOGLE_STREETVIEW_KEY=... node tools/streetview-viewpoints.mjs`). Keep that key out of the repo.
- Check the points placed by hand, the Street View viewpoints and the houses marked unknown (lists above).
- Answer the open questions with Mum.

