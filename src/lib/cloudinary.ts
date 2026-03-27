import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Faz upload de uma imagem via URL para o Cloudinary e retorna a URL permanente.
 */
export async function uploadFromUrl(imageUrl: string, folder = "kadosh-vendedor"): Promise<string> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    resource_type: "image",
  });
  return result.secure_url;
}
