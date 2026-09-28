import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Sube una imagen local al bucket público 'product-images' de Supabase Storage
 */
export async function uploadProductImage(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;

  // Generar un nombre único para evitar colisiones
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20);
  const fileName = `${Date.now()}-${cleanName}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error al subir archivo a Supabase Storage:", uploadError);
    throw uploadError;
  }

  // Obtener URL pública
  const { data: publicData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
