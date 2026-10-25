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
  maxPriceUsd?: number;
  priceRangeStr?: string;
  categoryName?: string;
  variantsCount?: number;
  listedNum?: number;
  countryCode?: string;
  stock?: number;
  verifiedWarehouse?: boolean;
  readyToShip?: boolean;
  hasVideo?: boolean;
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
  sortOrder?: "sales_desc" | "sales_asc" | "price_asc" | "price_desc",
  filters?: {
    readyToShipOnly?: boolean;
    verifiedWarehouseOnly?: boolean;
    minStock?: number;
  }
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
  url.searchParams.set("features", "enable_video");
  if (query && query.trim()) {
    let qClean = query.trim();
    // Si el usuario copió el SKU con sufijo de variante o SPU de la web de CJ (ej. CJJT1318735MN o CJJT131873501AZ), normalizar al SKU raíz de CJ
    const cjSkuMatch = qClean.match(/^(CJ[A-Z]{2}\d{7})[A-Z0-9]+$/i);
    if (cjSkuMatch) {
      qClean = cjSkuMatch[1];
    }
    url.searchParams.set("keyWord", qClean);
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

  // Reintentos automáticos con backoff si CJ responde 429 por límite de ráfaga (QPS limit 1 req/sec)
  let res: Response | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "CJ-Access-Token": token,
      },
    });

    if (res.status === 429 && attempts < maxAttempts) {
      // Esperar 1.2 segundos antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`Error consultando productos de CJ: HTTP ${res?.status || 500}`);
  }

  const data = await res.json();
  if (!data.result || !data.data) {
    return { products: [], total: 0, page: 1, totalPages: 0 };
  }

  const content = data.data.content || [];
  let rawList: any[] = [];
  content.forEach((group: any) => {
    if (Array.isArray(group.productList)) {
      rawList.push(...group.productList);
    }
  });

  // Si se está filtrando bodega México o en general, descartar productos restringidos a "Self-pickup only" (que obligan a ir a recogerlos físicamente al almacén)
  rawList = rawList.filter((p: any) => {
    const title = String(p.nameEn || p.productNameEn || p.productName || "");
    return !/self-pickup|pickup only|pick up only/i.test(title);
  });

  const parseCjPrice = (raw: any): number => {
    if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
    if (!raw) return 0;
    const str = String(raw).trim();
    const match = str.match(/[\d]+(?:\.[\d]+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Extrae el precio máximo si CJ devuelve un rango como "4.79 -- 10.93" para proteger margen
  const parseCjMaxPrice = (raw: any): number => {
    if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
    if (!raw) return 0;
    const str = String(raw).trim();
    const matches = str.match(/[\d]+(?:\.[\d]+)?/g);
    if (!matches || matches.length === 0) return 0;
    const nums = matches.map(m => parseFloat(m)).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  };

  const products: CjProductItem[] = rawList.map((p: any) => {
    const stock = Number(p.warehouseInventoryNum ?? p.totalVerifiedInventory ?? 0);
    const isVerified = p.verifiedWarehouse === 1 || p.verifiedWarehouse === 2 || p.autStatus === "1";
    const isReadyToShip = p.productType === "4" || stock > 50 || p.saleStatus === "3";
    const hasVideo = Boolean(p.isVideo || p.isVedio || (Array.isArray(p.videoList) && p.videoList.length > 0));
    const minPrice = parseCjPrice(p.sellPrice ?? p.price);
    const maxPrice = parseCjMaxPrice(p.sellPrice ?? p.price) || minPrice;

    return {
      id: String(p.id || p.pid || p.sku || Math.random()),
      name: String(p.nameEn || p.productNameEn || p.productName || "Producto CJ"),
      sku: String(p.sku || ""),
      image: String(p.bigImage || p.productImage || ""),
      priceUsd: minPrice,
      maxPriceUsd: maxPrice,
      priceRangeStr: String(p.sellPrice ?? p.price ?? ""),
      categoryName: String(p.categoryName || p.threeCategoryName || p.twoCategoryName || p.oneCategoryName || "Gadgets & Novedades"),
      variantsCount: Array.isArray(p.variants) ? p.variants.length : 1,
      listedNum: Number(p.listedNum) || 0,
      countryCode: countryCode ? countryCode.toUpperCase() : (p.countryCode || (p.verifiedWarehouse === 2 && p.productType === '5' ? 'MX' : 'CN')),
      stock,
      verifiedWarehouse: isVerified,
      readyToShip: isReadyToShip,
      hasVideo,
    };
  });

  let filteredProducts = products;
  if (filters?.readyToShipOnly) {
    filteredProducts = filteredProducts.filter(p => p.readyToShip);
  }
  if (filters?.verifiedWarehouseOnly) {
    filteredProducts = filteredProducts.filter(p => p.verifiedWarehouse);
  }
  if (typeof filters?.minStock === "number" && filters.minStock > 0) {
    filteredProducts = filteredProducts.filter(p => (p.stock || 0) >= (filters.minStock as number));
  }

  return {
    products: filteredProducts,
    total: filteredProducts.length !== products.length ? filteredProducts.length : (data.data.totalRecords || products.length),
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

  let res: Response | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    res = await fetch(url, {
      method: "GET",
      headers: { "CJ-Access-Token": token },
    });

    if (res.status === 429 && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`Error obteniendo detalle de CJ: HTTP ${res?.status || 500}`);
  }

  const detailJson = await res.json();

  // Cotizar flete internacional real hacia México (MX) con la variante representativa
  if (detailJson?.result && detailJson?.data) {
    const variants = detailJson.data.variants;
    // En paralelo: Cotizar flete internacional real hacia México (MX) y consultar videos oficiales del producto
    await Promise.all([
      (async () => {
        if (Array.isArray(variants) && variants.length > 0) {
          try {
            // Seleccionar variante de referencia con peso representativo / precio de entrada
            // (evita usar paquetes dobles/pesados si están al inicio del arreglo de variantes)
            const sortedByPrice = [...variants].sort((a: any, b: any) => {
              const pa = Number(a.variantSellPrice) || 0;
              const pb = Number(b.variantSellPrice) || 0;
              return pa - pb;
            });
            const refVariant = sortedByPrice[0] || variants[0];
            const targetVid = refVariant?.vid || variants[0]?.vid;

            if (targetVid) {
              const freightRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate", {
                method: "POST",
                headers: {
                  "CJ-Access-Token": token,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  startCountryCode: "CN",
                  endCountryCode: "MX",
                  products: [{ quantity: 1, vid: targetVid }],
                }),
              });
              if (freightRes.ok) {
                const freightJson = await freightRes.json();
                if (freightJson?.result && Array.isArray(freightJson.data) && freightJson.data.length > 0) {
                  const sortedOptions = [...freightJson.data]
                    .filter((o: any) => typeof o.logisticPrice === "number" && o.logisticPrice > 0)
                    .sort((a: any, b: any) => a.logisticPrice - b.logisticPrice);
                  if (sortedOptions.length > 0) {
                    detailJson.data.realFreightToMx = {
                      cheapestUsd: sortedOptions[0].logisticPrice,
                      logisticName: sortedOptions[0].logisticName,
                      logisticAging: sortedOptions[0].logisticAging,
                      allOptions: sortedOptions.slice(0, 8),
                      calculatedForVid: targetVid,
                    };
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Aviso al cotizar flete real a MX:", e);
          }
        }
      })(),
      (async () => {
        try {
          const videoRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId", {
            method: "POST",
            headers: {
              "CJ-Access-Token": token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId }),
          });
          if (videoRes.ok) {
            const videoJson = await videoRes.json();
            if ((videoJson?.success || videoJson?.result) && Array.isArray(videoJson.data) && videoJson.data.length > 0) {
              detailJson.data.videos = videoJson.data
                .filter((v: any) => v.videoUrl && typeof v.videoUrl === "string")
                .map((v: any) => ({
                  id: v.id || v.videoId,
                  url: v.videoUrl,
                  coverUrl: v.coverURL || undefined,
                  duration: v.duration || undefined,
                }));
            }
          }
        } catch (vErr) {
          console.warn("Aviso consultando videos de CJ:", vErr);
        }
      })(),
    ]);
  }

  return detailJson;
}
