/**
 * ============================================================================
 * FOXDROP — CLIENTE Y UTILIDADES CJ DROPSHIPPING API V2.0
 * ============================================================================
 */

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Obtiene o reutiliza el Access Token de CJ Dropshipping (válido hasta por 180 días)
 */
export async function getCjAccessToken(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    throw new Error("CJ_API_KEY no está configurada en las variables de entorno.");
  }

  const now = Date.now();
  // Si tenemos token en memoria y le quedan más de 1 hora de vigencia
  if (cachedAccessToken && now < tokenExpiresAt - 3600 * 1000) {
    return cachedAccessToken as string;
  }

  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    throw new Error(`Error HTTP al autenticar con CJ Dropshipping: ${res.status}`);
  }

  const data = await res.json();
  if (!data.result || !data.data?.accessToken) {
    throw new Error(`Fallo de autorización en CJ: ${data.message || "Credenciales inválidas"}`);
  }

  cachedAccessToken = data.data.accessToken;
  // Si la respuesta trae fecha de expiración, parsearla; si no, 15 días por defecto
  if (data.data.accessTokenExpiryDate) {
    tokenExpiresAt = new Date(data.data.accessTokenExpiryDate).getTime();
  } else {
    tokenExpiresAt = now + 15 * 24 * 3600 * 1000;
  }

  return cachedAccessToken as string;
}

export interface CjProductItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceUsd: number;
  categoryName?: string;
  variantsCount?: number;
}

/**
 * Busca productos virales y de bajo costo en el catálogo global de CJ Dropshipping
 */
export async function searchCjProducts(query: string, page = 1, size = 20): Promise<{
  products: CjProductItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const token = await getCjAccessToken();

  const url = new URL("https://developers.cjdropshipping.com/api2.0/v1/product/listV2");
  url.searchParams.set("page", page.toString());
  url.searchParams.set("size", Math.min(size, 50).toString());
  if (query.trim()) {
    url.searchParams.set("keyWord", query.trim());
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "CJ-Access-Token": token,
    },
  });

  if (!res.ok) {
    throw new Error(`Error consultando productos de CJ: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.result || !data.data) {
    return { products: [], total: 0, page: 1, totalPages: 0 };
  }

  const content = data.data.content || [];
  const rawList: any[] = [];
  content.forEach((group: any) => {
    if (Array.isArray(group.productList)) {
      rawList.push(...group.productList);
    }
  });

  const products: CjProductItem[] = rawList.map((p: any) => ({
    id: p.id || p.pid || p.sku,
    name: p.nameEn || p.productNameEn || p.productName || "Producto CJ",
    sku: p.sku || "",
    image: p.bigImage || p.productImage || "",
    priceUsd: Number(p.sellPrice || p.price || 0),
    categoryName: p.categoryName || "Gadgets & Novedades",
    variantsCount: p.variants?.length || 1,
  }));

  return {
    products,
    total: data.data.totalRecords || products.length,
    page: data.data.pageNumber || page,
    totalPages: data.data.totalPages || 1,
  };
}

/**
 * Obtiene el detalle completo y variantes de un producto por su ID
 */
export async function getCjProductDetails(productId: string) {
  const token = await getCjAccessToken();
  const url = `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${encodeURIComponent(productId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "CJ-Access-Token": token },
  });

  if (!res.ok) {
    throw new Error(`Error obteniendo detalle de CJ: HTTP ${res.status}`);
  }

  return await res.json();
}
