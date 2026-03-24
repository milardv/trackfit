const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const RP_NAME = "TrackFit";

function getRpId(): string {
  if (typeof window === "undefined") {
    return "localhost";
  }

  return window.location.hostname || "localhost";
}

function toBase64Url(source: ArrayBuffer | Uint8Array): string {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(source: string): ArrayBuffer {
  const normalized = source.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function createChallenge(length = 32): ArrayBuffer {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function toUserHandle(userId: string): ArrayBuffer {
  const bytes = TEXT_ENCODER.encode(userId);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function ensureWebAuthnAvailable(): void {
  if (typeof window === "undefined" || typeof window.PublicKeyCredential === "undefined") {
    throw new Error("WebAuthn n est pas disponible sur ce navigateur.");
  }

  if (!window.isSecureContext) {
    throw new Error("Le deverrouillage biométrique demande un contexte securise (HTTPS ou localhost).");
  }
}

function getDeviceLabel(): string {
  if (typeof navigator === "undefined") {
    return "Cet appareil";
  }

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? "Appareil";
  return String(platform).trim() || "Cet appareil";
}

function readClientData(response: AuthenticatorResponse): {
  type?: string;
  challenge?: string;
} {
  if (!("clientDataJSON" in response)) {
    return {};
  }

  try {
    return JSON.parse(TEXT_DECODER.decode(response.clientDataJSON)) as {
      type?: string;
      challenge?: string;
    };
  } catch {
    return {};
  }
}

function readUserHandle(response: AuthenticatorResponse): string | null {
  if (!("userHandle" in response) || !(response.userHandle instanceof ArrayBuffer)) {
    return null;
  }

  try {
    return TEXT_DECODER.decode(response.userHandle);
  } catch {
    return null;
  }
}

async function requestPhotoPrivacyCredential(
  challenge: ArrayBuffer,
  credentialIds: string[],
): Promise<Credential | null> {
  const publicKey: PublicKeyCredentialRequestOptions & {
    hints?: string[];
  } = {
    challenge,
    rpId: getRpId(),
    timeout: 60_000,
    userVerification: "required",
    hints: ["client-device"],
    allowCredentials: credentialIds.map((credentialId) => ({
      type: "public-key" as const,
      id: fromBase64Url(credentialId),
    })),
  };

  return navigator.credentials.get({
    publicKey,
  });
}

function normalizeWebAuthnError(error: unknown, action: "create" | "get"): Error {
  if (error instanceof Error) {
    const message = error.message.trim();
    const lowerMessage = message.toLowerCase();

    if (error.name === "AbortError" || error.name === "NotAllowedError") {
      return new Error(
        action === "create"
          ? "Creation du passkey annulee ou refusee."
          : "Deverrouillage annule ou refuse.",
      );
    }

    if (error.name === "InvalidStateError") {
      return new Error("Un passkey compatible existe deja sur cet appareil.");
    }

    if (
      error.name === "UnknownError"
      || (lowerMessage.includes("credential manager") && lowerMessage.includes("unknown error"))
    ) {
      return new Error(
        action === "create"
          ? "Android n a pas pu creer un nouveau passkey. Essaie d abord Deverrouiller: le passkey est peut etre deja synchronise sur cet appareil."
          : "Android n a pas pu contacter le gestionnaire d identifiants pour ce passkey.",
      );
    }

    return error;
  }

  return new Error(
    action === "create"
      ? "Impossible de creer le passkey sur cet appareil."
      : "Impossible de deverrouiller avec ce passkey.",
  );
}

export async function isPlatformPhotoPrivacyAvailable(): Promise<boolean> {
  ensureWebAuthnAvailable();

  if (
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return false;
  }

  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

export async function registerPhotoPrivacyCredential(
  userId: string,
  displayName: string,
  existingCredentialIds: string[] = [],
  options?: {
    excludeExistingCredentials?: boolean;
  },
): Promise<{ credentialId: string; label: string }> {
  ensureWebAuthnAvailable();

  const challenge = createChallenge();
  const expectedChallenge = toBase64Url(challenge);
  const shouldExcludeExistingCredentials = options?.excludeExistingCredentials !== false;
  const publicKey: PublicKeyCredentialCreationOptions & {
    hints?: string[];
  } = {
    challenge,
    rp: { name: RP_NAME, id: getRpId() },
    user: {
      id: toUserHandle(userId),
      name: userId,
      displayName: displayName.trim() || "Membre TrackFit",
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
    hints: ["client-device"],
    timeout: 60_000,
    attestation: "none",
    excludeCredentials: shouldExcludeExistingCredentials
      ? existingCredentialIds.map((credentialId) => ({
          type: "public-key" as const,
          id: fromBase64Url(credentialId),
        }))
      : [],
  };
  let credential: Credential | null;
  try {
    credential = await navigator.credentials.create({
      publicKey,
    });
  } catch (error) {
    throw normalizeWebAuthnError(error, "create");
  }

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("La creation du verrou biométrique a echoue.");
  }

  const clientData = readClientData(credential.response);
  if (clientData.type !== "webauthn.create" || clientData.challenge !== expectedChallenge) {
    throw new Error("La creation du verrou biométrique n a pas pu etre validee.");
  }

  return {
    credentialId: toBase64Url(credential.rawId),
    label: getDeviceLabel(),
  };
}

export async function verifyPhotoPrivacyUnlock(
  credentialIds: string[],
  userId: string,
): Promise<string> {
  ensureWebAuthnAvailable();

  if (credentialIds.length === 0) {
    throw new Error("Aucun appareil autorise pour deverrouiller les photos.");
  }

  const challenge = createChallenge();
  const expectedChallenge = toBase64Url(challenge);
  let credential: Credential | null;
  try {
    try {
      credential = await requestPhotoPrivacyCredential(challenge, credentialIds);
    } catch {
      credential = await requestPhotoPrivacyCredential(challenge, []);
    }
  } catch (error) {
    throw normalizeWebAuthnError(error, "get");
  }

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Le deverrouillage biométrique a echoue.");
  }

  const clientData = readClientData(credential.response);
  if (clientData.type !== "webauthn.get" || clientData.challenge !== expectedChallenge) {
    throw new Error("Le deverrouillage biométrique n a pas pu etre valide.");
  }

  const credentialId = toBase64Url(credential.rawId);
  const userHandle = readUserHandle(credential.response);

  if (!credentialIds.includes(credentialId) && userHandle !== userId) {
    throw new Error("Le passkey selectionne ne correspond pas a ce compte TrackFit.");
  }

  return credentialId;
}
