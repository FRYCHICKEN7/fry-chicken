import { Category, Product, Branch, Promotion, Order } from '@/types';

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Combos Familiares', icon: 'users', order: 1 },
  { id: '2', name: 'Combos Personales', icon: 'user', order: 2 },
  { id: '3', name: 'Promociones', icon: 'percent', order: 3 },
  { id: '7', name: 'Combos sin Refresco', icon: 'package', order: 4 },
  { id: '4', name: 'Complementos', icon: 'plus-circle', order: 901 },
  { id: '5', name: 'Refrescos', icon: 'cup-soda', order: 902 },
  { id: '6', name: 'Refrescos Naturales', icon: 'citrus', order: 903 },
];

export const PRODUCTS: Product[] = [];

export const BRANCHES: Branch[] = [];

export const PROMOTIONS: Promotion[] = [];

// ✅ PEDIDOS DE PRUEBA ACTUALIZADOS - Ahora incluyen pedidos disponibles para delivery
export const SAMPLE_ORDERS: Order[] = [];

