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
