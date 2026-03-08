export interface UploadedImageResult {
  imageUrl: string;
  thumbnailUrl: string | null;
}

export interface GeneratedFadeResult {
  videoUrl: string;
  thumbnailUrl: string | null;
}

interface CloudinaryMediaSource {
  publicId: string;
  format: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
}

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
}

const VITE_CLOUDINARY_API_KEY="797213819654381"
const VITE_CLOUDINARY_CLOUD_NAME="dagxzno9s"
const VITE_CLOUDINARY_UPLOAD_PRESET="trackfit"

const CLOUDINARY_PROGRESS_FOLDER = "trackfit/progress";
const CLOUDINARY_FADE_FOLDER = "trackfit/progress/fades";

function readCloudinaryConfig(): CloudinaryConfig {
  const cloudName = VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = VITE_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = VITE_CLOUDINARY_API_KEY;

  if (typeof cloudName !== "string" || cloudName.trim().length === 0) {
    throw new Error("Cloudinary: VITE_CLOUDINARY_CLOUD_NAME manquant.");
  }
  if (typeof uploadPreset !== "string" || uploadPreset.trim().length === 0) {
    throw new Error("Cloudinary: VITE_CLOUDINARY_UPLOAD_PRESET manquant.");
  }
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("Cloudinary: VITE_CLOUDINARY_API_KEY manquant.");
  }

  return {
    cloudName: cloudName.trim(),
    uploadPreset: uploadPreset.trim(),
    apiKey: apiKey.trim(),
  };
}

export async function uploadToCloudinary(file: File): Promise<UploadedImageResult> {
  const config = readCloudinaryConfig();
  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", config.uploadPreset);
  formData.append("api_key", config.apiKey);
  formData.append("filename_override", file.name);
  formData.append("folder", CLOUDINARY_PROGRESS_FOLDER);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const json = (await response.json()) as CloudinaryUploadResponse;
  if (!response.ok || !json.secure_url) {
    const apiMessage = json.error?.message;
    throw new Error(apiMessage ?? "Upload Cloudinary impossible.");
  }

  return {
    // We keep the original delivery URL without transformation for no compression.
    imageUrl: json.secure_url,
    thumbnailUrl: json.secure_url,
  };
}

function encodePublicIdForPath(publicId: string): string {
  return publicId
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function toLayerPublicId(publicId: string): string {
  return publicId
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(":");
}

function extractCloudinaryMediaSource(url: string, cloudName: string): CloudinaryMediaSource | null {
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!parsed.hostname.endsWith("res.cloudinary.com")) {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const cloudNameIndex = segments.findIndex((segment) => segment === cloudName);
  if (cloudNameIndex === -1) {
    return null;
  }

  const uploadIndex = segments.findIndex(
    (segment, index) => index > cloudNameIndex && segment === "upload",
  );
  if (uploadIndex === -1 || uploadIndex + 1 >= segments.length) {
    return null;
  }

  const afterUpload = segments.slice(uploadIndex + 1);
  const versionIndex = afterUpload.findIndex((segment) => /^v\d+$/.test(segment));
  const publicIdParts = versionIndex >= 0 ? afterUpload.slice(versionIndex + 1) : afterUpload;

  if (publicIdParts.length === 0) {
    return null;
  }

  const joined = decodeURIComponent(publicIdParts.join("/"));
  const extensionMatch = joined.match(/\.([a-z0-9]+)$/i);
  const format = extensionMatch?.[1]?.toLowerCase() ?? "jpg";
  const publicId = joined.replace(/\.[^/.]+$/, "");

  if (publicId.trim().length === 0) {
    return null;
  }

  return {
    publicId,
    format,
  };
}

function buildFadeSourceUrl(cloudName: string, sources: CloudinaryMediaSource[]): string {
  const clipDurationSec = 3;
  const transitionDurationSec = 1;
  const baseSource = sources[0];
  const spliceTransforms = sources.slice(1).map((source) => {
    const layerId = toLayerPublicId(source.publicId);
    return `l_${layerId},du_${clipDurationSec},c_fill,g_auto,w_1080,h_1440/fl_splice:transition_(name_fade;du_${transitionDurationSec}),fl_layer_apply`;
  });

  const transforms = [
    `c_fill,g_auto,w_1080,h_1440,du_${clipDurationSec}`,
    ...spliceTransforms,
    "f_mp4,q_auto:good",
  ];

  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/${transforms.join("/")}/${encodePublicIdForPath(baseSource.publicId)}.${encodeURIComponent(baseSource.format)}`;
}

function buildVideoThumbnailUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/so_0/${encodePublicIdForPath(publicId)}.jpg`;
}

export async function generateFadeVideoFromCloudinaryPhotos(
  imageUrls: string[],
): Promise<GeneratedFadeResult> {
  const config = readCloudinaryConfig();
  const orderedSources = imageUrls
    .map((url) => extractCloudinaryMediaSource(url, config.cloudName))
    .filter((source): source is CloudinaryMediaSource => Boolean(source));
  const uniqueSources = orderedSources
    .filter((source, index, array) =>
      array.findIndex((candidate) => candidate.publicId === source.publicId) === index,
    )
    .slice(0, 12);

  if (uniqueSources.length < 2) {
    throw new Error("Selectionne au moins 2 photos Cloudinary pour generer un fondu.");
  }

  const sourceUrl = buildFadeSourceUrl(config.cloudName, uniqueSources);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/video/upload`;
  const formData = new FormData();
  formData.append("file", sourceUrl);
  formData.append("upload_preset", config.uploadPreset);
  formData.append("api_key", config.apiKey);
  formData.append("folder", CLOUDINARY_FADE_FOLDER);
  formData.append("public_id", `fade_${Date.now()}`);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const json = (await response.json()) as CloudinaryUploadResponse;
  if (!response.ok || !json.secure_url) {
    const apiMessage = json.error?.message;
    throw new Error(
      apiMessage ??
        "Generation Cloudinary impossible (verifie que les photos source existent et que les transformations video sont autorisees).",
    );
  }

  const thumbnailUrl =
    typeof json.public_id === "string" && json.public_id.trim().length > 0
      ? buildVideoThumbnailUrl(config.cloudName, json.public_id)
      : null;

  return {
    videoUrl: json.secure_url,
    thumbnailUrl,
  };
}
