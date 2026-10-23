import type { Locale } from "@/contract";
import type { Actor } from "../../auth/rbac";
import type { WhatsAppProvider, OutboundMessage } from "../../providers/whatsapp/types";
import type { DataRepo } from "../../repo/types";
import type { PortalServices } from "../../services/portal";
import type { AuthService } from "../../services/auth";
import type { CentresService, EventsService, LinksService } from "../../services/types";
import type { ConversationRec, InboxItemRec } from "../../repo/wa-types";
import type { UserRec } from "../../repo/portal-types";

/** Media on an inbound message. `bytes` is present when the provider could download it. */
export interface BotMedia {
  kind: "image" | "pdf";
  name: string;
  mime?: string;
  bytes?: Uint8Array;
}

export interface BotInput {
  text: string | null;
  /** id of the tapped button or list row. */
  replyId: string | null;
  media: BotMedia | null;
}

/** What the engine needs from the rest of the system. */
export interface BotDeps {
  repo: DataRepo;
  secret: string;
  now: () => Date;
  appUrl: string;
  whatsapp: WhatsAppProvider;
  portal: PortalServices;
  links: LinksService;
  auth: AuthService;
  events: EventsService;
  centres: CentresService;
  /** Free text / photo outside a flow → review inbox. */
  ingest(i: { conversation: ConversationRec; actor: Actor | null; text: string | null; media: BotMedia | null; note?: string }): Promise<InboxItemRec>;
}

/** One inbound message being processed. Flow modules read `input`, mutate `conv.state` and queue replies. */
export interface Turn {
  deps: BotDeps;
  conv: ConversationRec;
  input: BotInput;
  user: UserRec | null;
  actor: Actor | null;
  locale: Locale;
  replies: OutboundMessage[];
}

export type Flow = {
  /** Called when the flow is entered (from a menu tap or command). */
  start(t: Turn, arg?: string): Promise<void>;
  /** Called for every message while the flow is active. */
  step(t: Turn): Promise<void>;
};
