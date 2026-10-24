"use client";

import { useState } from "react";
import { ATTACHMENT_LIMITS } from "@/contract";
import { Button } from "@/ui/Button";
import { DateField } from "@/ui/DateField";
import { FieldMessage } from "@/ui/FieldMessage";
import { FileUpload, type UploadItem } from "@/ui/FileUpload";
import { ReadOnlyValue, TextField } from "@/ui/FormField";
import { MultiSelect } from "@/ui/MultiSelect";
import { NumberField } from "@/ui/NumberField";
import { OtpInput } from "@/ui/OtpInput";
import { PhoneField } from "@/ui/PhoneField";
import { ProgressBar } from "@/ui/ProgressBar";
import { Repeater } from "@/ui/Repeater";
import { SaveStatus } from "@/ui/SaveStatus";
import { TimeField } from "@/ui/TimeField";
import { YesNo } from "@/ui/YesNo";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { SideSheet } from "@/ui/SideSheet";
import { Tabs } from "@/ui/Tabs";
import { useToast } from "@/ui/Toast";

export function TabsDemo() {
  const [wing, setWing] = useState("all");
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Wings"
        value={wing}
        onChange={setWing}
        tabs={[
          { id: "all", label: "All" },
          { id: "service", label: "Service" },
          { id: "educational", label: "Educational" },
          { id: "spiritual", label: "Spiritual" },
        ]}
      />
      <p className="text-sm text-slate-600">Controlled, no panels. Selected: {wing}</p>
      <Tabs
        label="Impact period"
        tabs={[
          { id: "year", label: "This year", panel: <p>Panel for this year. Arrow keys, Home and End move focus.</p> },
          { id: "last", label: "Last year", panel: <p>Panel for last year.</p> },
          { id: "all", label: "All time", panel: <p>Panel for all time.</p> },
        ]}
      />
    </div>
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon="calendar-days" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Postpone this event?"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep the date
            </Button>
            <Button onClick={() => setOpen(false)}>Postpone</Button>
          </>
        }
      >
        <p>Sevadal who joined will get a WhatsApp message with the new date. Esc, the close button or a click outside closes this.</p>
      </Dialog>
    </>
  );
}

export function SheetDemo() {
  const [side, setSide] = useState<"right" | "bottom" | null>(null);
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => setSide("right")}>
        Open side sheet
      </Button>
      <Button variant="outline" onClick={() => setSide("bottom")}>
        Open bottom sheet
      </Button>
      <SideSheet
        open={side !== null}
        side={side ?? "right"}
        onClose={() => setSide(null)}
        title="Filters"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSide(null)}>
              Clear
            </Button>
            <Button onClick={() => setSide(null)}>Show results</Button>
          </>
        }
      >
        <Input label="Locality or pincode" placeholder="e.g. Mayur Vihar" />
        <Input label="Samithi" optional />
      </SideSheet>
    </div>
  );
}

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.show({ tone: "success", message: "Report approved. Figures are now public." })}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.show({ tone: "info", message: "Links resent to 3 coordinators." })}>
        Info toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.show({
            tone: "error",
            message: "This changed while you were editing.",
            action: { label: "Reload", onClick: () => undefined },
          })
        }
      >
        Error toast with action
      </Button>
      <Button variant="outline" onClick={() => toast.show({ tone: "offline", message: "Saved on this phone · Not sent yet" })}>
        Offline toast
      </Button>
    </div>
  );
}

export function PendingDemo() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      pending={pending}
      onClick={() => {
        setPending(true);
        window.setTimeout(() => setPending(false), 2000);
      }}
    >
      {pending ? "Approving" : "Approve report"}
    </Button>
  );
}

// ---- Form kit (M2) --------------------------------------------------------------------

