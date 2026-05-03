export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derives a stable fingerprint from the request without storing a raw IP.
 * Combining the runtime peer address with the user-agent means rotating a
 * single header is not enough to get a fresh bucket.
 */
export async function fingerprintFromRequest(
  req: Request,
  info: { remoteAddr?: { hostname?: string } } | undefined
): Promise<string> {
  const runtimePeer = info?.remoteAddr?.hostname;
  const forwarded =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const composite = `${runtimePeer ?? "no-peer"}|${forwarded}|${ua}`;
  return await sha256Hex(composite);
}
