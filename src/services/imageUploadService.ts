export interface UploadedImageResult {
  imageUrl: string;
  thumbnailUrl: string | null;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: {
    message?: string;
  };
}

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
}

const VITE_CLOUDINARY_API_KEY="967521426526283"
const VITE_CLOUDINARY_CLOUD_NAME="dagxzno9s"
const VITE_CLOUDINARY_UPLOAD_PRESET="trackfit"

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
  formData.append("folder", "trackfit/progress");

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
