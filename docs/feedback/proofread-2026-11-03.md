# Site copy proofread, 3 Nov 2026

Scope: every string in `messages/en.json` (public site, form links, portal: about 3,300 strings),
WhatsApp bot copy (`src/server/whatsapp/bot/copy.ts`), and mechanical checks on `messages/hi.json`.
Not covered: news articles and discourses stored in the database, and a native read of the Hindi.

Method: read every public, form and bot string in full; spellcheck all EN strings (aspell, en_GB);
pattern scan for house-style breaks (volunteer, zone, Programs, emoji, em dashes, title case, His/his,
exclamation marks); EN/HI key parity. Voice judged against the house rules in `docs/specs/README.md`
and the sai-devotee-voice skill.

Result: spelling is clean and EN/HI keys match. The portal strings had no house-style breaks. Fixes
below are applied; open questions need a decision from the state team.

## Applied

| Where | Before | After | Why |
|---|---|---|---|
| Nav, OG card | Programs / Program | Programmes / Programme | Rest of site uses British spelling |
| Home | Login to SaiConnect | Log in to SaiConnect | "Log in" is the verb |
| Home stories | sevadals / Sevadals | Sevadal members | House term; Sevadal has no -s plural |
| Home, Sai Answers | his discourses, his life | His | Matches capitalisation elsewhere |
| About, founder | The organisation he founded | He founded | Same |
| Value pages, photo alt text | his cheek, his hands | His | Same |
| News categories | Golden Stories, Seva Report | Golden stories, Seva report | Sentence case |
| About + Programmes wings intro | "Bhagwan…", "A key highlight pertains to…", "wings function seamlessly" | "Bhagawan…", "Seva (selfless service) is the guiding light of its mission, and each of its three wings puts seva into practice in its own way." | Spelling of Bhagawan, grammar, puffed-up wording; EN and HI |
| Programmes title | Three Wings: Spiritual Wing, Service Wing, Education Wing | Three wings: Spiritual, Service and Education | Sentence case, repetition; EN and HI |
| Spiritual Wing text | broken list "- Veda chanting, Bhajans, Jyoti Meditation, -"; "weaving it"; "transmuting every moment into something more sublime" | clean list; plain closing sentence | Punctuation, grammar |
| Education Wing text | "focus … is in"; "righteousness"; "is - a divine being" | "focus … is"; "right conduct"; "is: a divine being" | Grammar; site's term for Dharma |
| Service Wing text | "teachings … has always been ‘Love All, Serve All’" | "have always been ‘Love all, serve all’" | Agreement, case |
| Service Wing citations | 19th November 1987; February 1, 1970 | 19 November 1987; 1 February 1970 | House date style |
| Service Wing activities | Narayana Seva, Medical Camps, Visit to Hospitals… | Narayan Seva, Medical camps, Hospital visits, Visits to old age homes… | Spelling used everywhere else; sentence case |
| Programme page | Jyoti Meditation; Practice in the Spiritual Wing | Jyoti meditation; Practices in the Spiritual Wing | Case, number |
| Bal Vikas lead | with the human values | with the five human values | Clarity |
| Prema value page | "Hands that help are holier than lips that pray." | "Hands that serve are holier…" | Swami's words, as quoted on the Service Wing page; EN and HI |
| Dharma value page | volunteers; Volunteer at a medical camp | Sevadal members; Serve at a medical camp | House term; EN and HI |
| Join page photo alt | Sevadal volunteers | Sevadal members | House term; EN and HI |
| Donate lead | "Your involvement can transform lives. Donate for those who need care and support." | "Your donation helps the Trust care for people who need it." | Plainer, no sales tone; EN and HI |
| Donate areas | Relief to the Poor, Medical Relief, General Public Utility | sentence case | House style |
| Calendar | "Get these on WhatsApp." | no full stop | Matches other headings |
| Bot, gallery thanks | "Thank you — 1 photo…" | "Thank you. 1 photo…" | No em dashes; EN and HI |
| Portal (HI) | admin.discourses.empty2 left in English | कोई अनुच्छेद नहीं। | Untranslated |

## Needs a decision

1. **Organisation name.** Decided 3 Nov 2026: **Sri Sathya Sai Seva Organisations, Delhi NCR**
   (plural, no hyphen). Applied to all EN strings, HI (दिल्ली एनसीआर), share images, web app
   manifest, monthly PDF report, QR poster, WhatsApp bot and the WhatsApp template header image
   (regenerated). "Sai Organisations" inside Swami's quote is left as He said it.
2. **Unsourced quotes on the value pages.** Ten "Teachings" lines are attributed to Bhagawan with no
   source (e.g. "Truth is God. Live in truth.", "Peace is the inner silence of the mind.",
   "Bhajan is the best way to purify the mind."). Each should be checked against *Sri Sathya Sai
   Speaks* and given a source, or replaced with a verified line.
3. **Repeated label and attribution.** The scripture lines (Taittiriya Upanishad, Manusmriti,
   Mahabharata, Vedic invocation) use the same text as label and attribution, so it may show twice.
4. **WhatsApp greeting.** The bot opens with "Hello {name}" (coordinators) and "Namaste" (public).
   "Sai Ram" is the natural greeting among devotees; switch?
5. **Centenary heading** "100 glorious years of pure love": keep if it is the official national theme.
6. **Quote marks.** Curly and straight quotes and apostrophes are mixed across the file. Harmless on
   screen; a one-off normalisation is possible.
7. **Hindi.** Mechanically clean (no ज़ोन, no स्वयंसेवक, no emoji); still needs a native reader, as the
   handoff notes.
8. **Articles and discourses in the database** were not part of this pass.
