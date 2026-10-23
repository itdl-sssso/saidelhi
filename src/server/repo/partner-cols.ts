import { partner } from "../db/tables";

/** Columns of a PartnerRec (shared by the public repo and the M6 admin repo). */
export const partnerCols = {
  id: partner.id,
  name: partner.name,
  kind: partner.kind,
  city: partner.city,
  active: partner.active,
  nameHi: partner.nameHi,
  contact: partner.contact,
  showPublicly: partner.showPublicly,
  version: partner.version,
};
