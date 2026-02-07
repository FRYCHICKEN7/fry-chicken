import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const WOOCOMMERCE_URL = process.env.EXPO_PUBLIC_WOOCOMMERCE_URL || '';
const CONSUMER_KEY = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET || '';

function getBaseUrl() {
  let url = WOOCOMMERCE_URL;
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url.replace(/\/$/, '');
}

async function wooRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || !CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('WooCommerce no está configurado en el servidor');
  }

  const url = new URL(endpoint, baseUrl);
  url.searchParams.append('consumer_key', CONSUMER_KEY);
  url.searchParams.append('consumer_secret', CONSUMER_SECRET);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FryChickenApp/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`WooCommerce API Error: ${response.status}`);
    }

    return await response.json() as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error('WooCommerce request timeout (30s)');
    }
    throw error;
  }
}

export const woocommerceRouter = createTRPCRouter({
  getProducts: publicProcedure
    .input(z.object({ page: z.number().default(1), perPage: z.number().default(100) }))
    .query(async ({ input }) => {
      return wooRequest<any[]>('/wp-json/wc/v3/products', {
        page: String(input.page),
        per_page: String(input.perPage),
        status: 'publish',
      });
    }),

  getAllProducts: publicProcedure.query(async () => {
    let page = 1;
    let allProducts: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const products = await wooRequest<any[]>('/wp-json/wc/v3/products', {
        page: String(page),
        per_page: '100',
        status: 'publish',
      });
      allProducts = [...allProducts, ...products];
      if (products.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`[WooCommerce Proxy] Total products fetched: ${allProducts.length}`);
    return allProducts;
  }),

  getCategories: publicProcedure.query(async () => {
    return wooRequest<any[]>('/wp-json/wc/v3/products/categories', {
      per_page: '100',
      hide_empty: 'true',
    });
  }),
});
