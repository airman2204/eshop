/**
 * Sube una imagen local usando la ruta segura del servidor (/api/admin).
 * Esto asegura que:
 * 1. Si el bucket 'product-images' no existe en Supabase, el servidor lo crea automáticamente con permisos públicos.
 * 2. Se salta cualquier restricción RLS en Storage que bloquearía al navegador.
 * 3. Si Supabase Storage tuviera alguna limitación de plan, devuelve una Data URL optimizada sin trabar la subida del producto.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || "No se pudo subir la imagen al almacenamiento");
  }

  const data = await res.json();
  if (!data.url) {
    throw new Error("No se recibió la URL de la imagen");
  }

  return data.url;
}

/**
 * Sube o transfiere una imagen desde una URL remota o Data URL pegada directamente.
 */
export async function uploadProductImageUrl(imageUrl: string): Promise<string> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload_image_url",
      imageUrl,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || "No se pudo procesar la imagen remota");
  }

  const data = await res.json();
  return data.url || imageUrl;
}

/**
 * Genera o transforma una fotografía de estudio profesional para el producto con Inteligencia Artificial.
 * Si se le pasa inputImage, preserva el artículo real y le aplica el fondo y estilo de estudio de FoxDrop.
 */
export async function generateProductImageWithAi(title: string, category?: string, inputImage?: string): Promise<string> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate_ai_image",
      title,
      category,
      inputImage,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || "No se pudo procesar la fotografía con IA");
  }

  const data = await res.json();
  if (!data.url) {
    throw new Error("No se recibió la URL de la imagen generada");
  }
  return data.url;
}
