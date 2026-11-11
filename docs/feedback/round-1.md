# Review round-1

Updated 2026-10-28T09:34:12.648Z

Tested 66/92. Broken 1 · Doesn't match design 5 · Minor issues 13 · Works 47 · Not tested 1

## Broken (1)

### Event detail `/admin/events/01JCSEEDEVT000000000000018` (`adm-event`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

got this default 404 page, but it should be the custom 404 page we made


## Doesn't match design (5)

### Home `/` (`en-home`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Navbar does not match the design it covers the whole width but the design is different more like a floating island.

As i scroll down the gap of the navbar gets filled first displacing the whole background upwards. 
There is no scroll snapping as in the design.

Thought of the day not updating automatically, picture doesn't change either.

Impact says the year number, it should just say this year so far, the icons on each card is not well highlighted

5 wings should have a different color each take inspiration from the sarva dharma logo, saiconnect and social links not given in this section as mentioned in the design

add a placeholder in the centenary celebration card image as we will add a centenary image there 

Told by the people who were there, this is missing as the stories are still not on the website but make sure we account for this section

remove the current map image with a real embedded map as on the map page but it shouldn't be interactable just clickable takes you to the map page 

Sri Sathya Sai Answers Questions answered from his discourses, Auditorium reservation Sri Sathya Sai International Centre these sections were completely missed 

discrepancy in the design and implementation: Seva updates on WhatsApp, 

comparisons made to: Design: Home v2 wireframe

in the mobile view the photo of swami is cut in the background rather show it on the card than lotus ( only on mobile screens )










### About `/about` (`en-about`)
Group: Public (EN)
Checked: desktop, mobile, hindi

two sections for find a center, keep the pincode one


### Calendar `/calendar` (`en-calendar`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Dropdowns need to be rounded


### Centres map `/centres/map` (`en-map`)
Group: Public (EN)
Checked: desktop, mobile, hindi

This page doesn't match the design at all, the list should be on the right, there should be internal scrolling in a div for the list right now it blocks the page scroll, the filter and search need to be just above the list with the map spanning both the divs vertically refer Design: Map wireframe

### Impact `/impact` (`en-impact`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Fewer than 5 doesn't match the rest of the fonts

in the by district section, find a way to make the height of both containers equal so it looks symmetrical



## Minor issues (13)

### Join `/join` (`en-join`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Conceptual change we don't show the number of sevadal but rather a sevadal needed sign, also if we share the number of he coordinator will it cause issues? 

Also remove the Whatsapp JOIN card, reminder card is fine

### Article `/news/eye-camp-mayur-vihar-oct-2026` (`en-article`)
Group: Public (EN)
Checked: desktop, mobile, hindi

the clock sign must be left and 1 min read should be right in a single row not vertically aligned

on the top in the drawer, Home > News > News it should be Home > News > <Title>


### Form link: verify (eye report) `/f/nmopMGuEp-SJ1ZDJLZFslA` (`form-verify`)
Group: Form links
Checked: none

Can we also add a photos section to the form?

### Value: sathya `/values/sathya` (`en-value-sathya`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Hindi version not implemented fully

### Value: dharma `/values/dharma` (`en-value-dharma`)
Group: Public (EN)
Checked: desktop, mobile, hindi

In Dharma, instead of Bal Vikas section add medical camp; Hindi translation on the page is not fully done

धर्म पर साथ ले जाने वाले शब्द -> can be changed to a better hindi phrase ( might be in all value pages )

### Value: shanti `/values/shanti` (`en-value-shanti`)
Group: Public (EN)
Checked: desktop, mobile, hindi

Bhajans are not always / just on Thursdays and Sundays and not all samithis have fixed weekly time for it.

Some hindi texts are not available

cards should have consistent height.


### Value: prema `/values/prema` (`en-value-prema`)
Group: Public (EN)
Checked: none

Hindi translation for a few sections are missing

### Value: ahimsa `/values/ahimsa` (`en-value-ahimsa`)
Group: Public (EN)
Checked: none

Hindi translation for a few sections are missing

### Events `/admin/events` (`adm-events`)
Group: Portal / Operate
Checked: none

the type filter needs a sidescroll


### Inbox item `/admin/inbox/01JCSEEDIBX000000000000003` (`adm-inbox-item`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

should give a reason of why the action is blocked, when the cursor hovers on the blocked action


### Form templates `/admin/forms` (`adm-forms`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

No way to delete a template

### Uploads `/admin/uploads` (`adm-uploads`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

dialogue box is encapsulated inside the list box and there is no delete option


### WhatsApp `/admin/whatsapp` (`adm-whatsapp`)
Group: Portal / Communicate
Checked: none

need to make tab selection horizontally scrollable


## Works (47)

