import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { CartItem, Product, CartExtra } from '@/types';

const CART_STORAGE_KEY = 'fry_chicken_cart';

export const [CartProvider, useCart] = createContextHook(() => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCart = async (newItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
    } catch (error) {
      console.log('Error saving cart:', error);
    }
  };

  const addItem = useCallback(
    (
      product: Product,
      selectedDrink?: Product,
      extras: CartExtra[] = [],
      notes?: string,
      isPrize?: boolean
    ) => {
      const isPrizeRedemption = isPrize === true || product.isPrize === true;
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity: 1,
        selectedDrink,
        extras,
        notes,
        isPrizeRedemption,
      };
      const newItems = [...items, newItem];
      setItems(newItems);
      saveCart(newItems);
      console.log('Added item to cart:', newItem.product.name, isPrizeRedemption ? '(PREMIO 🏆)' : '');
    },
    [items]
  );

  const removeItem = useCallback(
    (id: string) => {
      const newItems = items.filter((item) => item.id !== id);
      setItems(newItems);
      saveCart(newItems);
      console.log('Removed item from cart:', id);
    },
    [items]
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(id);
        return;
      }
      const newItems = items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );
      setItems(newItems);
      saveCart(newItems);
    },
    [items, removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
    console.log('Cart cleared');
  }, []);

  const getSubtotal = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.isPrizeRedemption) {
        return total;
      }
      const itemPrice =
        item.product.price +
        item.extras.reduce((sum, e) => sum + e.product.price * e.quantity, 0);
      return total + itemPrice * item.quantity;
    }, 0);
  }, [items]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return {
    items,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    itemCount,
  };
});
