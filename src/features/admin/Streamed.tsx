import { type ReactNode, Suspense } from "react";
import { PortalLoading } from "./Loading";

/** Suspense boundary every portal page puts around its request-time content (Cache Components: instant navigation). */
export function Streamed({ children, kpis }: { children: ReactNode; kpis?: boolean }) {
  return <Suspense fallback={<PortalLoading kpis={kpis} />}>{children}</Suspense>;
}
