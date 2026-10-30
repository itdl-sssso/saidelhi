# Event extract eval — rules only

45 cases, 21 fields each. Run 2026-10-27T01:42Z.

| Metric | Value |
|---|---|
| Field accuracy | 84.0% |
| Hallucination (invented / should be empty) | 4.9% |
| Miss rate (empty / should have value) | 20.4% |
| Wrong values | 47 |
| Cases fully right | 1/45 |
| Results passing EventExtract | 45/45 |

| Field | ok | rightly empty | missed | invented | wrong |
|---|---|---|---|---|---|
| kind | 38 | 4 | 0 | 0 | 3 |
| sevaType | 34 | 4 | 4 | 2 | 1 |
| title | 33 | 0 | 2 | 6 | 4 |
| samithi | 27 | 14 | 4 | 0 | 0 |
| date | 33 | 4 | 2 | 2 | 4 |
| endDate | 2 | 40 | 3 | 0 | 0 |
| startTime | 26 | 13 | 4 | 0 | 2 |
| endTime | 17 | 19 | 6 | 1 | 2 |
| recurrenceWeekday | 2 | 43 | 0 | 0 | 0 |
| venueName | 2 | 8 | 15 | 0 | 20 |
| venueAddress | 1 | 29 | 0 | 14 | 1 |
| partner | 4 | 39 | 1 | 0 | 1 |
| topic | 4 | 41 | 0 | 0 | 0 |
| audience | 2 | 37 | 6 | 0 | 0 |
| services | 0 | 33 | 6 | 2 | 4 |
| bring | 5 | 31 | 8 | 0 | 1 |
| volunteersNeeded | 0 | 39 | 6 | 0 | 0 |
| target | 2 | 39 | 4 | 0 | 0 |
| contactName | 5 | 34 | 2 | 0 | 4 |
| contactPhone | 9 | 34 | 2 | 0 | 0 |
| sevadalNote | 4 | 39 | 1 | 1 | 0 |

<details><summary>Per case</summary>

