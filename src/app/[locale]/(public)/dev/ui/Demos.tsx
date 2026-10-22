"use client";

import { useState } from "react";
import { Button } from "@/ui/Button";
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
        <p>Volunteers who joined will get a WhatsApp message with the new date. Esc, the close button or a click outside closes this.</p>
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
