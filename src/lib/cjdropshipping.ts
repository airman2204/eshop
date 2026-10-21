/**
 * ============================================================================
 * FOXDROP — CLIENTE Y UTILIDADES CJ DROPSHIPPING API V2.0
 * ============================================================================
 */

// Token persistente en el módulo para evitar llamar a /getAccessToken en cada request
let cachedAccessToken: string = "API@CJ5965480@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI1Nzc4MCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlpbUpsQzBGTmhuQUhPY3RWeWN2dlpZczQrTHJ4Q3A3MEpiZTFzL2lIbFJ2L3g5b3ZnTTdzRnp2M3dyeHlTRVg3OEJtWjBpN3lxdjJONFJZVldWNkN3L0RRdHloWFJOQWVnZXU0SVZQVUdPZndKZkJzdUp1dHdlUkZYMldwUnUwVnNwdzhDcWlrcDFmSXgvVEtFa2UvdUlTZ2FYajBxSjhRRWIySmlVSUJQSU9UeUU4WEdEUUw3eVVGcktpbGJOa2s5OWVEUnc1NUJick9FeFd3SUJoTGlTMTl6dU1sOG14YnUxaUVsY0J2Ri8zdTkxUGdHRlpuakJjVkd5ZWdEdWNDTDlrUjR2WlJmdG9EUXlVaFRVckRiWT0iLCJpYXQiOjE3OTI1OTgxMjF9.QfB1WgXwOUwmVePYZCdW_VbJcdcSCc3MBr55XCRozIg";
let tokenExpiresAt: number = new Date("2027-04-19T15:55:21+08:00").getTime();

/**
 * Obtiene o reutiliza el Access Token de CJ Dropshipping (válido hasta 2027)
 */
const DEFAULT_CJ_API_KEY = "CJ5965480@api@11b106a82c66403bb28d5cca4b6882ad";

export async function getCjAccessToken(): Promise<string> {
  const apiKey = process.env.CJ_API_KEY || "CJ5965480@api@11b106a82c66403bb28d5cca4b6882ad";

  const now = Date.now();
  // Si tenemos token en memoria válido (expira en 2027), reusarlo SIEMPRE
  if (cachedAccessToken && now < tokenExpiresAt - 3600 * 1000) {
    return cachedAccessToken;
  }

  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.result && data.data?.accessToken) {
        cachedAccessToken = data.data.accessToken;
        if (data.data.accessTokenExpiryDate) {
          tokenExpiresAt = new Date(data.data.accessTokenExpiryDate).getTime();
        }
        return cachedAccessToken;
      }
    }
  } catch {
    // Si la autenticación da 429 o falla, retornar el token guardado
  }

  return cachedAccessToken;
}

export interface CjProductItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceUsd: number;
  categoryName?: string;
  variantsCount?: number;
  listedNum?: number;
  countryCode?: string;
}

/**
 * Busca productos virales y de bajo costo en el catálogo global de CJ Dropshipping con ordenamiento nativo en backend
 */
export async function searchCjProducts(
  query: string,
  page = 1,
  size = 18,
  categoryId?: string,
  countryCode?: string,
  sortOrder?: "sales_desc" | "sales_asc" | "price_asc" | "price_desc"
): Promise<{
  products: CjProductItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const token = await getCjAccessToken();

  const url = new URL("https://developers.cjdropshipping.com/api2.0/v1/product/listV2");
  url.searchParams.set("page", page.toString());
  url.searchParams.set("size", Math.min(Math.max(size, 1), 50).toString());
  if (query && query.trim()) {
    url.searchParams.set("keyWord", query.trim());
  }
  if (categoryId && categoryId.trim()) {
    url.searchParams.set("categoryId", categoryId.trim());
  }
  if (countryCode && countryCode.trim()) {
    url.searchParams.set("countryCode", countryCode.trim().toUpperCase());
  }

  // Configuración de ordenamiento nativo global en CJ Dropshipping
  // orderBy: 1 = listing count (tiendas vendiéndolo), 2 = sell price
  // sort: 'desc' | 'asc'
  if (sortOrder === "sales_desc") {
    url.searchParams.set("orderBy", "1");
    url.searchParams.set("sort", "desc");
  } else if (sortOrder === "sales_asc") {
    url.searchParams.set("orderBy", "1");
    url.searchParams.set("sort", "asc");
  } else if (sortOrder === "price_asc") {
    url.searchParams.set("orderBy", "2");
    url.searchParams.set("sort", "asc");
  } else if (sortOrder === "price_desc") {
    url.searchParams.set("orderBy", "2");
    url.searchParams.set("sort", "desc");
  } else {
    // Por defecto: ordenar globalmente por popularidad/más vendidos
    url.searchParams.set("orderBy", "1");
    url.searchParams.set("sort", "desc");
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

  const parseCjPrice = (raw: any): number => {
    if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
    if (!raw) return 0;
    const str = String(raw).trim();
    const match = str.match(/[\d]+(?:\.[\d]+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const products: CjProductItem[] = rawList.map((p: any) => ({
    id: String(p.id || p.pid || p.sku || Math.random()),
    name: String(p.nameEn || p.productNameEn || p.productName || "Producto CJ"),
    sku: String(p.sku || ""),
    image: String(p.bigImage || p.productImage || ""),
    priceUsd: parseCjPrice(p.sellPrice ?? p.price),
    categoryName: String(p.categoryName || p.threeCategoryName || p.twoCategoryName || p.oneCategoryName || "Gadgets & Novedades"),
    variantsCount: Array.isArray(p.variants) ? p.variants.length : 1,
    listedNum: Number(p.listedNum) || 0,
    countryCode: countryCode ? countryCode.toUpperCase() : (p.countryCode || (p.verifiedWarehouse === 2 && p.productType === '5' ? 'MX' : 'CN')),
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
