import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { initLocale } from "@/i18n/server";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Breadcrumb } from "@/ui/Breadcrumb";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { BarChart, Funnel, LineChart, Sparkline } from "@/ui/Charts";
import { Checkbox } from "@/ui/Checkbox";
import { ColorToken } from "@/ui/ColorToken";
import { EVENT_STATUSES } from "@/ui/data/types";
import { DharmaRule } from "@/ui/DharmaRule";
import { EmptyState } from "@/ui/EmptyState";
import { EventScheduleCard } from "@/ui/EventScheduleCard";
import { Eyebrow } from "@/ui/Eyebrow";
import { EstimateBadge, FigureValue } from "@/ui/Figure";
import { Icon, icons, type IconName } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { KpiTile } from "@/ui/KpiTile";
import { Pagination } from "@/ui/Pagination";
import { QuoteCard } from "@/ui/QuoteCard";
import { SectionHeading } from "@/ui/SectionHeading";
import { Select } from "@/ui/Select";
import { SevaCard } from "@/ui/SevaCard";
import { SkeletonCard, SkeletonKpi, SkeletonRows } from "@/ui/Skeleton";
import { StatusPill } from "@/ui/StatusPill";
import { Stepper } from "@/ui/Stepper";
import { Switch } from "@/ui/Switch";
import { DialogDemo, FormKitDemo, PendingDemo, SheetDemo, TabsDemo, ToastDemo } from "./Demos";

export const metadata = { title: "Component kitchen sink", robots: { index: false } };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-6 border-t border-subtle py-12">
      <h2 id={`${id}-h`} className="text-[26px] md:text-[32px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-[13px] font-semibold text-slate-600">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const SWATCHES = [
  { name: "Prem pink", value: "var(--pink-200)", variable: "--action-primary", meaning: "Love. Primary actions and active states." },
  { name: "Shanti blue", value: "var(--blue-100)", variable: "--surface-calm", meaning: "Peace. Structure and information." },
  { name: "Sathya yellow", value: "var(--yellow-100)", variable: "--signal-note", meaning: "Truth. Highlights and notices only." },
  { name: "Gold", value: "var(--gold-300)", variable: "--dharma-rule", meaning: "The Sarva Dharma hairline." },
  { name: "Slate", value: "var(--slate-800)", variable: "--text-body", meaning: "Text. Never pure black.", onDark: true },
  { name: "Blue 700", value: "var(--blue-700)", variable: "--surface-inverse", meaning: "Footer, the one dark surface.", onDark: true },
  { name: "Success", value: "var(--signal-success)", variable: "--signal-success", meaning: "Approved." },
  { name: "Alert", value: "var(--signal-alert)", variable: "--signal-alert", meaning: "Escalated, personal data." },
];

const SPECTACLES = [
  { label: "+1.0", figure: { value: 12, estimate: false } },
  { label: "+1.5", figure: { value: 10, estimate: false } },
  { label: "+2.0", figure: { value: 20, estimate: false } },
  { label: "+2.5", figure: { value: 14, estimate: false } },
  { label: "+3.0", figure: { value: 7, estimate: false } },
  { label: "+3.5", figure: { value: { lt5: true as const }, estimate: false } },
  { label: "+4.0", figure: { value: null, estimate: false } },
];

const BY_YEAR = [
  { label: "2022", figure: { value: 18, estimate: true } },
  { label: "2023", figure: { value: 24, estimate: true } },
  { label: "2024", figure: { value: 31, estimate: false } },
  { label: "2025", figure: { value: 42, estimate: false } },
  { label: "2026", figure: { value: 27, estimate: false } },
];

const TREND = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((label, i) => ({
  label,
  figure: {
    value: i === 5 ? null : [6, 9, 8, 12, 15, 0, 18, 21][i],
    estimate: i < 3,
  },
}));