```
✓ bhajan-ggn4-labelled
✗ eye-fbd1-labelled
    services wrong: got ["free EYE CAMP","free spectacles for needy patients","free medicines"] want ["Free spectacles for needy patients","Free medicines"]
✗ eye-gurgaon2-hinglish
    venueName wrong: got "Sai Mandir" want "Sai Mandir, DLF Phase 3"
    venueAddress extra: got "DLF Phase 3" want null
    partner miss: got null want "Ankit Eye Care"
    services extra: got ["free Aankhon ki jaanch camp"] want []
    bring miss: got [] want ["purana chashma"]
✗ eye-west3-devanagari
    title wrong: got "सभी भक्तगण पधारें।" want "नि:शुल्क नेत्र जाँच शिविर"
    samithi miss: got null want "west-3"
    venueName wrong: got "साई मंदिर" want "साई मंदिर, राजौरी गार्डन"
    venueAddress extra: got "राजौरी गार्डन" want null
    services miss: got [] want ["नि:शुल्क चश्मा एवं दवाइयाँ"]
✗ blood-central3-labelled
    venueName wrong: got "Sai Seva Bhawan" want "Sai Seva Bhawan, Karol Bagh"
    venueAddress extra: got "Karol Bagh" want null
    bring miss: got [] want ["ID proof"]
    volunteersNeeded miss: got null want 10
✗ blood-gbn3-prose-thissunday
    title wrong: got "everyone" want "Noida Samithi (GBN 3) is organising a blood donation camp this Sunday at Sai Centre, Sector 62, in association with Red Cross blood bank"
    venueName wrong: got "Sai Centre" want "Sai Centre, Sector 62"
    bring wrong: got ["Aadhaar","have a light breakfast"] want ["Aadhaar"]
✗ blood-ghaziabad2-hard
    venueName wrong: got "Sai Bhawan" want "Sai Bhawan, Vaishali"
    venueAddress wrong: got "Vaishali" want "Plot 21/B, Sector 4, Vaishali"
    contactName wrong: got "For registration Mr. Anil Gupta - after 6 pm" want "Mr. Anil Gupta"
✗ medical-east2-labelled
    venueName wrong: got "Sai Dispensary" want "Sai Dispensary, Mayur Vihar Phase 1"
    venueAddress extra: got "Mayur Vihar Phase 1" want null
    services wrong: got ["free medicines will be distributed"] want ["General physician","dentist","ENT","gynaecologist","Free medicines"]
    volunteersNeeded miss: got null want 15
✗ medical-okhla-multiday-prose
    title miss: got null want "Health camp for slum children and families, 5th, 6th and 7th December 2026, daily 10 am to 4 pm at Sai Seva Kendra, Okhla"
    date wrong: got "2026-12-07" want "2026-12-05"
    endDate miss: got null want "2026-12-07"
    venueName miss: got null want "Sai Seva Kendra, Okhla"
    partner wrong: got "Okhla. Sathya Sai Medical Trust" want "Sathya Sai Medical Trust"
    audience miss: got null want "slum children and families"
    services wrong: got ["free checkups"] want ["Free checkups","blood tests","medicines"]
    volunteersNeeded miss: got null want 20
✗ medical-sw4-caps-noon
    sevaType miss: got null want "medical"
    venueName miss: got null want "SAI MANDIR, DWARKA SECTOR 7"
    services wrong: got ["free DIABETES"] want ["FREE DIABETES AND BP CHECKUP"]
✗ medical-fbd5-forwarded-phone
    date wrong: got "2026-11-24" want "2026-11-29"
    startTime miss: got null want "10:00"
    endTime miss: got null want "13:00"
    venueName miss: got null want "Sai Centre NIT 3"
    contactName wrong: got "Dr Meenakshi will attend, after 5.30 pm" want "Dr Meenakshi"
✗ narayan-north2-tworeports
    startTime wrong: got "08:30" want "10:00"
    endTime miss: got null want "12:00"
    venueName wrong: got "Sai Mandir" want "Subzi Mandi slum"
    services miss: got [] want ["Food distribution"]
    target miss: got null want {"count":300,"unit":"packets"}
    sevadalNote miss: got null want "Reporting: 8.30 am at Sai Mandir, Model Town"
✗ narayan-central1-recurring
    date miss: got null want "2026-11-05"
    startTime miss: got null want "12:30"
    endTime extra: got "12:30" want null
    venueName wrong: got "Hanuman Mandir" want "Hanuman Mandir, Connaught Place"
    services miss: got [] want ["hot khichdi"]
    target miss: got null want {"count":150,"unit":"people"}
✗ narayan-gnw-devanagari-digits
    samithi miss: got null want "greater-noida-west"
    endTime miss: got null want "14:00"
    venueName wrong: got "साई मंदिर" want "साई मंदिर, गौर सिटी"
    venueAddress extra: got "गौर सिटी" want null
    services miss: got [] want ["भोजन एवं कंबल वितरण"]
    target miss: got null want {"count":500,"unit":"ज़रूरतमंदों"}
    contactName miss: got null want "सुरेश शर्मा"
    contactPhone miss: got null want "९८१०० ०००१८"
✗ balvikas-west1-labelled
    venueName wrong: got "Sai Mandir" want "Sai Mandir, Janakpuri C-Block"
    venueAddress extra: got "Janakpuri C-Block" want null
    contactName wrong: got "Parents please Mrs. Poonam Sethi" want "Mrs. Poonam Sethi"
✗ balvikas-gbn1-annualday-prose
    title miss: got null want "The Annual Day of Bal Vikas children of Gautam Buddh Nagar 1 Samithi will be held on Saturday 12 December 2026 at 4 pm at Sai Auditorium, Sector 19 Noida"
    venueName miss: got null want "Sai Auditorium, Sector 19 Noida"
    audience miss: got null want "Parents and all devotees"
    bring miss: got [] want ["white dress"]
✗ balvikas-central5-newyear
    venueName miss: got null want "Sai Centre, Pusa Road"
✗ bhajan-ggn1-akhand-multiday
    endTime miss: got null want "18:00"
    venueName wrong: got "Sai Mandir" want "Sai Mandir, Sector 14 Gurgaon"
    venueAddress extra: got "Sector 14 Gurgaon" want null
    contactName wrong: got "All devotees are requested to take a slot. Mr. Vinod Bhatia" want "Mr. Vinod Bhatia"
✗ bhajan-gzb4-nagarsankirtan
    venueName miss: got null want "Sai Mandir, Raj Nagar"
    bring miss: got [] want ["Sai flag","bhajan books"]
✗ bhajan-east4-two-samithis
    venueName wrong: got "Sai Centre" want "Sai Centre, Preet Vihar"
    venueAddress extra: got "Preet Vihar" want null
✗ bhajan-east9-unknown-samithi
    venueName wrong: got "Sai Kutir" want "Sai Kutir, Shahdara"
    venueAddress extra: got "Shahdara" want null
✗ studycircle-ggn6-labelled
    venueName wrong: got "Sai Satsang Hall" want "Sai Satsang Hall, Sushant Lok Phase 1"
    venueAddress extra: got "Sushant Lok Phase 1" want null
    audience miss: got null want "Youth and adults"
✗ studycircle-se3-devanagari
    sevaType miss: got null want "study_circle"
    samithi miss: got null want "south-east-3"
    startTime wrong: got "00:00" want "17:00"
    endTime wrong: got "06:30" want "18:30"
    venueName wrong: got "साई सत्संग भवन" want "साई सत्संग भवन, नेहरू प्लेस"
    venueAddress extra: got "नेहरू प्लेस" want null
✗ studycircle-youth-range-1030
    startTime miss: got null want "10:30"
    endTime miss: got null want "13:00"
    venueName miss: got null want "Sai Mandir, Rohini Sector 9"
    audience miss: got null want "Youth"
✗ disaster-flood-collection
    venueName miss: got null want "Sai Mandir, Lodhi Road"
    bring miss: got [] want ["dry ration","blankets","tarpaulin","sanitary pads","medicines"]
    volunteersNeeded miss: got null want 10
    sevadalNote extra: got "10 needed for sorting and packing" want null
✗ disaster-blankets-north4
    venueName wrong: got "Sai Mandir" want "Yamuna Pushta shelters"
    bring miss: got [] want ["new or washed blankets"]
    volunteersNeeded miss: got null want 25
✗ disaster-baadh-ghaziabad5-hinglish
    endDate miss: got null want "2026-11-13"
    startTime miss: got null want "10:00"
    endTime wrong: got "10:00" want "18:00"
    venueName wrong: got "Sai Bhawan" want "Sai Bhawan, Indirapuram"
    venueAddress extra: got "Indirapuram" want null
    bring miss: got [] want ["chaaval","daal","aata","tel","kapde","dawaiyan"]
✗ cleanliness-sw2-labelled
    venueName wrong: got "Central Park" want "Central Park, Dwarka Sector 10"
    venueAddress extra: got "Dwarka Sector 10" want null
    services miss: got [] want ["Refreshments"]
    volunteersNeeded miss: got null want 50
✗ cleanliness-rohini-hinglish
    date miss: got null want "2026-11-28"
    venueName miss: got null want "Sai Centre ke saamne wale park, Sector 5 Rohini"
    bring miss: got [] want ["jhadu","dastaane"]
✗ cleanliness-gbn2-emoji-caps
    venueName miss: got null want "SAI PARK, NOIDA SECTOR 62"
✗ other-mahila-sammelan
    sevaType miss: got null want "other"
    venueName miss: got null want "Sai Auditorium, Lodhi Road"
    audience miss: got null want "Ladies from all samithis"
    services miss: got [] want ["Lunch prasadam"]
    contactName miss: got null want "Mrs. Radha Iyer"
    contactPhone miss: got null want "98100 00022"
✗ other-diwali-midnight
    sevaType wrong: got "bhajan" want "other"
    endTime miss: got null want "00:00"
    venueName miss: got null want "Sai Mandir, Kalkaji"
    target miss: got null want {"count":1001,"unit":"diyas"}
✗ other-christmas-devanagari
    kind wrong: got "other" want "announcement"
    sevaType miss: got null want "other"
    title wrong: got "जय साई राम" want "साई केंद्र, गुरुग्राम में क्रिसमस पर बच्चों के लिए खेल-कूद प्रतियोगिता"
    venueName miss: got null want "साई केंद्र, गुरुग्राम"
    audience miss: got null want "सभी बच्चे"
✗ report-eye-east1
    venueName wrong: got "Sai Mandir" want "Sai Mandir, Anand Vihar"
✗ report-blood-faridabad-hinglish
    date wrong: got "2026-11-23" want "2026-11-21"
    venueName miss: got null want "Sai Mandir, Sector 15, Faridabad"
✗ report-narayan-gnw-devanagari
    title wrong: got "जय साई राम" want "नारायण सेवा रिपोर्ट"
    samithi miss: got null want "greater-noida-west"
✗ report-cleanliness-central2
    venueName miss: got null want "Lodhi Garden"
✗ report-medical-ggn3-labelled
    venueName wrong: got "Sai School" want "Sai School, Sector 40"
    venueAddress extra: got "Sector 40" want null
    services extra: got ["free MEDICAL CAMP"] want []
✗ report-bhajan-gzb3-forwarded
    date wrong: got "2026-10-25" want "2026-10-24"
    endDate miss: got null want "2026-10-25"
✗ other-thought-for-day
    title extra: got "Thought for the day" want null
✗ other-birthday
    title extra: got "Happy Birthday Mrs" want null
✗ other-question
    kind wrong: got "announcement" want "other"
    sevaType extra: got "bhajan" want null
    title extra: got "Is there bhajan today at the centre?" want null
    date extra: got "2026-12-03" want null
✗ other-poll
    kind wrong: got "announcement" want "other"
    sevaType extra: got "study_circle" want null
    title extra: got "Reply with number only please" want null
    date extra: got "2026-11-28" want null
✗ other-goodmorning
    title extra: got "Good morning everyone Sai Ram" want null
✗ other-diwali-wish-devanagari
    title extra: got "सभी को दीपावली की हार्दिक शुभकामनाएँ।" want null
```
</details>
