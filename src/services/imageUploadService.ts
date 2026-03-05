interface ImgBbApiResponse {
  success?: boolean;
  data?: {
    url?: string;
    display_url?: string;
    thumb?: {
      url?: string;
    };
  };
  error?: {
    message?: string;
  };
}

export interface UploadedImageResult {
  imageUrl: string;
  thumbnailUrl: string | null;
}

const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

function readImgBbApiKey(): string {
  const key = import.meta.env["VITE_IMGBB_API_KEY"];
  if (typeof key === "string" && key.trim().length > 0) {
    return key.trim();
  }
  throw new Error("La cle API ImgBB est manquante (VITE_IMGBB_API_KEY).");
}

export async function uploadToImgBB(file: File): Promise<UploadedImageResult> {
  const apiKey = readImgBbApiKey();
  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", file);
  formData.append("name", file.name);

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const json = (await response.json()) as ImgBbApiResponse;
  if (!response.ok || !json.success || !json.data?.url) {
    const apiMessage = json.error?.message;
    throw new Error(apiMessage ?? "Upload ImgBB impossible.");
  }

  return {
    imageUrl: json.data.url,
    thumbnailUrl: json.data.thumb?.url ?? json.data.display_url ?? null,
  };
}
