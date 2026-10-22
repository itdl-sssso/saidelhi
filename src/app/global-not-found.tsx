import { StandaloneError } from "./StandaloneError";
import "./globals.css";

// Only URLs the locale proxy skips (e.g. unknown files) land here; everything else gets the localised 404.
export default function GlobalNotFound() {
  return <StandaloneError kind="notFound" />;
}