export function FormKitDemo() {
  const [n, setN] = useState<number | null>(12);
  const [big, setBig] = useState<number | null>(115);
  const [yn, setYn] = useState<boolean | null>(null);
  const [phone, setPhone] = useState("98111");
  const [otp, setOtp] = useState("");
  const [date, setDate] = useState("2026-11-29");
  const [time, setTime] = useState("09:00");
  const [chips, setChips] = useState<string[]>(["+1.0"]);
  const [one, setOne] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Array<{ name: string }>>([{ name: "Asha" }]);
  const [files, setFiles] = useState<UploadItem[]>([
    { key: "a", name: "register.jpg", size: 2_400_000, mime: "image/jpeg", status: "done" },
    { key: "b", name: "page-2.jpg", size: 1_100_000, mime: "image/jpeg", status: "uploading", progress: 62 },
    { key: "c", name: "offline.jpg", size: 900_000, mime: "image/jpeg", status: "queued" },
    { key: "d", name: "huge.pdf", size: 8_000_000, mime: "application/pdf", status: "error" },
  ]);
  const opts = ["+1.0", "+1.5", "+2.0", "+2.5"].map((v) => ({ value: v, label: v }));
  return (
    <div className="grid max-w-xl gap-6">
      <ProgressBar value={38} label="Report progress" caption="Step 3 of 8 · Spectacles" trailing="" />
      <div className="flex flex-wrap gap-4">
        <SaveStatus state="local">Saved on this phone · Not sent yet</SaveStatus>
        <SaveStatus state="queued">Will send when online</SaveStatus>
        <SaveStatus state="sending">Sending…</SaveStatus>
        <SaveStatus state="sent">Sent</SaveStatus>
        <SaveStatus state="error">Couldn&apos;t send</SaveStatus>
      </div>
      <NumberField id="k-n" label="Sevadal" value={n} onChange={setN} max={50} stepper help="Big steppers for small counts" />
      <NumberField id="k-big" label="Registered and screened" value={big} onChange={setBig} max={100000} messages={[{ type: "warning", text: "That is higher than usual. Please check." }]} />
      <NumberField id="k-err" label="Required count" value={null} onChange={() => undefined} messages={[{ type: "error", text: "This is required." }]} />
      <FieldMessage type="check">Adds up to 63 of 63</FieldMessage>
      <FieldMessage type="info">These must add up to 63</FieldMessage>
      <YesNo id="k-yn" label="Did the person agree to be contacted?" value={yn} onChange={setYn} />
      <MultiSelect id="k-ms" label="Powers given" options={opts} value={chips} onChange={setChips} />
      <MultiSelect id="k-ss" label="Gender" single options={[{ value: "f", label: "Female" }, { value: "m", label: "Male" }]} value={one} onChange={setOne} optional />
      <DateField id="k-d" label="Date" value={date} onChange={setDate} />
      <TimeField id="k-t" label="Start time" value={time} onChange={setTime} />
      <PhoneField id="k-p" label="Phone" value={phone} onChange={setPhone} />
      <TextField id="k-tx" label="Locality" value={text} onChange={setText} help="Colony or village only" optional />
      <ReadOnlyValue id="k-ro" label="Samithi" value="Samithi Gurugram Sector 31" icon="map-pin" />
      <div className="grid gap-2">
        <span className="text-small font-medium">One-time code</span>
        <OtpInput id="k-otp" value={otp} onChange={setOtp} />
      </div>
      <Repeater<{ name: string }>
        id="k-rep"
        label="People to follow up"
        rows={rows}
        rowKey={(_, i) => String(i)}
        itemLabel="Person"
        addLabel="Add person"
        empty="No one added yet."
        onAdd={() => setRows([...rows, { name: "" }])}
        onRemove={(i) => setRows(rows.filter((_, j) => j !== i))}
        renderRow={(row, i) => <TextField id={`k-rep-${i}`} label="Name" value={row.name} onChange={(v) => setRows(rows.map((r, j) => (j === i ? { name: v } : r)))} />}
      />
      <FileUpload
        id="k-file"
        label="Photo of the register"
        items={files}
        limits={ATTACHMENT_LIMITS}
        optional
        help="Private, never published."
        onAdd={(fs) => setFiles([...files, ...fs.map((f, i) => ({ key: `n${Date.now()}${i}`, name: f.name, size: f.size, mime: f.type, status: "done" as const }))])}
        onRemove={(k) => setFiles(files.filter((f) => f.key !== k))}
        onRetry={() => undefined}
      />
    </div>
  );
}
