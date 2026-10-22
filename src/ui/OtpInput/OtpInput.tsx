"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { cx } from "../cx";
import styles from "./OtpInput.module.css";

export type OtpInputProps = {
  id: string;
  /** Digits entered so far (0–length chars). */
  value: string;
  onChange: (value: string) => void;
  /** Fires once all boxes are filled (typed, pasted or autofilled from the SMS/WhatsApp keyboard suggestion). */
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** id of the message element that explains an error. */
  describedBy?: string;
  className?: string;
};

/** Six boxes that auto-advance, accept paste anywhere and support `one-time-code` autofill. */
export function OtpInput({ id, value, onChange, onComplete, length = 6, error, disabled, autoFocus, describedBy, className }: OtpInputProps) {
  const t = useTranslations("fieldKit");
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const write = (from: number, digits: string) => {
    const arr = [...chars];
    let i = from;
    for (const d of digits) {
      if (i >= length) break;
      arr[i] = d;
      i += 1;
    }
    // Keep the value contiguous: anything after a gap is dropped.
    const firstGap = arr.findIndex((c) => !c);
    const next = (firstGap === -1 ? arr : arr.slice(0, firstGap)).join("");
    onChange(next);
    focus(Math.min(i, length - 1));
    if (next.length === length) onComplete?.(next);
  };

  const onInput = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      onChange(chars.slice(0, i).join(""));
      return;
    }
    // A single box receiving several digits = autofill or paste into one box.
    if (digits.length > 1) write(digits.length >= length ? 0 : i, digits.length >= length ? digits.slice(-length) : digits);
    else write(Math.min(i, value.length), digits);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      onChange(chars.slice(0, i - 1).join(""));
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    write(0, digits.slice(0, length));
  };

  return (
    <div id={id} role="group" aria-label={t("otpGroup", { length })} className={cx(styles.otp, error && styles.error, className)}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          // Room for a whole code so autofill into the first box isn't truncated.
          maxLength={i === 0 ? length : 1}
          value={c}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={t("otpDigit", { n: i + 1, length })}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKey(e, i)}
          onPaste={onPaste}
          onFocus={(e) => {
            // Always type into the first empty box.
            if (i > value.length) focus(value.length);
            else e.target.select();
          }}
        />
      ))}
    </div>
  );
}
