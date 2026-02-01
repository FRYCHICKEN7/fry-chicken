import { Platform } from 'react-native';

interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: { src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  status: 'publish' | 'draft' | 'pending' | 'private';
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  meta_data?: { key: string; value: any }[];
}

interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: { src: string } | null;
  count: number;
}

export class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    let url = process.env.EXPO_PUBLIC_WOOCOMMERCE_URL || '';
    
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    this.baseUrl = url.replace(/\/$/, '');
    this.consumerKey = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_KEY || '';
    this.consumerSecret = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET || '';

    if (!this.baseUrl) {
      console.log('[WooCommerce] No URL configured');
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.baseUrl && this.consumerKey && this.consumerSecret);
  }

  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.isConfigured()) {
      console.log('[WooCommerce] ⚠️ WooCommerce no está configurado');
      throw new Error('WooCommerce no está configurado. Configure las variables de entorno.');
    }

    if ((Platform.OS as string) === 'web') {
      console.log('[WooCommerce] ⚠️ WooCommerce sync no está disponible en navegador web debido a restricciones CORS');
      throw new Error('WooCommerce sync no está disponible en navegador web. Use la app móvil para sincronizar.');
    }

    const url = new URL(endpoint, this.baseUrl);
    
    url.searchParams.append('consumer_key', this.consumerKey);
    url.searchParams.append('consumer_secret', this.consumerSecret);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);
      
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

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.log('[WooCommerce] ⚠️ Request failed:', error?.message || error?.toString());
      
      if (error?.name === 'AbortError') {
        throw new Error('La solicitud a WooCommerce tardó demasiado (timeout 30s).');
      }
      
      if (error instanceof TypeError || error?.message?.includes('Network request failed')) {
        throw new Error('No se pudo conectar con WooCommerce. Verifique la configuración.');
      }
      
      throw error;
    }
  }

  async getProducts(page = 1, perPage = 100): Promise<WooCommerceProduct[]> {
    return this.request<WooCommerceProduct[]>('/wp-json/wc/v3/products', {
      page,
      per_page: perPage,
      status: 'publish',
    });
  }

  async getCategories(): Promise<WooCommerceCategory[]> {
    return this.request<WooCommerceCategory[]>('/wp-json/wc/v3/products/categories', {
      per_page: 100,
      hide_empty: true,
    });
  }

  async getAllProducts(): Promise<WooCommerceProduct[]> {
    let page = 1;
    let allProducts: WooCommerceProduct[] = [];
    let hasMore = true;

    while (hasMore) {
      const products = await this.getProducts(page, 100);
      allProducts = [...allProducts, ...products];
      
      if (products.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`[WooCommerce] Total products fetched: ${allProducts.length}`);
    return allProducts;
  }
}

export const wooCommerceService = new WooCommerceService();
