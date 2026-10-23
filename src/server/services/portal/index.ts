import { type ApprovalsService, createApprovalsService } from "./approvals";
import { type AttachmentsService, type AuditService, createAttachmentsService, createAuditService } from "./audit";
import { type AdminEventsService, createAdminEventsService } from "./events";
import { type CentresAdminService, createCentresAdminService } from "./centres";
import { createFormsService, type FormsService } from "./forms";
import { createPartnersAdminService, type PartnersAdminService } from "./partners";
import { createJobsService, type JobsService } from "./jobs";
import { reportReceived } from "./lifecycle";
import { type AdminLinksService, createAdminLinksService } from "./links";
import { createOrgService, type OrgService } from "./org";
import { createOverviewService, type OverviewService } from "./overview";
import { createPeopleService, type PeopleService } from "./people";
import { createSettingsService, type SettingsService } from "./settings";
import { createUploadsService, type UploadsService } from "./uploads";
import { createVolunteersService, type VolunteersService } from "./volunteers";
import type { PortalCtx } from "./shared";

export type { AdminEventsService, AdminLinksService, ApprovalsService, AttachmentsService, AuditService, JobsService, FormsService, OrgService, OverviewService, PeopleService, SettingsService, UploadsService, CentresAdminService, PartnersAdminService, VolunteersService };
export type { PortalCtx, PortalDeps } from "./shared";

/** Coordinator portal services (§5.4). Every method takes the acting `Actor` and enforces RBAC + scope. */
export interface PortalServices {
  overview: OverviewService;
  events: AdminEventsService;
  approvals: ApprovalsService;
  links: AdminLinksService;
  org: OrgService;
  people: PeopleService;
  audit: AuditService;
  attachments: AttachmentsService;
  jobs: JobsService;
  settings: SettingsService;
  forms: FormsService;
  uploads: UploadsService;
  centres: CentresAdminService;
  partners: PartnersAdminService;
  volunteers: VolunteersService;
  /** Hook for the form-link flow after a report is received. */
  onReportSubmitted(eventId: string): Promise<void>;
}

export function createPortalServices(ctx: PortalCtx): PortalServices {
  const events = createAdminEventsService(ctx);
  const approvals = createApprovalsService(ctx, events);
  return {
    overview: createOverviewService(ctx, approvals),
    events,
    approvals,
    links: createAdminLinksService(ctx),
    org: createOrgService(ctx),
    people: createPeopleService(ctx),
    audit: createAuditService(ctx),
    attachments: createAttachmentsService(ctx),
    jobs: createJobsService(ctx),
    settings: createSettingsService(ctx),
    forms: createFormsService(ctx),
    uploads: createUploadsService(ctx),
    centres: createCentresAdminService(ctx),
    partners: createPartnersAdminService(ctx),
    volunteers: createVolunteersService(ctx),
    onReportSubmitted: (eventId) => reportReceived(ctx, eventId),
  };
}
