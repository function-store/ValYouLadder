/**
 * Constant-time string comparison.
 *
 * Both inputs are encoded as UTF-8 and compared byte-by-byte without
 * short-circuiting. Returns false if the byte lengths differ.
 *
 * Use everywhere a secret/token is checked against user input.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);

  if (aBytes.byteLength !== bBytes.byteLength) {
    // Still walk a fixed-length comparison so we don't leak length via timing
    // for the common case of "wrong token, same length"; here we know lengths
    // differ so we just return false.
    return false;
  }

  // Prefer the platform primitive when available (Deno + recent runtimes).
  const subtle = (crypto as unknown as { subtle?: { timingSafeEqual?: (a: BufferSource, b: BufferSource) => boolean } }).subtle;
  if (subtle?.timingSafeEqual) {
    try {
      return subtle.timingSafeEqual(aBytes, bBytes);
    } catch {
      // fall through to manual loop
    }
  }

  let diff = 0;
  for (let i = 0; i < aBytes.byteLength; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}
