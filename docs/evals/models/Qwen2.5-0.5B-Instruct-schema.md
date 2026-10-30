# Event extract eval — rules + onnx-community/Qwen2.5-0.5B-Instruct (q4), prompt "schema"

45 cases, 21 fields each. Run 2026-10-27T02:07Z.

| Metric | Value |
|---|---|
| Field accuracy | 90.7% |
| Hallucination (invented / should be empty) | 2.1% |
| Miss rate (empty / should have value) | 13.1% |
| Wrong values | 27 |
| Cases fully right | 14/45 |
| Results passing EventExtract | 45/45 |
| Model calls | 33 (used in 15) |
| Replies without JSON | 1 |
| Model values failing type check | 15 |
| Model values not in the message | 57 |
| Latency p50 / p90 | 2399 / 4472 ms |

| Field | ok | rightly empty | missed | invented | wrong |
|---|---|---|---|---|---|
| kind | 39 | 4 | 0 | 0 | 2 |
| sevaType | 34 | 4 | 4 | 2 | 1 |
| title | 33 | 4 | 0 | 2 | 6 |
| samithi | 27 | 14 | 4 | 0 | 0 |
| date | 33 | 4 | 2 | 2 | 4 |
| endDate | 2 | 40 | 3 | 0 | 0 |
| startTime | 28 | 13 | 2 | 0 | 2 |
| endTime | 17 | 19 | 6 | 1 | 2 |
| recurrenceWeekday | 2 | 43 | 0 | 0 | 0 |
| venueName | 31 | 7 | 2 | 1 | 4 |
| venueAddress | 2 | 41 | 0 | 2 | 0 |
| partner | 4 | 39 | 1 | 0 | 1 |
| topic | 4 | 41 | 0 | 0 | 0 |
| audience | 2 | 37 | 6 | 0 | 0 |
| services | 1 | 34 | 7 | 1 | 2 |
| bring | 5 | 31 | 7 | 0 | 2 |
| volunteersNeeded | 6 | 39 | 0 | 0 | 0 |
| target | 2 | 39 | 4 | 0 | 0 |
| contactName | 10 | 34 | 0 | 0 | 1 |
| contactPhone | 11 | 34 | 0 | 0 | 0 |
| sevadalNote | 4 | 39 | 1 | 1 | 0 |

<details><summary>Per case</summary>

