"use client";

// Six single-digit boxes with paste, auto-advance and backspace. Built here for the portal login;
// the /f/ form agent ships its own OtpInput in src/ui, so dedupe later.
import { useId, useRef } from "react";
import styles from "./Login.module.css";

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  label,
  error,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  label: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const errId = useId();
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const set = (next: string, focusAt?: number) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (focusAt !== undefined) refs.current[Math.min(focusAt, 5)]?.focus();
    if (clean.length === 6) onComplete?.(clean);
  };

  return (
    <div className={styles.otpWrap}>
      <div role="group" aria-label={label} className={styles.otp}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.box}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            value={d}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            aria-label={`${label} ${i + 1}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (!raw) return set(value.slice(0, i) + value.slice(i + 1));
              if (raw.length > 1) return set(value.slice(0, i) + raw, i + raw.length);
              set(value.slice(0, i) + raw + value.slice(i + 1), i + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) {
                e.preventDefault();
                set(value.slice(0, i - 1) + value.slice(i), i - 1);
              }
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              set(e.clipboardData.getData("text"), 5);
            }}
          />
        ))}
      </div>
      {error ? (
        <span id={errId} className={styles.err} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
