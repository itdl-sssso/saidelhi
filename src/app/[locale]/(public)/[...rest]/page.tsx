import { notFound } from "next/navigation";

// A deliberate 404 never renders a shell, so instant-navigation validation does not apply.
export const instant = false;

// Any path without a page inside a locale renders the localised not-found page.
export default function CatchAll() {
  notFound();
}