```
✓ bhajan-ggn4-labelled
✓ eye-fbd1-labelled
✗ eye-gurgaon2-hinglish
    partner miss: got null want "Ankit Eye Care"
    bring miss: got [] want ["purana chashma"]
✗ eye-west3-devanagari
    title wrong: got "सभी भक्तगण पधारें।" want "नि:शुल्क नेत्र जाँच शिविर"
    samithi miss: got null want "west-3"
    services miss: got [] want ["नि:शुल्क चश्मा एवं दवाइयाँ"]
✗ blood-central3-labelled
    bring miss: got [] want ["ID proof"]
✗ blood-gbn3-prose-thissunday
    title wrong: got "everyone" want "Noida Samithi (GBN 3) is organising a blood donation camp this Sunday at Sai Centre, Sector 62, in association with Red Cross blood bank"
    bring wrong: got ["Aadhaar","have a light breakfast"] want ["Aadhaar"]
✓ blood-ghaziabad2-hard
✗ medical-east2-labelled
    services wrong: got ["free medicines will be distributed"] want ["General physician","dentist","ENT","gynaecologist","Free medicines"]
✗ medical-okhla-multiday-prose
    title wrong: got "Health Camp for Slum Children and Families" want "Health camp for slum children and families, 5th, 6th and 7th December 2026, daily 10 am to 4 pm at Sai Seva Kendra, Okhla"
    date wrong: got "2026-12-07" want "2026-12-05"
    endDate miss: got null want "2026-12-07"
    partner wrong: got "Okhla. Sathya Sai Medical Trust" want "Sathya Sai Medical Trust"
    audience miss: got null want "slum children and families"
    services wrong: got ["free checkups"] want ["Free checkups","blood tests","medicines"]
✗ medical-sw4-caps-noon
    sevaType miss: got null want "medical"
    services miss: got [] want ["FREE DIABETES AND BP CHECKUP"]
✗ medical-fbd5-forwarded-phone
    date wrong: got "2026-11-24" want "2026-11-29"
    startTime miss: got null want "10:00"
    endTime miss: got null want "13:00"
✗ narayan-north2-tworeports
    startTime wrong: got "08:30" want "10:00"
    endTime miss: got null want "12:00"
    venueName wrong: got "Sai Mandir, Model Town" want "Subzi Mandi slum"
    services miss: got [] want ["Food distribution"]
    target miss: got null want {"count":300,"unit":"packets"}
    sevadalNote miss: got null want "Reporting: 8.30 am at Sai Mandir, Model Town"
✗ narayan-central1-recurring
    date miss: got null want "2026-11-05"
    endTime extra: got "12:30" want null
    services miss: got [] want ["hot khichdi"]
    target miss: got null want {"count":150,"unit":"people"}
✗ narayan-gnw-devanagari-digits
    samithi miss: got null want "greater-noida-west"
    endTime miss: got null want "14:00"
    services miss: got [] want ["भोजन एवं कंबल वितरण"]
    target miss: got null want {"count":500,"unit":"ज़रूरतमंदों"}
✓ balvikas-west1-labelled
✗ balvikas-gbn1-annualday-prose
    title wrong: got "Annual Day of Bal Vikas Children's Gala" want "The Annual Day of Bal Vikas children of Gautam Buddh Nagar 1 Samithi will be held on Saturday 12 December 2026 at 4 pm at Sai Auditorium, Sector 19 Noida"
    audience miss: got null want "Parents and all devotees"
    bring miss: got [] want ["white dress"]
✓ balvikas-central5-newyear
✗ bhajan-ggn1-akhand-multiday
    endTime miss: got null want "18:00"
    contactName wrong: got "Vinod Bhatia" want "Mr. Vinod Bhatia"
✗ bhajan-gzb4-nagarsankirtan
    venueAddress extra: got "Raj Nagar, Nagarsankirtan" want null
    bring wrong: got ["white","Sai flag","bhajan books"] want ["Sai flag","bhajan books"]
✓ bhajan-east4-two-samithis
✓ bhajan-east9-unknown-samithi
✗ studycircle-ggn6-labelled
    audience miss: got null want "Youth and adults"
✗ studycircle-se3-devanagari
    sevaType miss: got null want "study_circle"
    samithi miss: got null want "south-east-3"
    startTime wrong: got "00:00" want "17:00"
    endTime wrong: got "06:30" want "18:30"
✗ studycircle-youth-range-1030
    endTime miss: got null want "13:00"
    audience miss: got null want "Youth"
✗ disaster-flood-collection
    bring miss: got [] want ["dry ration","blankets","tarpaulin","sanitary pads","medicines"]
    sevadalNote extra: got "10 needed for sorting and packing" want null
✗ disaster-blankets-north4
    venueName wrong: got "Sai Mandir, Ashok Vihar" want "Yamuna Pushta shelters"
    venueAddress extra: got "Near Yamuna Pushta shelters" want null
    services extra: got ["New or washed blankets"] want []
    bring miss: got [] want ["new or washed blankets"]
✗ disaster-baadh-ghaziabad5-hinglish
    endDate miss: got null want "2026-11-13"
    startTime miss: got null want "10:00"
    endTime wrong: got "10:00" want "18:00"
    bring miss: got [] want ["chaaval","daal","aata","tel","kapde","dawaiyan"]
✗ cleanliness-sw2-labelled
    services miss: got [] want ["Refreshments"]
✗ cleanliness-rohini-hinglish
    date miss: got null want "2026-11-28"
    venueName wrong: got "Sector 5 Rohini" want "Sai Centre ke saamne wale park, Sector 5 Rohini"
    bring miss: got [] want ["jhadu","dastaane"]
✓ cleanliness-gbn2-emoji-caps
✗ other-mahila-sammelan
    sevaType miss: got null want "other"
    audience miss: got null want "Ladies from all samithis"
    services miss: got [] want ["Lunch prasadam"]
✗ other-diwali-midnight
    sevaType wrong: got "bhajan" want "other"
    endTime miss: got null want "00:00"
    target miss: got null want {"count":1001,"unit":"diyas"}
✗ other-christmas-devanagari
    sevaType miss: got null want "other"
    title wrong: got "जय साई राम" want "साई केंद्र, गुरुग्राम में क्रिसमस पर बच्चों के लिए खेल-कूद प्रतियोगिता"
    venueName miss: got null want "साई केंद्र, गुरुग्राम"
    audience miss: got null want "सभी बच्चे"
✓ report-eye-east1
✗ report-blood-faridabad-hinglish
    date wrong: got "2026-11-23" want "2026-11-21"
    venueName wrong: got "Kal Sai Mandir, Sector 15, Faridabad" want "Sai Mandir, Sector 15, Faridabad"
✗ report-narayan-gnw-devanagari
    title wrong: got "जय साई राम" want "नारायण सेवा रिपोर्ट"
    samithi miss: got null want "greater-noida-west"
✗ report-cleanliness-central2
    venueName miss: got null want "Lodhi Garden"
✓ report-medical-ggn3-labelled
✗ report-bhajan-gzb3-forwarded
    date wrong: got "2026-10-25" want "2026-10-24"
    endDate miss: got null want "2026-10-25"
✓ other-thought-for-day
✓ other-birthday
✗ other-question
    kind wrong: got "announcement" want "other"
    sevaType extra: got "bhajan" want null
    title extra: got "Is there bhajan today at the centre?" want null
    date extra: got "2026-12-03" want null
    venueName extra: got "Centre" want null
✗ other-poll
    kind wrong: got "announcement" want "other"
    sevaType extra: got "study_circle" want null
    title extra: got "Reply with number only please" want null
    date extra: got "2026-11-28" want null
✓ other-goodmorning
✓ other-diwali-wish-devanagari
```
</details>