### News list `/news` (`en-news`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Privacy `/privacy` (`en-privacy`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Programs list `/programs` (`en-programs`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Program (eye) `/programs/eye` (`en-program`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Event `/events/01JCSEEDEVT000000000000011` (`en-event`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Centre (central-6) `/centres/central-6` (`en-centre`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### District (central) `/districts/central` (`en-district`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### 404 page `/this-page-does-not-exist` (`en-not-found`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Legacy URL redirect `/about-us` (`en-legacy-redirect`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Gallery album `/gallery/highlights` (`en-gallery-album`)
Group: Public (EN)
Checked: desktop, mobile, hindi

### Form link: fill `/f/nmopMGuEp-SJ1ZDJLZFslA/form` (`form-fill`)
Group: Form links
Checked: desktop, mobile, hindi

### Form link: done `/f/nmopMGuEp-SJ1ZDJLZFslA/done` (`form-done`)
Group: Form links
Checked: desktop, mobile, hindi

### Form link: expired `/f/d_CrZG1C22wi5ErjU3MAxw` (`form-expired`)
Group: Form links
Checked: none

### Form link: public (no OTP) `/f/SOYBlwAOENtt8n0CWSyEMg` (`form-public`)
Group: Form links
Checked: none

### Form link: invalid token `/f/AAAAAAAAAAAAAAAAAAAAAA` (`form-invalid`)
Group: Form links
Checked: desktop, mobile, hindi

### Login `/admin/login` (`adm-login`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

### Overview `/admin` (`adm-overview`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

### Plan event `/admin/events/new` (`adm-event-new`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

### Edit event `/admin/events/01JCSEEDEVT000000000000018/edit` (`adm-event-edit`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

### Review inbox `/admin/inbox` (`adm-inbox`)
Group: Portal / Operate
Checked: none

### Approvals `/admin/approvals` (`adm-approvals`)
Group: Portal / Operate
Checked: desktop, mobile, hindi

### Form links `/admin/links` (`adm-links`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

the dialogue box that opens is covered inside the list div it should be above it


### Form builder `/admin/forms/01JCSEEDFTP000000000000001/edit` (`adm-form-edit`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

### New upload `/admin/uploads/new` (`adm-uploads-new`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

### Sevadal `/admin/sevadal` (`adm-volunteers`)
Group: Portal / Collect
Checked: desktop, mobile, hindi

### Organisation `/admin/org` (`adm-org`)
Group: Portal / Organisation
Checked: desktop, mobile, hindi

### Centres `/admin/centres` (`adm-centres`)
Group: Portal / Organisation
Checked: desktop, mobile, hindi

### Centre detail `/admin/centres/01JCSEEDCEN000000000000105` (`adm-centre`)
Group: Portal / Organisation
Checked: desktop, mobile, hindi

### Partners `/admin/partners` (`adm-partners`)
Group: Portal / Organisation
Checked: desktop, mobile, hindi

### People `/admin/people` (`adm-people`)
Group: Portal / Organisation
Checked: desktop, mobile, hindi

### Content `/admin/content` (`adm-content`)
Group: Portal / Publish
Checked: none

Additional types should be added and the ability to add more types. Golden Stories needs to be added

### Gallery review `/admin/gallery` (`adm-gallery`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

### Gallery albums `/admin/gallery?tab=albums` (`adm-gallery-albums`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

### Content editor `/admin/content/01JCSEEDCNT000000000000003` (`adm-content-item`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

### Thoughts for the day `/admin/content/thoughts` (`adm-thoughts`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

Let's figure out a way to automate thought of the day.

### Impact controls `/admin/impact` (`adm-impact`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

Save changes / revert changes should be a floating sticky island at the bottom

### Discourses workspace `/admin/discourses` (`adm-discourses`)
Group: Portal / Publish
Checked: desktop, mobile, hindi

### Reports and exports `/admin/reports` (`adm-reports`)
Group: Portal / Communicate
Checked: desktop, mobile, hindi

### Health `/admin/health` (`adm-health`)
Group: Portal / Govern
Checked: none

### Follow-up (personal data) `/admin/follow-up` (`adm-follow-up`)
Group: Portal / Govern
Checked: desktop, mobile, hindi

### Privacy requests `/admin/privacy` (`adm-privacy`)
Group: Portal / Govern
Checked: desktop, mobile, hindi

### Audit log `/admin/audit` (`adm-audit`)
Group: Portal / Govern
Checked: desktop, mobile, hindi

### Migration `/admin/migration` (`adm-migration`)
Group: Portal / Govern
Checked: desktop, mobile, hindi

actions in redirect are not aligned properly


### Settings `/admin/settings` (`adm-settings`)
Group: Portal / Govern
Checked: desktop, mobile, hindi

### Discourses list `/discourses` (`discourses`)
Group: Discourses
Checked: desktop, mobile, hindi

### Discourse (students) `/discourses/students` (`discourse`)
Group: Discourses
Checked: desktop, mobile, hindi

### Component kitchen sink `/dev/ui` (`dev-ui`)
Group: Dev tools
Checked: none

## Notes on items still marked Not tested

- `dev-whatsapp` WhatsApp bot simulator: 122003: is the pincode of gurugram still it didn't pick it up