export default async function KitchenSink() {
  if (process.env.NODE_ENV === "production") notFound();
  await initLocale();

  return (
    <div className="mx-auto w-full max-w-site px-5 py-12 md:px-10">
      <SectionHeading
        level={1}
        eyebrow="Development only"
        title="Component kitchen sink"
        description="Every src/ui component with its variants and states. Switch language in the header to check Hindi. This route 404s in production."
      />

      <Section id="foundations" title="Foundations">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SWATCHES.map((s) => (
            <ColorToken key={s.name} name={s.name} value={s.value} swatchLabel={s.value} variable={s.variable} meaning={s.meaning} onDark={s.onDark} />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-serif text-[44px] leading-tight">Love all, serve all.</p>
          <p className="font-serif text-[32px]" lang="hi">
            सबसे प्रेम करो, सबकी सेवा करो।
          </p>
          <p className="max-w-[66ch]">
            Body 17px Inter. Bhajans, study circles, Bal Vikas classes and seva (service) across Delhi NCR. Numbers use Indian grouping:{" "}
            <FigureValue value={123456} inline />.
          </p>
          <p className="max-w-[66ch]" lang="hi">
            हिंदी मुख्य पाठ Noto Sans Devanagari में। पूरे दिल्ली एनसीआर में भजन, स्टडी सर्कल, बाल विकास कक्षाएँ और सेवा।
          </p>
        </div>
        <Row label="Dharma rule: 2, 3, 4, 6px">
          <div className="flex w-full flex-col gap-3">
            <DharmaRule height={2} />
            <DharmaRule height={3} />
            <DharmaRule height={4} />
            <DharmaRule height={6} />
          </div>
        </Row>
        <Row label="Icons (Lucide, stroke 1.75, sizes 16 / 18 / 20 / 24)">
          {(Object.keys(icons) as IconName[]).map((name) => (
            <span key={name} title={name} className="inline-flex text-slate-700">
              <Icon name={name} size={24} />
            </span>
          ))}
        </Row>
        <Row>
          <Icon name="hand-heart" size={16} />
          <Icon name="hand-heart" size={18} />
          <Icon name="hand-heart" size={20} />
          <Icon name="hand-heart" size={24} label="Seva" />
        </Row>
      </Section>

      <Section id="buttons" title="Buttons">
        {(["primary", "secondary", "outline", "ghost", "quiet"] as const).map((variant) => (
          <Row key={variant} label={variant}>
            <Button variant={variant} size="sm">
              Small
            </Button>
            <Button variant={variant}>Join a seva</Button>
            <Button variant={variant} size="lg" iconAfter="arrow-right">
              Large with icon
            </Button>
            <Button variant={variant} icon="map-pin">
              Find your centre
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
          </Row>
        ))}
        <Row label="Links and pending">
          <Button href="/calendar" variant="secondary" icon="calendar-days">
            Internal link
          </Button>
          <Button href="https://saidelhi.org/" external icon="heart" iconAfter="external-link">
            Donate
          </Button>
          <PendingDemo />
          <Button fullWidth variant="outline">
            Full width
          </Button>
        </Row>
      </Section>

      <Section id="badges" title="Badges, eyebrows and status">
        <Row label="Badge tones">
          <Badge tone="prem" icon="hand-heart">
            Service wing
          </Badge>
          <Badge tone="shanti">Bhajan</Badge>
          <Badge tone="sathya">Centenary</Badge>
          <Badge>Recurring</Badge>
          <EstimateBadge />
        </Row>
        <Row label="Eyebrow tones">
          <Eyebrow>Calm eyebrow</Eyebrow>
          <Eyebrow tone="warm">Warm eyebrow</Eyebrow>
          <Eyebrow tone="muted">Muted eyebrow</Eyebrow>
        </Row>
        <Row label="Status pills (md)">
          {EVENT_STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </Row>
        <Row label="Status pills (lg)">
          {EVENT_STATUSES.map((s) => (
            <StatusPill key={s} status={s} size="lg" />
          ))}
        </Row>
        <Row label="With date: cancelled strikes the date">
          <StatusPill status="planned" date="17 Oct 2026" dateTime="2026-10-17" />
          <StatusPill status="cancelled" date="24 Oct 2026" dateTime="2026-10-24" />
          <StatusPill status="postponed" date="31 Oct 2026" dateTime="2026-10-31" />
        </Row>
        <Row label="Figure values">
          <span>
            Reported: <FigureValue value={115} inline />
          </span>
          <span>
            Suppressed: <FigureValue value={{ lt5: true }} inline />
          </span>
          <span>
            Not reported: <FigureValue value={null} inline />
          </span>
        </Row>
      </Section>

      <Section id="forms" title="Forms">
        <div className="grid gap-6 md:grid-cols-2">
          <Input label="Locality or pincode" placeholder="e.g. Mayur Vihar" hint="We use this only to sort centres by distance." />
          <Input label="Volunteers needed" type="number" inputMode="numeric" defaultValue={6} />
          <Input label="Units collected" defaultValue="120" error="Must be no more than accepted donors (115)." />
          <Input label="Partner" optional placeholder="e.g. ICARE Eye Hospital" />
          <Input label="Venue" disabled defaultValue="Dr. Ambedkar Bhawan, Mayur Vihar Phase-1" />
          <Select
            label="District"
            placeholder="Choose a district"
            options={["Central", "East", "New Delhi", "North", "South", "West", "Gurugram", "Noida–Ghaziabad", "Faridabad"].map((d) => ({ value: d, label: d }))}
          />
          <Textarea label="Notes for the district" hint="Shown to coordinators only." />
          <div className="flex flex-col">
            <Checkbox label="I can bring a vehicle" />
            <Checkbox label="Remind me on WhatsApp" defaultChecked />
            <Checkbox label="Disabled option" disabled />
            <Switch label="Show estimates on public pages" defaultChecked />
            <Switch label="Discourses (flag)" />
            <Switch label="Disabled switch" disabled />
          </div>
        </div>
      </Section>

      <Section id="form-kit" title="Form kit (/f/ links)">
        <FormKitDemo />
      </Section>

      <Section id="surfaces" title="Surfaces">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(["plain", "calm", "warm", "truth"] as const).map((tone) => (
            <Card key={tone} tone={tone}>
              <h3 className="text-[20px]">{tone} card</h3>
              <p className="text-[15px] text-slate-700">16px radius, 1px border in the tone&apos;s own colour, soft shadow.</p>
            </Card>
          ))}
          <Card capped>
            <h3 className="text-[20px]">Capped</h3>
            <p className="text-[15px] text-slate-700">6px Sarva Dharma cap.</p>
          </Card>
          <Card interactive>
            <h3 className="text-[20px]">Interactive</h3>
            <p className="text-[15px] text-slate-700">Lifts 2px on hover.</p>
          </Card>
        </div>
        <SectionHeading eyebrow="Section heading" title="Service is worship in action" description="Centred variant below." />
        <SectionHeading align="center" eyebrow="Calendar" title="Upcoming bhajans and seva" description="Bhajans are held every Thursday and Sunday." />
      </Section>

      <Section id="content" title="Content cards">
        <QuoteCard label="Thought for the Day" date="22 Oct 2026" dateTime="2026-10-22" quote="Love all, serve all. Help ever, hurt never." attribution="Bhagawan Sri Sathya Sai Baba" />
        <div className="grid gap-4 md:grid-cols-3">
          <SevaCard
            href="/programs/eye"
            icon="eye"
            wing="Service"
            title="Eye camps"
            description="Free eye screening with partner hospitals, reading spectacles on the spot and cataract referrals."
            cadence="Monthly"
            location="East district"
            volunteers="6 needed"
          />
          <SevaCard
            icon="droplet"
            wing="Service"
            title="Blood donation"
            description="Camps with partner blood banks across the region."
            cadence="Quarterly"
            location="All districts"
          />
          <SevaCard icon="graduation-cap" wing="Educational" title="Bal Vikas" description="Values classes for children, every weekend." />
        </div>
        <EventScheduleCard
          title="Upcoming seva"
          events={[
            {
              id: "1",
              month: "Oct",
              day: "17",
              dateTime: "2026-10-17",
              name: "Eye camp with ICARE Eye Hospital",
              time: "9:00 AM",
              venue: "Dr. Ambedkar Bhawan, Mayur Vihar Phase-1",
              tag: "Volunteers needed: 6",
              tagTone: "prem",
              href: "/events/1",
            },
            { id: "2", month: "Oct", day: "23", name: "Bhajan", time: "5:30 PM", venue: "Samithi Mayur Vihar", tag: "Weekly" },
            { id: "3", month: "Oct", day: "24", name: "Narayan seva", time: "11:00 AM", venue: "Samithi Laxmi Nagar", tag: <StatusPill status="cancelled" /> },
          ]}
          footer={
            <Button href="/calendar" variant="ghost" iconAfter="arrow-right">
              All upcoming seva
            </Button>
          }
        />
      </Section>

      <Section id="navigation" title="Navigation">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Calendar", href: "/calendar" }, { label: "Eye camp, 17 Oct 2026" }]} />
        <TabsDemo />
        <Stepper label="Plan an event" steps={["Event", "Volunteers", "Form links", "Review"]} current={2} />
        <Pagination page={3} pageSize={25} total={132} href={(p) => `/dev/ui?page=${p}`} />
        <Pagination page={1} pageSize={25} total={20} href={(p) => `/dev/ui?page=${p}`} />
      </Section>

      <Section id="feedback" title="Feedback">
        <div className="grid gap-3">
          <Alert tone="note" title="Diwali week">
            Extended bhajans at all NCR centres from 29 October.
          </Alert>
          <Alert tone="info" title="Approved figures">
            Counts services given; one person may attend more than once.
          </Alert>
          <Alert tone="success" title="Report approved">
            Results are now public.
          </Alert>
          <Alert tone="attention" title="Escalated">
            The district didn&apos;t respond in 3 days. This is now with the state.
          </Alert>
          <Alert tone="error" title="Code not accepted">
            Check the 6 digits and try again.
          </Alert>
        </div>
        <Row label="Dialog, sheets, toasts">
          <DialogDemo />
          <SheetDemo />
        </Row>
        <ToastDemo />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState
              icon="calendar-days"
              title="Nothing planned this week"
              body="No seva is planned this week. See the calendar for later dates."
              action={
                <Button href="/calendar" variant="secondary">
                  See the calendar
                </Button>
              }
            />
          </Card>
          <Card>
            <EmptyState icon="search" title="Nothing matches these filters" body="Try a wider date range or another district." />
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonKpi />
          <SkeletonCard />
          <SkeletonRows rows={3} />
        </div>
      </Section>

      <Section id="data" title="Data display">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Activities" icon="calendar-check" figure={{ value: 1234, estimate: false }} period="This year" sparkline={[4, 6, 5, 9, 12, 10, 14]} deltaPct={12} />
          <KpiTile
            label="People served"
            icon="users"
            figure={{ value: 123456, estimate: false }}
            period="This year"
            deltaPct={-4.5}
            note="Counts services given; one person may attend more than once."
          />
          <KpiTile label="Blood units collected" icon="droplet" figure={{ value: 860, estimate: true }} period="2022–2026" />
          <KpiTile label="Spectacles given" icon="eye" figure={{ value: null, estimate: false }} period="This year" />
          <KpiTile label="Cataract referrals" figure={{ value: { lt5: true }, estimate: false }} period="Samithi Mayur Vihar" compact />
          <KpiTile label="Bal Vikas children" figure={{ value: 0, estimate: false }} period="Pilot start" deltaPct={0} compact />
        </div>
        <div className="grid gap-8 xl:grid-cols-2">
          <Card>
            <h3 className="text-[20px]">Reading spectacles by power</h3>
            <BarChart title="Reading spectacles given by power, eye camp 17 Oct 2026" data={SPECTACLES} caption={<span>Eye camp, 17 Oct 2026</span>} />
          </Card>
          <Card>
            <h3 className="text-[20px]">Activities by year</h3>
            <BarChart title="Activities by year" data={BY_YEAR} />
          </Card>
          <Card>
            <h3 className="text-[20px]">Activities per month</h3>
            <LineChart title="Activities per month, April to November" data={TREND} caption={<span>September not reported yet</span>} />
          </Card>
          <Card>
            <h3 className="text-[20px]">Eye camp funnel</h3>
            <Funnel
              title="Eye camp funnel"
              steps={[
                { label: "Registered", figure: { value: 115, estimate: false } },
                { label: "Screened", figure: { value: 115, estimate: false } },
                { label: "Spectacles given", figure: { value: 63, estimate: false } },
                { label: "Cataract found", figure: { value: 13, estimate: false } },
                { label: "Surgery done", figure: { value: null, estimate: false } },
              ]}
            />
          </Card>
        </div>
        <Row label="Sparkline">
          <Sparkline data={[3, 5, 4, 8, 7, 11, 13]} label="Rising over seven months" />
          <Sparkline data={[12, 10, 11, 7, 6, 5, 4]} width={140} height={40} />
        </Row>
      </Section>
    </div>
  );
}
