const TEXT_ENCODER = new TextEncoder();

function toBase64Url(source: ArrayBuffer | Uint8Array): string {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createSalt(size = 16): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export function isValidPhotoPrivacyPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim());
}

export async function hashPhotoPrivacyPin(pin: string, salt: string): Promise<string> {
  const payload = TEXT_ENCODER.encode(`${salt}:${pin.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return toBase64Url(digest);
}

export async function createPhotoPrivacyPin(pin: string): Promise<{
  pinHash: string;
  pinSalt: string;
}> {
  const pinSalt = createSalt();
  const pinHash = await hashPhotoPrivacyPin(pin, pinSalt);

  return {
    pinHash,
    pinSalt,
  };
}

export async function verifyPhotoPrivacyPin(
  pin: string,
  pinSalt: string,
  expectedPinHash: string,
): Promise<boolean> {
  const actualPinHash = await hashPhotoPrivacyPin(pin, pinSalt);
  return actualPinHash === expectedPinHash;
}
