/** Which sheet format an upload is, from its bytes (xlsx = zip) and file name; null = not a sheet. */
export function sniffSheet(bytes: Uint8Array, name: string): ".xlsx" | ".csv" | null {
  const lower = name.toLowerCase();
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
  if (lower.endsWith(".xlsx") && zip) return ".xlsx";
  if (lower.endsWith(".csv")) {
    // Reject binary data pretending to be CSV.
    const head = bytes.subarray(0, 2048);
    if (head.some((b) => b === 0)) return null;
    return ".csv";
  }
  return null;
}
