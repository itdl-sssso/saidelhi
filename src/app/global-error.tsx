"use client";

import en from "../../messages/en.json";
import { StandaloneError } from "./StandaloneError";
import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <StandaloneError
      kind="error"
      action={
        <button type="button" onClick={retry} className="cursor-pointer text-link underline">
          {en.common.tryAgain}
        </button>
      }
    />
  );
}
