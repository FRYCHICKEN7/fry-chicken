import React, { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Branch, DeliveryZone, Complaint, DeliveryUser, Coupon, AppStats, Product, Category, BankAccount, Order, Promotion, BusinessHours, MarketingPopup, ThemeSettings, DeliveryRating, OrderCancellation, OrderDelay, BranchNotification, PointsSettings, UserPoints } from '@/types';
import { BRANCHES, SAMPLE_ORDERS } from '@/mocks/data';
import { wooCommerceService } from '@/services/woocommerce';
import { firebaseService } from '@/services/firebase-service';
import { auth } from '@/lib/firebase';
import { useAuth } from './AuthProvider';

const BRANCHES_KEY = 'fry_chicken_branches';
const BRANCHES_SYNC_KEY = 'fry_chicken_branches_last_sync';
const BRANCHES_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const COMPLAINTS_KEY = 'fry_chicken_complaints';
const DELIVERY_USERS_KEY = 'fry_chicken_delivery_users';
const DELIVERY_REQUESTS_KEY = 'fry_chicken_delivery_requests';
const COUPONS_KEY = 'fry_chicken_coupons';
const PRODUCTS_KEY = 'fry_chicken_products';
const CATEGORIES_KEY = 'fry_chicken_categories';
const BANK_ACCOUNTS_KEY = 'fry_chicken_bank_accounts';
const ORDERS_KEY = 'fry_chicken_orders';
const PROMOTIONS_KEY = 'fry_chicken_promotions';
const BUSINESS_HOURS_KEY = 'fry_chicken_business_hours';
const MARKETING_POPUP_KEY = 'fry_chicken_marketing_popup';
const THEME_SETTINGS_KEY = 'fry_chicken_theme_settings';
const DELIVERY_RATINGS_KEY = 'fry_chicken_delivery_ratings';
const ORDER_CANCELLATIONS_KEY = 'fry_chicken_order_cancellations';
const ORDER_DELAYS_KEY = 'fry_chicken_order_delays';
const BRANCH_NOTIFICATIONS_KEY = 'fry_chicken_branch_notifications';
const POINTS_SETTINGS_KEY = 'fry_chicken_points_settings';
const USER_POINTS_KEY = 'fry_chicken_user_points';
const WOOCOMMERCE_SYNC_KEY = 'fry_chicken_woocommerce_last_sync';
const SYNC_INTERVAL = 5 * 60 * 1000;
const WHATSAPP_NUMBER = '+50499889315';
const SELECTED_BRANCH_KEY = 'fry_chicken_selected_branch';

export const [DataProviderInner, useData] = createContextHook(() => {
  const { user, setSyncBranchesCallback } = useAuth();
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [deliveryUsers, setDeliveryUsers] = useState<DeliveryUser[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryUser[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([
    { dayOfWeek: 0, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true },
    { dayOfWeek: 6, openTime: '08:00', closeTime: '18:00', isOpen: true },
  ]);
  const [marketingPopup, setMarketingPopup] = useState<MarketingPopup | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    primaryColor: '#FCBA1D',
    secondaryColor: '#000000',
    accentColor: '#D01714',
    successColor: '#21A118',
    backgroundColor: '#F5F5F5',
    surfaceColor: '#FFFFFF',
    textPrimaryColor: '#1A1A1A',
    textSecondaryColor: '#666666',
    buttonColor: '#000000',
    whatsappButtonColor: '#25D366',
    addToCartButtonColor: '#FCBA1D',
    addToCartTextColor: '#FFFFFF',
    fontFamily: 'System',
    fontSize: 'medium',
  });
  const [deliveryRatings, setDeliveryRatings] = useState<DeliveryRating[]>([]);
  const [orderCancellations, setOrderCancellations] = useState<OrderCancellation[]>([]);
  const [orderDelays, setOrderDelays] = useState<OrderDelay[]>([]);
  const [branchNotifications, setBranchNotifications] = useState<BranchNotification[]>([]);
  const [pointsSettings, setPointsSettings] = useState<PointsSettings>({
    enabled: true,
    conversionRate: 10,
    redeemableCategories: [],
  });
  const [userPoints, setUserPoints] = useState<UserPoints[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [hasInitializedFirebaseSync, setHasInitializedFirebaseSync] = useState(false);
  const [lastBranchesSync, setLastBranchesSync] = useState<string | null>(null);

  const syncBranchesFromFirebase = useCallback(async (forceSync: boolean = false) => {
    try {
      const lastSync = await AsyncStorage.getItem(BRANCHES_SYNC_KEY);
      const now = Date.now();
      
      if (!forceSync && lastSync) {
        const timeSinceSync = now - new Date(lastSync).getTime();
        if (timeSinceSync < BRANCHES_CACHE_DURATION) {
          const daysAgo = Math.floor(timeSinceSync / (24 * 60 * 60 * 1000));
          const hoursAgo = Math.floor((timeSinceSync % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          console.log(`📦 [BRANCHES CACHE] Using cached branches (synced ${daysAgo} days, ${hoursAgo} hours ago)`);
          return;
        }
      }

      console.log('🔄 [BRANCHES SYNC] Fetching branches from Firebase...');
      const unsubscribe = firebaseService.branches.getAll((firebaseBranches) => {
        console.log('✅ [BRANCHES SYNC] Branches loaded from Firebase:', firebaseBranches.length);
        setBranches(firebaseBranches);
        AsyncStorage.setItem(BRANCHES_KEY, JSON.stringify(firebaseBranches));
        AsyncStorage.setItem(BRANCHES_SYNC_KEY, new Date().toISOString());
        setLastBranchesSync(new Date().toISOString());
        unsubscribe();
      });
    } catch (error) {
      console.error('❌ [BRANCHES SYNC] Error syncing branches:', error);
    }
  }, []);

  const syncWooCommerceData = useCallback(async () => {
    const wooUrl = process.env.EXPO_PUBLIC_WOOCOMMERCE_URL;
    const wooKey = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
    const wooSecret = process.env.EXPO_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !wooKey || !wooSecret) {
      console.log('[WooCommerce Sync] ℹ️ WooCommerce no está configurado, omitiendo sincronización');
      return;
    }

    if ((Platform.OS as string) === 'web') {
      console.log('[WooCommerce Sync] ℹ️ WooCommerce sync deshabilitado en navegador web (restricciones CORS). Use la app móvil para sincronizar.');
      return;
    }

    try {
      console.log('[WooCommerce Sync] Starting sync...');
      setIsSyncing(true);

      const [wooProducts, wooCategories] = await Promise.all([
        wooCommerceService.getAllProducts(),
        wooCommerceService.getCategories(),
      ]);

      const lastCategoryNames = ['complementos', 'refrescos', 'refrescos naturales'];
      const mappedCategories: Category[] = wooCategories
        .filter(cat => cat.slug !== 'carrusel' && cat.slug !== 'uncategorized' && cat.slug !== 'sin-categorizar')
        .map((cat, index) => {
          const isLastCategory = lastCategoryNames.some(name => 
            cat.name.toLowerCase().includes(name)
          );
          return {
            id: String(cat.id),
            name: cat.name,
            icon: getCategoryIcon(cat.name),
            order: isLastCategory ? 900 + index : index + 1,
          };
        });

      const carouselCategory = wooCategories.find(cat => cat.slug === 'carrusel');
      const carouselProducts = carouselCategory ? wooProducts.filter(p => 
        p.status === 'publish' && 
        p.stock_status === 'instock' &&
        p.categories.some(cat => cat.id === carouselCategory.id)
      ) : [];

      const carouselPromotions: Promotion[] = carouselProducts.map(p => ({
        id: String(p.id),
        image: p.images[0]?.src || 'https://via.placeholder.com/400',
        title: p.name,
        action: 'product' as const,
        targetId: String(p.id),
      }));

      const excludedSlugs = ['carrusel', 'uncategorized', 'sin-categorizar'];
      
      const mappedProducts: Product[] = wooProducts
        .filter(p => {
          if (p.status !== 'publish' || p.stock_status !== 'instock') return false;
          
          const hasValidCategory = p.categories.some(cat => !excludedSlugs.includes(cat.slug));
          return hasValidCategory;
        })
        .map(p => {
          const validCategory = p.categories.find(cat => !excludedSlugs.includes(cat.slug));
          const categoryId = validCategory?.id ? String(validCategory.id) : '1';
          const price = parseFloat(p.price || p.regular_price || '0');
          
          const hasComboPersonalCategory = p.categories.some(cat => 
            cat.name.toLowerCase().includes('combo') && cat.name.toLowerCase().includes('personal')
          );
          const hasComboFamiliarCategory = p.categories.some(cat => 
            cat.name.toLowerCase().includes('combo') && cat.name.toLowerCase().includes('familiar')
          );
          const hasPromoCategory = p.categories.some(cat => 
            cat.name.toLowerCase().includes('promo')
          );
          
          let comboType: 'personal' | 'familiar' | 'promotion' | undefined = undefined;
          if (hasComboPersonalCategory) comboType = 'personal';
          else if (hasComboFamiliarCategory) comboType = 'familiar';
          else if (hasPromoCategory) comboType = 'promotion';
          
          const isCombo = comboType !== undefined;
          const includesDrink = hasComboPersonalCategory;

          const productImage = p.images && p.images.length > 0 ? p.images[0].src : 'https://via.placeholder.com/400';
          console.log(`[WooCommerce Sync] Product: ${p.name}, Image: ${productImage}, Has images: ${p.images?.length || 0}`);

          return {
            id: String(p.id),
            name: p.name,
            description: p.short_description || p.description || '',
            price: price,
            image: productImage,
            categoryId: categoryId,
            isCombo: isCombo,
            comboType: comboType,
            includesDrink: includesDrink,
            available: true,
          };
        });

      await Promise.all([
        AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(mappedProducts)),
        AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(mappedCategories)),
        AsyncStorage.setItem(PROMOTIONS_KEY, JSON.stringify(carouselPromotions)),
        AsyncStorage.setItem(WOOCOMMERCE_SYNC_KEY, new Date().toISOString()),
      ]);

      setProducts(mappedProducts);
      setCategories(mappedCategories);
      if (carouselPromotions.length > 0) {
        setPromotions(carouselPromotions);
      }
      setLastSyncTime(new Date().toISOString());

      console.log(`[WooCommerce Sync] ✅ Success: ${mappedProducts.length} products, ${mappedCategories.length} categories`);
      console.log('[WooCommerce Sync] ✅ Sample product:', {
        name: mappedProducts[0]?.name,
        image: mappedProducts[0]?.image,
        price: mappedProducts[0]?.price,
      });
    } catch {
      console.log('[WooCommerce Sync] ℹ️ No se pudo sincronizar con WooCommerce. La aplicación continuará usando datos locales/Firebase');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (setSyncBranchesCallback) {
      setSyncBranchesCallback(() => async () => {
        console.log('🔄 [SYNC CALLBACK] Force syncing branches from callback');
        await syncBranchesFromFirebase(true);
      });
    }
  }, [setSyncBranchesCallback, syncBranchesFromFirebase]);

  useEffect(() => {
    loadSelectedBranch();
    loadData();
    
    const initSync = async () => {
      const lastSync = await AsyncStorage.getItem(WOOCOMMERCE_SYNC_KEY);
      const hasCache = await AsyncStorage.getItem(PRODUCTS_KEY);
      
      if (hasCache && lastSync) {
        const timeSinceSync = Date.now() - new Date(lastSync).getTime();
        if (timeSinceSync < 60 * 60 * 1000) {
          console.log('[WooCommerce] Using cached data, last synced', Math.floor(timeSinceSync / (60 * 1000)), 'minutes ago');
          return;
        }
      }
      
      syncWooCommerceData();
    };
    
    initSync();
    
    syncBranchesFromFirebase(false);

    const syncInterval = setInterval(() => {
      syncWooCommerceData();
    }, SYNC_INTERVAL);
    
    const branchSyncInterval = setInterval(() => {
      syncBranchesFromFirebase(false);
    }, 7 * 24 * 60 * 60 * 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(branchSyncInterval);
    };
  }, [syncBranchesFromFirebase, syncWooCommerceData]);

  const initializeFirebaseListeners = useCallback(() => {
    if (!user) {
      console.log('🔥 [FIREBASE] No user, skipping listeners');
      return;
    }

    if (!auth.currentUser) {
      console.log('⚠️ [FIREBASE] Firebase Auth user not ready, skipping listeners');
      return;
    }
    
    console.log('🔥 [FIREBASE] Initializing Firebase real-time listeners for role:', user?.role);
    console.log('🔥 [FIREBASE] Firebase Auth UID:', auth.currentUser?.uid);
    
    try {
      const unsubscribers: (() => void)[] = [];

      if (user?.role === 'admin') {
        console.log('🔥 [FIREBASE] Admin: Listening to all collections');
        
        unsubscribers.push(firebaseService.orders.getAll((firebaseOrders) => {
          console.log('🔥 [FIREBASE] Orders updated from Firebase:', firebaseOrders.length);
          setOrders(firebaseOrders);
          AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(firebaseOrders));
        }));

        unsubscribers.push(firebaseService.branches.getAll((firebaseBranches) => {
          console.log('🔥 [FIREBASE] Branches updated from Firebase (admin realtime):', firebaseBranches.length);
          setBranches(firebaseBranches);
          AsyncStorage.setItem(BRANCHES_KEY, JSON.stringify(firebaseBranches));
          AsyncStorage.setItem(BRANCHES_SYNC_KEY, new Date().toISOString());
          setLastBranchesSync(new Date().toISOString());
        }));

        unsubscribers.push(firebaseService.deliveryUsers.getAll((firebaseDeliveryUsers) => {
          console.log('🔥 [FIREBASE] Delivery users updated from Firebase:', firebaseDeliveryUsers.length);
          setDeliveryUsers(prev => {
            const requestIds = new Set(prev.filter(u => u.id.includes('-')).map(u => u.id));
            const approvedUsers = firebaseDeliveryUsers;
            const pendingRequests = prev.filter(u => requestIds.has(u.id) && !approvedUsers.find(a => a.id === u.id));
            const combined = [...approvedUsers, ...pendingRequests];
            AsyncStorage.setItem(DELIVERY_USERS_KEY, JSON.stringify(combined));
            return combined;
          });
        }));

        unsubscribers.push(firebaseService.deliveryRequests.getAll((firebaseRequests) => {
          console.log('🔥 [FIREBASE] Delivery requests updated from Firebase:', firebaseRequests.length);
          setDeliveryUsers(prev => {
            const approvedUserIds = new Set(prev.filter(u => !u.id.includes('-')).map(u => u.id));
            const approvedUsers = prev.filter(u => approvedUserIds.has(u.id));
            const combined = [...approvedUsers, ...firebaseRequests as DeliveryUser[]];
            const unique = combined.filter((item, index, self) => 
              index === self.findIndex(t => t.id === item.id)
            );
            console.log('🔥 [FIREBASE] Combined delivery users:', unique.length);
            AsyncStorage.setItem(DELIVERY_USERS_KEY, JSON.stringify(unique));
            return unique;
          });
        }));

        unsubscribers.push(firebaseService.products.getAll((firebaseProducts) => {
          console.log('🔥 [FIREBASE] Products updated from Firebase:', firebaseProducts.length);
          if (firebaseProducts.length > 0) {
            setProducts(firebaseProducts);
            AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(firebaseProducts));
          }
        }));

        unsubscribers.push(firebaseService.categories.getAll((firebaseCategories) => {
          console.log('🔥 [FIREBASE] Categories updated from Firebase:', firebaseCategories.length);
          if (firebaseCategories.length > 0) {
            setCategories(firebaseCategories);
            AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(firebaseCategories));
          }
        }));

        unsubscribers.push(firebaseService.bankAccounts.getAll((firebaseAccounts) => {
          console.log('🔥 [FIREBASE] Bank accounts updated from Firebase:', firebaseAccounts.length);
          setBankAccounts(firebaseAccounts);
          AsyncStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(firebaseAccounts));
        }));

        unsubscribers.push(firebaseService.userPoints.getAll((firebaseUserPoints) => {
          console.log('🔥 [FIREBASE] User points updated from Firebase:', firebaseUserPoints.length);
          setUserPoints(firebaseUserPoints);
          AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(firebaseUserPoints));
        }));

        unsubscribers.push(firebaseService.pointsSettings.listen((firebaseSettings) => {
          if (firebaseSettings) {
            console.log('💎 [FIREBASE] Points settings updated from Firebase:', firebaseSettings);
            setPointsSettings(firebaseSettings);
            AsyncStorage.setItem(POINTS_SETTINGS_KEY, JSON.stringify(firebaseSettings));
          }
        }));
      } else if (user?.role === 'branch' && user.branchId) {
        console.log('🔥 [FIREBASE] Branch: Listening to branch-specific data');
        
        unsubscribers.push(firebaseService.orders.getByBranch(user.branchId, (firebaseOrders) => {
          console.log('🔥 [FIREBASE] Orders updated from Firebase:', firebaseOrders.length);
          setOrders(firebaseOrders);
          AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(firebaseOrders));
        }));

        unsubscribers.push(firebaseService.deliveryUsers.getByBranch(user.branchId, (firebaseDeliveryUsers) => {
          console.log('🔥 [FIREBASE] Delivery users updated from Firebase:', firebaseDeliveryUsers.length);
          setDeliveryUsers(prev => {
            const requestIds = new Set(prev.filter(u => u.id.includes('-')).map(u => u.id));
            const approvedUsers = firebaseDeliveryUsers;
            const pendingRequests = prev.filter(u => requestIds.has(u.id) && !approvedUsers.find(a => a.id === u.id));
            const combined = [...approvedUsers, ...pendingRequests];
            AsyncStorage.setItem(DELIVERY_USERS_KEY, JSON.stringify(combined));
            return combined;
          });
        }));

        unsubscribers.push(firebaseService.deliveryRequests.getByBranch(user.branchId, (firebaseRequests) => {
          console.log('🔥 [FIREBASE] Delivery requests updated from Firebase:', firebaseRequests.length);
          console.log('🔥 [FIREBASE] Request statuses:', firebaseRequests.map(r => ({ id: r.id, name: r.name, status: r.status })));
          setDeliveryRequests(firebaseRequests as DeliveryUser[]);
          AsyncStorage.setItem(DELIVERY_REQUESTS_KEY, JSON.stringify(firebaseRequests));
          
          // Usar directamente los datos de Firebase como fuente de verdad
          // Los datos de Firebase ya tienen el status correcto (pending/approved/rejected)
          setDeliveryUsers(firebaseRequests as DeliveryUser[]);
          AsyncStorage.setItem(DELIVERY_USERS_KEY, JSON.stringify(firebaseRequests));
          console.log('🔥 [FIREBASE] Delivery users updated from Firebase requests:', firebaseRequests.length);
        }));

        syncBranchesFromFirebase(false);
      } else if (user?.role === 'delivery' && user.id) {
        console.log('🔥 [FIREBASE] Delivery: Listening to assigned orders and available orders');
        
        let assignedOrders: Order[] = [];
        let availableOrders: Order[] = [];

        const combineAndSetOrders = () => {
          const combined = [...assignedOrders, ...availableOrders];
          const unique = combined.filter((order, index, self) => 
            index === self.findIndex(o => o.id === order.id)
          );
          console.log('🔥 [FIREBASE] Combined orders for delivery:', {
            assigned: assignedOrders.length,
            available: availableOrders.length,
            total: unique.length
          });
          setOrders(unique);
          AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(unique));
        };
        
        unsubscribers.push(firebaseService.orders.getByDelivery(user.id, (firebaseOrders) => {
          console.log('🔥 [FIREBASE] Assigned orders updated from Firebase:', firebaseOrders.length);
          assignedOrders = firebaseOrders;
          combineAndSetOrders();
        }));

        const loadDeliveryUsersAndListenToOrders = async () => {
          console.log('🔍 [FIREBASE] Loading all delivery users to find branches for DNI...');
          
          const allDeliveryUsersSnapshot = await firebaseService.deliveryUsers.getAllSnapshot();
          console.log('📋 [FIREBASE] All delivery users loaded:', allDeliveryUsersSnapshot.length);
          
          const myDeliveryProfile = allDeliveryUsersSnapshot.find(d => 
            (d.email && user?.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
            (d.id === user?.id)
          );
          
          const myDNI = myDeliveryProfile?.dni;
          console.log('🆔 [FIREBASE] My DNI:', myDNI);
          
          if (myDNI) {
            const myAllowedBranchIds = allDeliveryUsersSnapshot
              .filter(d => d.dni === myDNI && d.status === 'approved')
              .map(d => d.branchId);
            
            console.log('🏢 [FIREBASE] My allowed branch IDs for listening:', myAllowedBranchIds);
            
            if (myAllowedBranchIds.length > 0) {
              unsubscribers.push(firebaseService.orders.getAvailableForDeliveryMultipleBranches(myAllowedBranchIds, (firebaseAvailableOrders) => {
                console.log('🔥 [FIREBASE] Available orders from multiple branches updated:', firebaseAvailableOrders.length);
                availableOrders = firebaseAvailableOrders;
                combineAndSetOrders();
              }));
            } else {
              console.log('⚠️ [FIREBASE] No approved branches found for DNI:', myDNI);
            }
          } else {
            console.log('⚠️ [FIREBASE] No DNI found for delivery user');
          }
        };
        
        loadDeliveryUsersAndListenToOrders();

        syncBranchesFromFirebase(false);
      } else if (user?.role === 'customer') {
        console.log('🔥 [FIREBASE] Customer: Setting up user points listener');
        
        unsubscribers.push(firebaseService.userPoints.getAll((firebaseUserPoints) => {
          console.log('🔥 [FIREBASE] User points updated from Firebase:', firebaseUserPoints.length);
          const myPoints = firebaseUserPoints.filter(p => p.userId === user.id);
          if (myPoints.length > 0) {
            console.log('💎 [FIREBASE] Customer points loaded:', myPoints[0]);
          }
          setUserPoints(firebaseUserPoints);
          AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(firebaseUserPoints));
        }));
      }

      setFirebaseConnected(true);
      console.log('✅ [FIREBASE] All listeners initialized successfully');

      return () => {
        console.log('🔥 [FIREBASE] Cleaning up listeners');
        unsubscribers.forEach(unsub => unsub());
      };
    } catch (error) {
      console.error('❌ [FIREBASE] Error initializing listeners:', error);
      return undefined;
    }
  }, [user, syncBranchesFromFirebase]);

  useEffect(() => {
    const syncInitialDataToFirebase = async () => {
      if (!user || user.role === 'customer' || hasInitializedFirebaseSync) return;
      
      console.log('🔄 [FIREBASE] Syncing initial local data to Firebase...');
      
      try {
        const defaultBusinessHours: BusinessHours[] = [
          { dayOfWeek: 0, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 6, openTime: '08:00', closeTime: '18:00', isOpen: true },
        ];
        
        let branchesToSync = BRANCHES;
        
        const localBranches = await AsyncStorage.getItem(BRANCHES_KEY);
        if (localBranches) {
          const parsedBranches = JSON.parse(localBranches);
          if (parsedBranches.length > 0) {
            console.log('📦 [FIREBASE] Found', parsedBranches.length, 'branches in AsyncStorage');
            branchesToSync = parsedBranches;
          }
        }
        
        if (branchesToSync.length > 0) {
          console.log('📤 [FIREBASE] Uploading', branchesToSync.length, 'branches to Firebase with default hours (08:00-18:00)');
          
          const branchesWithDefaultHours = branchesToSync.map(branch => ({
            ...branch,
            businessHours: defaultBusinessHours
          }));
          
          for (const branch of branchesWithDefaultHours) {
            await firebaseService.branches.create(branch).catch(async (err) => {
              console.log('⚠️ Branch exists, updating hours:', branch.id);
              await firebaseService.branches.update(branch.id, { businessHours: defaultBusinessHours });
            });
          }
          
          await AsyncStorage.setItem(BRANCHES_KEY, JSON.stringify(branchesWithDefaultHours));
          await AsyncStorage.setItem(BRANCHES_SYNC_KEY, new Date().toISOString());
          setBranches(branchesWithDefaultHours);
          console.log('✅ [FIREBASE] Branches saved with default hours (08:00-18:00)');
        }
        
        setHasInitializedFirebaseSync(true);
        console.log('✅ [FIREBASE] Initial sync completed');
      } catch (error) {
        console.error('❌ [FIREBASE] Error syncing initial data:', error);
      }
    };

    if (!user) {
      console.log('🔥 [FIREBASE] No user authenticated, skipping Firebase listeners');
      setFirebaseConnected(false);
      return;
    }

    if (user.role === 'customer') {
      console.log('🔥 [FIREBASE] Customer authenticated, setting up branches sync and points listener');
      syncBranchesFromFirebase(false);
      
      const initCustomerPoints = async () => {
        try {
          console.log('🔍 [CUSTOMER POINTS] Checking if points exist for user:', user.id);
          const existingPoints = await firebaseService.userPoints.getById(user.id);
          
          if (!existingPoints) {
            console.log('📝 [CUSTOMER POINTS] Creating initial points for user:', user.id);
            const initialPoints: UserPoints = {
              userId: user.id,
              availablePoints: 0,
              totalPoints: 0,
              lastUpdated: new Date().toISOString(),
            };
            await firebaseService.userPoints.create(initialPoints);
            console.log('✅ [CUSTOMER POINTS] Initial points created');
            
            setUserPoints((prevUserPoints) => {
              const newUserPoints = [...prevUserPoints.filter(up => up.userId !== user.id), initialPoints];
              AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(newUserPoints));
              return newUserPoints;
            });
          } else {
            console.log('✅ [CUSTOMER POINTS] Points already exist:', existingPoints.availablePoints || 0);
          }
        } catch (error) {
          console.error('❌ [CUSTOMER POINTS] Error initializing points:', error);
        }
      };
      
      initCustomerPoints();
      
      const cleanup = initializeFirebaseListeners();
      
      const customerBranchSyncInterval = setInterval(() => {
        console.log('🔄 [FIREBASE] Customer: Syncing branches (7 days interval)');
        syncBranchesFromFirebase(false);
      }, 7 * 24 * 60 * 60 * 1000);
      
      return () => {
        if (cleanup) cleanup();
        clearInterval(customerBranchSyncInterval);
      };
    }

    console.log('🔥 [FIREBASE] User authenticated (', user.role, '), initializing Firebase listeners');
    
    const initFirebase = async () => {
      try {
        console.log('🔥 [FIREBASE INIT] Initializing Firebase for role:', user.role);
        
        if (user.role === 'admin') {
          console.log('🔥 [FIREBASE INIT] Admin user - verifying/creating user document...');
          try {
            const userDoc = await firebaseService.users.getById(user.id).catch(() => null);
            if (!userDoc) {
              console.log('⚠️ [FIREBASE INIT] User not found in Firestore, creating...');
              await firebaseService.users.create(user).catch(err => {
                console.error('❌ [FIREBASE INIT] Error creating user:', err);
              });
            } else {
              console.log('✅ [FIREBASE INIT] User verified in Firestore');
            }
          } catch (userError) {
            console.error('⚠️ [FIREBASE INIT] Error with user document, continuing anyway:', userError);
          }
          
          await syncInitialDataToFirebase();
        } else {
          console.log('🔥 [FIREBASE INIT] Non-admin user - skipping user verification');
        }
        
        console.log('🔥 [FIREBASE INIT] Starting listeners...');
        const cleanup = initializeFirebaseListeners();
        return cleanup;
      } catch (error) {
        console.error('❌ [FIREBASE INIT] Error initializing Firebase:', error);
        console.error('❌ [FIREBASE INIT] Error details:', {
          message: (error as any)?.message,
          code: (error as any)?.code,
          userRole: user?.role
        });
        setFirebaseConnected(false);
        return undefined;
      }
    };
    
    let cleanup: (() => void) | undefined;
    initFirebase().then(c => { cleanup = c; });

    return () => {
      if (cleanup) cleanup();
    };
  }, [user, initializeFirebaseListeners, hasInitializedFirebaseSync, syncBranchesFromFirebase]);

  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes('combo') && name.includes('familiar')) return 'users';
    if (name.includes('combo') && name.includes('personal')) return 'user';
    if (name.includes('promo')) return 'percent';
    if (name.includes('complement') || name.includes('extra')) return 'plus-circle';
    if (name.includes('refresco') || name.includes('bebida')) return 'cup-soda';
    if (name.includes('natural') || name.includes('jugo')) return 'citrus';
    return 'package';
  };

  const loadSelectedBranch = async () => {
    try {
      const stored = await AsyncStorage.getItem(SELECTED_BRANCH_KEY);
      if (stored) {
        setSelectedBranchId(stored);
        console.log('📍 Loaded selected branch:', stored);
      }
    } catch (error) {
      console.log('Error loading selected branch:', error);
    }
  };

  const loadData = async () => {
    try {
      const [storedBranches, storedBranchesSync, storedComplaints, storedDeliveryUsers, storedCoupons, storedProducts, storedCategories, storedBankAccounts, storedOrders, storedPromotions, storedBusinessHours, storedMarketingPopup, storedThemeSettings, storedRatings, storedCancellations, storedDelays, storedNotifications, storedPointsSettings, storedUserPoints, storedLastSync] = await Promise.all([
        AsyncStorage.getItem(BRANCHES_KEY),
        AsyncStorage.getItem(BRANCHES_SYNC_KEY),
        AsyncStorage.getItem(COMPLAINTS_KEY),
        AsyncStorage.getItem(DELIVERY_USERS_KEY),
        AsyncStorage.getItem(COUPONS_KEY),
        AsyncStorage.getItem(PRODUCTS_KEY),
        AsyncStorage.getItem(CATEGORIES_KEY),
        AsyncStorage.getItem(BANK_ACCOUNTS_KEY),
        AsyncStorage.getItem(ORDERS_KEY),
        AsyncStorage.getItem(PROMOTIONS_KEY),
        AsyncStorage.getItem(BUSINESS_HOURS_KEY),
        AsyncStorage.getItem(MARKETING_POPUP_KEY),
        AsyncStorage.getItem(THEME_SETTINGS_KEY),
        AsyncStorage.getItem(DELIVERY_RATINGS_KEY),
        AsyncStorage.getItem(ORDER_CANCELLATIONS_KEY),
        AsyncStorage.getItem(ORDER_DELAYS_KEY),
        AsyncStorage.getItem(BRANCH_NOTIFICATIONS_KEY),
        AsyncStorage.getItem(POINTS_SETTINGS_KEY),
        AsyncStorage.getItem(USER_POINTS_KEY),
        AsyncStorage.getItem(WOOCOMMERCE_SYNC_KEY),
      ]);

      if (storedBranches) {
        setBranches(JSON.parse(storedBranches));
        console.log('📦 [CACHE] Loaded', JSON.parse(storedBranches).length, 'branches from local cache');
      }
      if (storedBranchesSync) {
        setLastBranchesSync(storedBranchesSync);
        const timeSinceSync = Date.now() - new Date(storedBranchesSync).getTime();
        const daysAgo = Math.floor(timeSinceSync / (24 * 60 * 60 * 1000));
        const hoursAgo = Math.floor((timeSinceSync % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        console.log(`📦 [CACHE] Branches last synced ${daysAgo} days, ${hoursAgo} hours ago`);
      }
      if (storedComplaints) setComplaints(JSON.parse(storedComplaints));
      if (storedDeliveryUsers) setDeliveryUsers(JSON.parse(storedDeliveryUsers));
      if (storedCoupons) setCoupons(JSON.parse(storedCoupons));
      if (storedProducts) {
        const parsedProducts = JSON.parse(storedProducts);
        console.log('📦 [PRODUCTS] Loaded', parsedProducts.length, 'products from cache');
        console.log('📦 [PRODUCTS] First product image:', parsedProducts[0]?.image);
        setProducts(parsedProducts);
      } else {
        console.log('⚠️ [PRODUCTS] No cached products, will sync with WooCommerce');
        setProducts([]);
      }
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories);
        console.log('📦 [CATEGORIES] Loaded', parsedCategories.length, 'categories from cache');
        setCategories(parsedCategories);
      } else {
        console.log('⚠️ [CATEGORIES] No cached categories, will sync with WooCommerce');
        setCategories([]);
      }
      if (storedLastSync) setLastSyncTime(storedLastSync);
      if (storedBankAccounts) setBankAccounts(JSON.parse(storedBankAccounts));
      if (storedOrders) setOrders(JSON.parse(storedOrders));
      if (storedPromotions) setPromotions(JSON.parse(storedPromotions));
      if (storedBusinessHours) setBusinessHours(JSON.parse(storedBusinessHours));
      if (storedMarketingPopup) setMarketingPopup(JSON.parse(storedMarketingPopup));
      if (storedThemeSettings) setThemeSettings(JSON.parse(storedThemeSettings));
      if (storedRatings) setDeliveryRatings(JSON.parse(storedRatings));
      if (storedCancellations) setOrderCancellations(JSON.parse(storedCancellations));
      if (storedDelays) setOrderDelays(JSON.parse(storedDelays));
      if (storedNotifications) setBranchNotifications(JSON.parse(storedNotifications));
      if (storedPointsSettings) {
        const parsedSettings = JSON.parse(storedPointsSettings);
        if (parsedSettings.conversionRate === 100) {
          console.log('⚠️ [POINTS FIX] Detected incorrect conversionRate of 100, correcting to 10');
          parsedSettings.conversionRate = 10;
          await AsyncStorage.setItem(POINTS_SETTINGS_KEY, JSON.stringify(parsedSettings));
        }
        console.log('📊 [POINTS SETTINGS] Loaded conversionRate:', parsedSettings.conversionRate, '(10 puntos = 1 LPS)');
        setPointsSettings(parsedSettings);
      }
      if (storedUserPoints) setUserPoints(JSON.parse(storedUserPoints));
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBranches = async (newBranches: Branch[]) => {
    try {
      await AsyncStorage.setItem(BRANCHES_KEY, JSON.stringify(newBranches));
      await AsyncStorage.setItem(BRANCHES_SYNC_KEY, new Date().toISOString());
      setBranches(newBranches);
      setLastBranchesSync(new Date().toISOString());
      console.log('💾 [CACHE] Branches saved to local cache');
    } catch (error) {
      console.log('Error saving branches:', error);
    }
  };

  const syncBranchToFirebase = async (branch: Branch) => {
    try {
      await firebaseService.branches.create(branch);
      console.log('✅ [FIREBASE] Branch synced:', branch.name);
    } catch (error) {
      console.error('❌ [FIREBASE] Error syncing branch:', error);
    }
  };

  const forceSyncBranches = async () => {
    console.log('🔄 [FORCE SYNC] Forcing branches sync from Firebase...');
    await AsyncStorage.removeItem(BRANCHES_SYNC_KEY);
    console.log('🗑️ [FORCE SYNC] Branch cache cleared');
    await syncBranchesFromFirebase(true);
  };

  const addBranch = async (branch: Omit<Branch, 'id' | 'deliveryZones'>) => {
    const newBranch: Branch = {
      ...branch,
      id: Date.now().toString(),
      deliveryZones: [],
    };
    const updated = [...branches, newBranch];
    await saveBranches(updated);
    await syncBranchToFirebase(newBranch);
    console.log('Branch added:', newBranch.name);
    return newBranch;
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    const updated = branches.map(b => b.id === id ? { ...b, ...updates } : b);
    await saveBranches(updated);
    await firebaseService.branches.update(id, updates);
    console.log('Branch updated:', id);
  };

  const deleteBranch = async (id: string) => {
    console.log('🗑️ [DELETE BRANCH] Deleting branch:', id);
    const updated = branches.filter(b => b.id !== id);
    await saveBranches(updated);
    await firebaseService.branches.delete(id);
    
    await AsyncStorage.removeItem(BRANCHES_SYNC_KEY);
    console.log('🗑️ [DELETE BRANCH] Branch cache cleared');
    
    console.log('✅ [DELETE BRANCH] Branch deleted:', id);
  };

  const addDeliveryZone = async (branchId: string, zone: Omit<DeliveryZone, 'id'>) => {
    const newZone: DeliveryZone = {
      ...zone,
      id: Date.now().toString(),
    };
    const updated = branches.map(b => {
      if (b.id === branchId) {
        return { ...b, deliveryZones: [...b.deliveryZones, newZone] };
      }
      return b;
    });
    await saveBranches(updated);
    
    const updatedBranch = updated.find(b => b.id === branchId);
    if (updatedBranch) {
      const cleanedZones = updatedBranch.deliveryZones.map(z => {
        const cleaned: any = {
          id: z.id,
          name: z.name,
          price: z.price,
          sucursalId: z.sucursalId,
        };
        if (z.municipioId !== undefined) {
          cleaned.municipioId = z.municipioId;
        }
        return cleaned;
      });
      await firebaseService.branches.update(branchId, { deliveryZones: cleanedZones });
      console.log('✅ Delivery zone synced to Firebase:', newZone.name);
    }
    
    console.log('Delivery zone added:', newZone.name);
    return newZone;
  };

  const updateDeliveryZone = async (branchId: string, zoneId: string, updates: Partial<DeliveryZone>) => {
    const updated = branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          deliveryZones: b.deliveryZones.map(z => z.id === zoneId ? { ...z, ...updates } : z),
        };
      }
      return b;
    });
    await saveBranches(updated);
    
    const updatedBranch = updated.find(b => b.id === branchId);
    if (updatedBranch) {
      const cleanedZones = updatedBranch.deliveryZones.map(z => {
        const cleaned: any = {
          id: z.id,
          name: z.name,
          price: z.price,
          sucursalId: z.sucursalId,
        };
        if (z.municipioId !== undefined) {
          cleaned.municipioId = z.municipioId;
        }
        return cleaned;
      });
      await firebaseService.branches.update(branchId, { deliveryZones: cleanedZones });
      console.log('✅ Delivery zone synced to Firebase:', zoneId);
    }
    
    console.log('Delivery zone updated:', zoneId);
  };

  const deleteDeliveryZone = async (branchId: string, zoneId: string) => {
    const updated = branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          deliveryZones: b.deliveryZones.filter(z => z.id !== zoneId),
        };
      }
      return b;
    });
    await saveBranches(updated);
    
    const updatedBranch = updated.find(b => b.id === branchId);
    if (updatedBranch) {
      const cleanedZones = updatedBranch.deliveryZones.map(z => {
        const cleaned: any = {
          id: z.id,
          name: z.name,
          price: z.price,
          sucursalId: z.sucursalId,
        };
        if (z.municipioId !== undefined) {
          cleaned.municipioId = z.municipioId;
        }
        return cleaned;
      });
      await firebaseService.branches.update(branchId, { deliveryZones: cleanedZones });
      console.log('✅ Delivery zone deletion synced to Firebase:', zoneId);
    }
    
    console.log('Delivery zone deleted:', zoneId);
  };

  const saveComplaints = async (newComplaints: Complaint[]) => {
    try {
      await AsyncStorage.setItem(COMPLAINTS_KEY, JSON.stringify(newComplaints));
      setComplaints(newComplaints);
    } catch (error) {
      console.log('Error saving complaints:', error);
    }
  };

  const addComplaint = async (complaint: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const newComplaint: Complaint = {
      ...complaint,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...complaints, newComplaint];
    await saveComplaints(updated);
    console.log('Complaint added:', newComplaint.id);
    return newComplaint;
  };

  const updateComplaintStatus = async (id: string, status: Complaint['status'], response?: string) => {
    const updated = complaints.map(c => {
      if (c.id === id) {
        return { ...c, status, response, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    await saveComplaints(updated);
    console.log('Complaint status updated:', id);
  };

  const saveDeliveryUsers = async (newUsers: DeliveryUser[]) => {
    try {
      await AsyncStorage.setItem(DELIVERY_USERS_KEY, JSON.stringify(newUsers));
      setDeliveryUsers(newUsers);
    } catch (error) {
      console.log('Error saving delivery users:', error);
    }
  };

  const syncDeliveryRequestToFirebase = async (request: DeliveryUser) => {
    try {
      console.log('🔄 [FIREBASE] Starting sync for delivery request:', request.name, 'ID:', request.id);
      console.log('📋 [FIREBASE] Request data:', JSON.stringify(request, null, 2));
      await firebaseService.deliveryRequests.create(request);
      console.log('✅ [FIREBASE] Delivery request synced successfully:', request.name);
    } catch (error: any) {
      console.error('❌ [FIREBASE] Error syncing delivery request:', error);
      console.error('❌ [FIREBASE] Error code:', error?.code);
      console.error('❌ [FIREBASE] Error message:', error?.message);
      throw new Error(`Error al guardar en Firebase: ${error?.message || 'Error desconocido'}. Verifica los permisos de Firebase.`);
    }
  };

  const registerDelivery = async (user: Omit<DeliveryUser, 'id' | 'status' | 'createdAt' | 'deliveryCode'>) => {
    const existingInBranch = deliveryUsers.find(u => u.dni === user.dni && u.branchId === user.branchId && u.status !== 'rejected');
    if (existingInBranch) {
      throw new Error('Ya existe un repartidor con este DNI en esta sucursal');
    }
    
    const existingUser = deliveryUsers.find(u => u.dni === user.dni);
    let deliveryCode: string;
    
    if (existingUser) {
      deliveryCode = existingUser.deliveryCode;
      console.log('✅ Reutilizando código de delivery:', deliveryCode, 'para DNI:', user.dni);
    } else {
      const usedCodes = deliveryUsers.map(u => parseInt(u.deliveryCode)).filter(c => !isNaN(c));
      let nextCode = 1;
      while (nextCode <= 500 && usedCodes.includes(nextCode)) {
        nextCode++;
      }
      
      if (nextCode > 500) {
        throw new Error('No hay códigos disponibles (máximo 500 repartidores)');
      }
      
      deliveryCode = String(nextCode).padStart(2, '0');
      console.log('✅ Nuevo código de delivery:', deliveryCode, 'para DNI:', user.dni);
    }
    
    const newUser: DeliveryUser = {
      ...user,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deliveryCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    // Guardar en Firebase como solicitud (deliveryRequests - permite escritura pública)
    console.log('🔄 [REGISTER DELIVERY] Attempting to save to Firebase deliveryRequests...');
    console.log('🔄 [REGISTER DELIVERY] Request data:', JSON.stringify(newUser, null, 2));
    
    try {
      await syncDeliveryRequestToFirebase(newUser);
      console.log('✅ [REGISTER DELIVERY] Delivery request saved to Firebase:', newUser.name);
    } catch (firebaseError: any) {
      console.error('❌ [REGISTER DELIVERY] Firebase error:', firebaseError);
      console.error('❌ [REGISTER DELIVERY] Error code:', firebaseError?.code);
      console.error('❌ [REGISTER DELIVERY] Error message:', firebaseError?.message);
      
      // Re-lanzar el error para que el usuario sepa que falló
      throw new Error(
        firebaseError?.message || 
        'No se pudo guardar en Firebase. Verifica tu conexión a internet e intenta de nuevo.'
      );
    }
    
    // Solo guardar localmente si Firebase tuvo éxito
    const updated = [...deliveryUsers, newUser];
    await saveDeliveryUsers(updated);
    
    console.log('✅ [REGISTER DELIVERY] Registration complete:', newUser.name, 'Code:', deliveryCode, 'Branch:', user.branchId);
    return newUser;
  };

  const updateDeliveryStatus = async (id: string, status: DeliveryUser['status']) => {
    const targetUser = deliveryUsers.find(u => u.id === id);
    if (!targetUser) {
      console.error('❌ Delivery user not found:', id);
      return;
    }
    
    const dni = targetUser.dni;
    console.log('🔄 [UPDATE DELIVERY STATUS] Starting update for DNI:', dni, 'to status:', status);
    console.log('👤 [UPDATE DELIVERY STATUS] Current user role:', user?.role);
    
    if (status === 'approved') {
      if (user?.role === 'admin') {
        console.log('✅ [APPROVE ALL] Admin detected - updating ALL delivery requests with same DNI across ALL branches');
        try {
          const approvedCount = await firebaseService.deliveryRequests.approveAllByDni(dni);
          console.log('✅ [APPROVE ALL] Firebase approved', approvedCount, 'requests with DNI:', dni);
          console.log('🔔 [APPROVE ALL] Firebase listeners will update local state automatically');
        } catch (firebaseError) {
          console.error('❌ [APPROVE ALL] Error approving in Firebase:', firebaseError);
          throw firebaseError;
        }
      } else {
        console.log('✅ [APPROVE SINGLE] Branch user detected - approving only this request:', id);
        try {
          await firebaseService.deliveryRequests.update(id, { status: 'approved' });
          console.log('✅ [APPROVE SINGLE] Request approved in Firebase:', id);
          console.log('🔔 [APPROVE SINGLE] Firebase listener will update local state automatically');
          
          console.log('🔄 [APPROVE SINGLE] Now checking for other requests with same DNI to auto-approve...');
          const allRequestsWithDni = await firebaseService.deliveryRequests.getByDni(dni);
          const otherPendingRequests = allRequestsWithDni.filter(r => r.id !== id && r.status === 'pending');
          
          if (otherPendingRequests.length > 0) {
            console.log('📋 [APPROVE SINGLE] Found', otherPendingRequests.length, 'other pending requests with same DNI');
            for (const request of otherPendingRequests) {
              try {
                await firebaseService.deliveryRequests.update(request.id, { status: 'approved' });
                console.log('✅ [APPROVE SINGLE] Auto-approved request:', request.id, 'for branch:', request.branchId);
              } catch {
                console.log('⚠️ [APPROVE SINGLE] Could not auto-approve request:', request.id, '- may need admin approval');
              }
            }
          } else {
            console.log('ℹ️ [APPROVE SINGLE] No other pending requests found with same DNI');
          }
        } catch (firebaseError: any) {
          console.error('❌ [APPROVE SINGLE] Error approving in Firebase:', firebaseError);
          if (firebaseError.code === 'permission-denied') {
            throw new Error('No tienes permisos para aprobar este repartidor. Verifica que pertenece a tu sucursal.');
          }
          throw firebaseError;
        }
      }
    } else if (status === 'rejected') {
      console.log('❌ [REJECT] Starting rejection for DNI:', dni);
      
      if (user?.role === 'admin') {
        console.log('❌ [REJECT ALL] Admin detected - rejecting ALL delivery requests with same DNI across ALL branches');
        try {
          const rejectedCount = await firebaseService.deliveryRequests.rejectAllByDni(dni);
          console.log('❌ [REJECT ALL] Firebase rejected', rejectedCount, 'requests with DNI:', dni);
          console.log('🔔 [REJECT ALL] Firebase listeners will update local state automatically');
        } catch (firebaseError) {
          console.error('❌ [REJECT ALL] Error rejecting in Firebase:', firebaseError);
          throw firebaseError;
        }
      } else {
        console.log('❌ [REJECT SINGLE] Branch user detected - rejecting this request and syncing others with same DNI');
        try {
          await firebaseService.deliveryRequests.update(id, { status: 'rejected' });
          console.log('❌ [REJECT SINGLE] Request rejected in Firebase:', id);
          
          console.log('🔄 [REJECT SINGLE] Now checking for other requests with same DNI to auto-reject...');
          const allRequestsWithDni = await firebaseService.deliveryRequests.getByDni(dni);
          const otherPendingRequests = allRequestsWithDni.filter(r => r.id !== id && r.status === 'pending');
          
          if (otherPendingRequests.length > 0) {
            console.log('📋 [REJECT SINGLE] Found', otherPendingRequests.length, 'other pending requests with same DNI');
            for (const request of otherPendingRequests) {
              try {
                await firebaseService.deliveryRequests.update(request.id, { status: 'rejected' });
                console.log('❌ [REJECT SINGLE] Auto-rejected request:', request.id, 'for branch:', request.branchId);
              } catch {
                console.log('⚠️ [REJECT SINGLE] Could not auto-reject request:', request.id, '- may need admin action');
              }
            }
          } else {
            console.log('ℹ️ [REJECT SINGLE] No other pending requests found with same DNI');
          }
          console.log('🔔 [REJECT SINGLE] Firebase listener will update local state automatically');
        } catch (firebaseError: any) {
          console.error('❌ [REJECT SINGLE] Error rejecting in Firebase:', firebaseError);
          if (firebaseError.code === 'permission-denied') {
            throw new Error('No tienes permisos para rechazar este repartidor. Verifica que pertenece a tu sucursal.');
          }
          throw firebaseError;
        }
      }
    } else {
      console.log('🔄 [UPDATE STATUS] Single user update to status:', status);
      try {
        await firebaseService.deliveryRequests.update(id, { status });
        console.log('✅ [UPDATE STATUS] Updated in deliveryRequests:', id);
        console.log('🔔 [UPDATE STATUS] Firebase listener will update local state automatically');
      } catch {
        console.log('⚠️ [UPDATE STATUS] Not found in deliveryRequests, trying deliveryUsers');
        await firebaseService.deliveryUsers.update(id, { status });
        const updated = deliveryUsers.map(u => u.id === id ? { ...u, status: status as DeliveryUser['status'] } : u);
        await saveDeliveryUsers(updated);
      }
      console.log('✅ [UPDATE STATUS] Delivery user status updated:', id);
    }
  };

  const updateDeliveryUserStatus = async (userId: string, isActive: boolean) => {
    try {
      console.log('🔄 Updating delivery user active status:', userId, isActive);
      
      const updated = deliveryUsers.map(u => u.id === userId ? { ...u, isActive } : u);
      await saveDeliveryUsers(updated);
      
      await firebaseService.deliveryUsers.update(userId, { isActive });
      console.log('✅ Delivery user active status updated in Firebase');
    } catch (error) {
      console.error('❌ Error updating delivery user status:', error);
      throw error;
    }
  };

  const deleteDeliveryUser = async (id: string) => {
    const updated = deliveryUsers.filter(u => u.id !== id);
    await saveDeliveryUsers(updated);
    // Intentar eliminar de deliveryRequests primero
    try {
      await firebaseService.deliveryRequests.delete(id);
      console.log('✅ Deleted from deliveryRequests:', id);
    } catch {
      console.log('⚠️ Not found in deliveryRequests, trying deliveryUsers');
      await firebaseService.deliveryUsers.delete(id);
    }
    console.log('Delivery user deleted:', id);
  };

  const saveCoupons = async (newCoupons: Coupon[]) => {
    try {
      await AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(newCoupons));
      setCoupons(newCoupons);
    } catch (error) {
      console.log('Error saving coupons:', error);
    }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usedCount'>) => {
    const newCoupon: Coupon = {
      ...coupon,
      id: Date.now().toString(),
      usedCount: 0,
    };
    const updated = [...coupons, newCoupon];
    await saveCoupons(updated);
    console.log('Coupon added:', newCoupon.code);
    return newCoupon;
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    const updated = coupons.map(c => c.id === id ? { ...c, ...updates } : c);
    await saveCoupons(updated);
    console.log('Coupon updated:', id);
  };

  const deleteCoupon = async (id: string) => {
    const updated = coupons.filter(c => c.id !== id);
    await saveCoupons(updated);
    console.log('Coupon deleted:', id);
  };

  const saveProducts = async (newProducts: Product[]) => {
    try {
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(newProducts));
      setProducts(newProducts);
    } catch (error) {
      console.log('Error saving products:', error);
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    const updated = [...products, newProduct];
    await saveProducts(updated);
    console.log('Product added:', newProduct.name);
    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
    await saveProducts(updated);
    console.log('Product updated:', id);
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    await saveProducts(updated);
    console.log('Product deleted:', id);
  };

  const reorderProduct = async (id: string, direction: 'up' | 'down') => {
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= products.length) return;
    const updated = [...products];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    await saveProducts(updated);
    console.log('Product reordered:', id, direction);
  };

  const saveBankAccounts = async (newAccounts: BankAccount[]) => {
    try {
      await AsyncStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(newAccounts));
      setBankAccounts(newAccounts);
    } catch (error) {
      console.log('Error saving bank accounts:', error);
    }
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
    const newAccount: BankAccount = {
      ...account,
      id: Date.now().toString(),
    };
    const updated = [...bankAccounts, newAccount];
    await saveBankAccounts(updated);
    await firebaseService.bankAccounts.create(newAccount);
    console.log('Bank account added:', newAccount.bankName);
    return newAccount;
  };

  const updateBankAccount = async (id: string, updates: Partial<BankAccount>) => {
    const updated = bankAccounts.map(a => a.id === id ? { ...a, ...updates } : a);
    await saveBankAccounts(updated);
    await firebaseService.bankAccounts.update(id, updates);
    console.log('Bank account updated:', id);
  };

  const deleteBankAccount = async (id: string) => {
    const updated = bankAccounts.filter(a => a.id !== id);
    await saveBankAccounts(updated);
    await firebaseService.bankAccounts.delete(id);
    console.log('Bank account deleted:', id);
  };

  const getActiveBankAccounts = () => {
    return bankAccounts.filter(a => a.isActive);
  };

  const saveOrders = async (newOrders: Order[]) => {
    try {
      console.log('💾 [SAVE ORDERS] Saving', newOrders.length, 'orders to AsyncStorage');
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
      setOrders(newOrders);
      console.log('✅ [SAVE ORDERS] Orders saved and state updated');
      
      const verification = await AsyncStorage.getItem(ORDERS_KEY);
      if (verification) {
        const parsed = JSON.parse(verification);
        console.log('🔍 [SAVE ORDERS] Verification: AsyncStorage now has', parsed.length, 'orders');
      }
    } catch (error) {
      console.log('❌ [SAVE ORDERS] Error saving orders:', error);
    }
  };

  const cleanOrderForFirebase = (order: Order): Order => {
    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      }
      
      if (typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined && key !== 'municipioId') {
            cleaned[key] = cleanObject(value);
          }
        });
        return cleaned;
      }
      
      return obj;
    };
    
    return cleanObject(order) as Order;
  };

  const syncOrderToFirebase = async (order: Order) => {
    try {
      console.log('🧹 [FIREBASE] Cleaning order before Firebase sync...');
      const cleanedOrder = cleanOrderForFirebase(order);
      
      console.log('📤 [FIREBASE] Cleaned order summary:', {
        orderNumber: cleanedOrder.orderNumber,
        customerId: cleanedOrder.customerId,
        branchId: cleanedOrder.branchId,
        itemsCount: cleanedOrder.items?.length || 0,
        total: cleanedOrder.total
      });
      
      await firebaseService.orders.create(cleanedOrder);
      console.log('✅ [FIREBASE] Order synced to Firebase:', order.orderNumber);
    } catch (error) {
      console.error('❌ [FIREBASE] Error syncing order to Firebase:', error);
      console.error('❌ [FIREBASE] Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        branchId: order.branchId
      });
      throw error;
    }
  };

  const addOrder = async (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    const orderNumber = `FRY-${String(orders.length + 1).padStart(6, '0')}`;
    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),
      orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('📦 [DATA PROVIDER] Creating new order:', {
      orderNumber: newOrder.orderNumber,
      id: newOrder.id,
      branchId: newOrder.branchId,
      customerId: newOrder.customerId,
      status: newOrder.status,
      total: newOrder.total,
      deliveryType: newOrder.deliveryType,
      userRole: user?.role
    });
    
    const updated = [...orders, newOrder];
    console.log('💾 [DATA PROVIDER] Saving orders. Previous count:', orders.length, 'New count:', updated.length);
    
    await saveOrders(updated);
    
    console.log('🔄 [DATA PROVIDER] Syncing order to Firebase for user role:', user?.role);
    await syncOrderToFirebase(newOrder);
    
    console.log('✅ [DATA PROVIDER] Order saved:', newOrder.orderNumber);
    console.log('📋 [DATA PROVIDER] All orders after save:', updated.map(o => ({
      orderNumber: o.orderNumber,
      branchId: o.branchId,
      status: o.status
    })));
    
    return newOrder;
  };

  const updateOrderStatus = async (id: string, status: Order['status'], deliveryId?: string, assignedByBranch?: boolean) => {
    try {
      console.log('📝 [UPDATE ORDER] Starting update for order:', id, 'to status:', status);
      console.log('📝 [UPDATE ORDER] Current user:', user?.email, 'Role:', user?.role, 'BranchId:', user?.branchId);
      
      const updates: Partial<Order> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (deliveryId !== undefined) updates.deliveryId = deliveryId;
      if (assignedByBranch !== undefined) {
        updates.assignedByBranch = assignedByBranch;
        if (assignedByBranch) updates.requestApproved = true;
      }

      const updated = orders.map(o => {
        if (o.id === id) {
          return { ...o, ...updates };
        }
        return o;
      });
      
      console.log('📝 [UPDATE ORDER] Saving to AsyncStorage...');
      await saveOrders(updated);
      
      console.log('📝 [UPDATE ORDER] Updating Firebase...');
      await firebaseService.orders.update(id, updates);
      
      console.log('✅ [UPDATE ORDER] Order status updated successfully:', id, status);
      
      if (status === 'delivered') {
        const order = updated.find(o => o.id === id);
        if (order) {
          console.log('🎉 Order delivered! Earning points for customer...');
          await earnPointsFromOrder(order);
        }
      }
    } catch (error: any) {
      console.error('❌ [UPDATE ORDER] Error:', error);
      throw new Error(error.message || 'No se pudo actualizar el estado');
    }
  };

  const deleteOrder = async (id: string) => {
    const updated = orders.filter(o => o.id !== id);
    await saveOrders(updated);
    await firebaseService.orders.delete(id);
    console.log('Order deleted:', id);
  };

  const authorizeTransfer = async (orderId: string, adminId: string) => {
    const updates: Partial<Order> = {
      transferAuthorized: true,
      transferAuthorizedBy: adminId,
      transferAuthorizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, ...updates };
      }
      return o;
    });
    await saveOrders(updated);
    await firebaseService.orders.update(orderId, updates);
    console.log('Transfer authorized for order:', orderId);
  };

  const approveOrder = async (orderId: string, adminId: string) => {
    const updates: Partial<Order> = {
      adminApproved: true,
      adminApprovedBy: adminId,
      adminApprovedAt: new Date().toISOString(),
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    };

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, ...updates };
      }
      return o;
    });
    await saveOrders(updated);
    await firebaseService.orders.update(orderId, updates);
    console.log('Order approved by admin:', orderId);
  };

  const getOrdersByBranch = (branchId: string) => {
    return orders.filter(o => o.branchId === branchId);
  };

  const getOrdersByDelivery = (deliveryId: string) => {
    return orders.filter(o => o.deliveryId === deliveryId);
  };

  const savePromotions = async (newPromotions: Promotion[]) => {
    try {
      await AsyncStorage.setItem(PROMOTIONS_KEY, JSON.stringify(newPromotions));
      setPromotions(newPromotions);
    } catch (error) {
      console.log('Error saving promotions:', error);
    }
  };

  const addPromotion = async (promotion: Omit<Promotion, 'id'>) => {
    const newPromotion: Promotion = {
      ...promotion,
      id: Date.now().toString(),
    };
    const updated = [...promotions, newPromotion];
    await savePromotions(updated);
    console.log('Promotion added:', newPromotion.title);
    return newPromotion;
  };

  const updatePromotion = async (id: string, updates: Partial<Promotion>) => {
    const updated = promotions.map(p => p.id === id ? { ...p, ...updates } : p);
    await savePromotions(updated);
    console.log('Promotion updated:', id);
  };

  const deletePromotion = async (id: string) => {
    const updated = promotions.filter(p => p.id !== id);
    await savePromotions(updated);
    console.log('Promotion deleted:', id);
  };

  const saveBusinessHours = async (newHours: BusinessHours[]) => {
    try {
      await AsyncStorage.setItem(BUSINESS_HOURS_KEY, JSON.stringify(newHours));
      setBusinessHours(newHours);
      console.log('Business hours saved');
    } catch (error) {
      console.log('Error saving business hours:', error);
    }
  };

  const updateBusinessHours = async (dayOfWeek: number, updates: Partial<BusinessHours>) => {
    const updated = businessHours.map(h => 
      h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h
    );
    await saveBusinessHours(updated);
  };

  const updateAllBusinessHours = async (newHours: BusinessHours[]) => {
    try {
      console.log('🕐 [BUSINESS HOURS] Starting update process...');
      console.log('🕐 [BUSINESS HOURS] New hours:', JSON.stringify(newHours, null, 2));
      console.log('🕐 [BUSINESS HOURS] Current Firebase Auth user:', auth.currentUser?.uid);
      console.log('🕐 [BUSINESS HOURS] Current app user role:', user?.role);
      
      if (!auth.currentUser) {
        throw new Error('No hay usuario autenticado en Firebase. Por favor, cierra sesión e inicia sesión nuevamente.');
      }
      
      if (!user || (user.role !== 'admin' && user.role !== 'branch')) {
        throw new Error('No tienes permisos para actualizar los horarios de negocio.');
      }
      
      if (user.role === 'branch') {
        if (!user.branchId) {
          throw new Error('No se encontró la sucursal asociada a tu cuenta.');
        }
        console.log('🏪 [BRANCH MODE] Branch user updating only their branch:', user.branchId);
        await updateBranchBusinessHours(user.branchId, newHours);
        console.log('✅ [BRANCH MODE] Branch hours updated successfully');
        return;
      }
      
      await saveBusinessHours(newHours);
      console.log('✅ [BUSINESS HOURS] Saved to AsyncStorage');
      
      console.log('🕐 [BUSINESS HOURS] Updating global hours and applying to', branches.length, 'branches');
      const updatedBranches = branches.map(branch => ({
        ...branch,
        businessHours: newHours
      }));
      
      await saveBranches(updatedBranches);
      console.log('✅ [BUSINESS HOURS] Updated branches in AsyncStorage');
      
      console.log('📤 [FIREBASE] Syncing to Firebase...');
      for (const branch of updatedBranches) {
        try {
          console.log('📤 [FIREBASE] Updating branch:', branch.id, branch.name);
          const updateData: any = { businessHours: newHours };
          await firebaseService.branches.update(branch.id, updateData);
          console.log('✅ [FIREBASE] Branch updated successfully:', branch.name);
        } catch (error) {
          console.error('❌ [FIREBASE] Error updating branch:', branch.name, error);
          console.error('❌ [FIREBASE] Error details:', {
            code: (error as any)?.code,
            message: (error as any)?.message,
            branchId: branch.id,
            authUser: auth.currentUser?.uid,
            appUserRole: user?.role
          });
          throw error;
        }
      }
      
      console.log('✅ [BUSINESS HOURS] All business hours updated for all branches in Firebase');
    } catch (error) {
      console.error('❌ [BUSINESS HOURS] Error updating business hours:', error);
      console.error('❌ [BUSINESS HOURS] Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message
      });
      throw error;
    }
  };

  const updateBranchBusinessHours = async (branchId: string, newHours: BusinessHours[]) => {
    try {
      console.log('🕐 [BRANCH HOURS] Updating hours for branch:', branchId);
      console.log('🕐 [BRANCH HOURS] New hours:', JSON.stringify(newHours, null, 2));
      
      const updated = branches.map(b => 
        b.id === branchId ? { ...b, businessHours: newHours } : b
      );
      await saveBranches(updated);
      console.log('✅ [BRANCH HOURS] Saved to AsyncStorage');
      
      console.log('📤 [FIREBASE] Syncing branch hours to Firebase...');
      await firebaseService.branches.update(branchId, { businessHours: newHours });
      console.log('✅ [FIREBASE] Branch hours updated in Firebase:', branchId);
    } catch (error) {
      console.error('❌ [BRANCH HOURS] Error updating branch hours:', error);
      console.error('❌ [BRANCH HOURS] Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        branchId
      });
      throw error;
    }
  };

  const selectBranch = async (branchId: string) => {
    try {
      await AsyncStorage.setItem(SELECTED_BRANCH_KEY, branchId);
      setSelectedBranchId(branchId);
      console.log('📍 Branch selected:', branchId);
    } catch (error) {
      console.log('Error selecting branch:', error);
    }
  };

  const getSelectedBranch = () => {
    if (!selectedBranchId) return null;
    return branches.find(b => b.id === selectedBranchId) || null;
  };

  const isBranchOpen = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
      console.log('❌ [STORE HOURS] Branch not found:', branchId);
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const branchHours = branch.businessHours || businessHours;
    const todayHours = branchHours.find(h => h.dayOfWeek === currentDay);
    
    console.log('🕐 [STORE HOURS CHECK] =================');
    console.log('🕐 Branch ID:', branchId);
    console.log('🕐 Branch Name:', branch.name);
    console.log('🕐 Has Custom Hours:', !!branch.businessHours);
    console.log('🕐 Current Day:', currentDay, '(0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab)');
    console.log('🕐 Current Time:', currentTime);
    console.log('🕐 Today Hours:', todayHours);
    console.log('🕐 Is Open Today:', todayHours?.isOpen);
    console.log('🕐 Open Time:', todayHours?.openTime);
    console.log('🕐 Close Time:', todayHours?.closeTime);
    console.log('🕐 All Branch Hours:', branchHours);
    
    if (!todayHours || !todayHours.isOpen) {
      console.log('❌ [STORE HOURS] Store is CLOSED today (day not configured as open)');
      console.log('🕐 [STORE HOURS] =================');
      return false;
    }
    
    const isOpen = currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
    console.log('🕐 Comparison: currentTime >= openTime:', currentTime >= todayHours.openTime);
    console.log('🕐 Comparison: currentTime < closeTime:', currentTime < todayHours.closeTime);
    console.log('🕐 Result: Is OPEN:', isOpen);
    console.log('🕐 [STORE HOURS] =================');
    return isOpen;
  };

  const isStoreOpen = () => {
    if (!selectedBranchId) {
      console.log('⚠️ [STORE HOURS] No branch selected');
      return false;
    }
    console.log('📍 [STORE HOURS] Checking store open status for selected branch:', selectedBranchId);
    return isBranchOpen(selectedBranchId);
  };

  const isAnyBranchOpen = () => {
    const openBranches = branches.filter(branch => isBranchOpen(branch.id));
    console.log('🏪 [STORE HOURS] Open branches:', openBranches.length, 'out of', branches.length);
    return openBranches.length > 0;
  };

  const getOpenBranches = () => {
    return branches.filter(branch => isBranchOpen(branch.id));
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const getNextOpenTimeForBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return 'Próximamente';

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const branchHours = branch.businessHours || businessHours;
    const todayHours = branchHours.find(h => h.dayOfWeek === currentDay);
    
    if (todayHours?.isOpen && currentTime < todayHours.openTime) {
      return `Hoy a las ${formatTime12Hour(todayHours.openTime)}`;
    }
    
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextHours = branchHours.find(h => h.dayOfWeek === nextDay);
      if (nextHours?.isOpen) {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return `${dayNames[nextDay]} a las ${formatTime12Hour(nextHours.openTime)}`;
      }
    }
    return 'Próximamente';
  };

  const getNextOpenTime = () => {
    if (!selectedBranchId) return 'Próximamente';
    return getNextOpenTimeForBranch(selectedBranchId);
  };

  const saveMarketingPopup = async (popup: MarketingPopup | null) => {
    try {
      if (popup) {
        await AsyncStorage.setItem(MARKETING_POPUP_KEY, JSON.stringify(popup));
      } else {
        await AsyncStorage.removeItem(MARKETING_POPUP_KEY);
      }
      setMarketingPopup(popup);
      console.log('Marketing popup saved');
    } catch (error) {
      console.log('Error saving marketing popup:', error);
    }
  };

  const saveThemeSettings = async (settings: ThemeSettings) => {
    try {
      await AsyncStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
      setThemeSettings(settings);
      console.log('Theme settings saved');
    } catch (error) {
      console.log('Error saving theme settings:', error);
    }
  };

  const getWhatsAppUrl = (product: Product) => {
    const cleanDescription = product.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
    const message = `*Solicitud de Pedido - Fry Chicken*\n\n*Producto:* ${product.name}\n*Descripción:* ${cleanDescription}\n*Valor:* L ${product.price.toFixed(2)}\n\n*Catálogo visual:* ${product.image}\n\nDeseo realizar un pedido de este producto. Por favor, indíquenme los pasos a seguir.`;
    return `https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const exportBackup = async () => {
    const backupData = {
      branches,
      products,
      categories,
      orders,
      coupons,
      promotions,
      businessHours,
      themeSettings,
      bankAccounts,
      deliveryUsers,
      complaints,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backupData);
  };

  const importBackup = async (backupJson: string) => {
    try {
      const data = JSON.parse(backupJson);
      if (data.branches) await saveBranches(data.branches);
      if (data.products) await saveProducts(data.products);
      if (data.orders) await saveOrders(data.orders);
      if (data.coupons) await saveCoupons(data.coupons);
      if (data.promotions) await savePromotions(data.promotions);
      if (data.businessHours) await saveBusinessHours(data.businessHours);
      if (data.themeSettings) await saveThemeSettings(data.themeSettings);
      if (data.bankAccounts) await saveBankAccounts(data.bankAccounts);
      if (data.deliveryUsers) await saveDeliveryUsers(data.deliveryUsers);
      if (data.complaints) await saveComplaints(data.complaints);
      console.log('Backup imported successfully');
      return true;
    } catch (error) {
      console.log('Error importing backup:', error);
      return false;
    }
  };

  const getStats = (): AppStats => {
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(o => ['pending', 'preparing', 'dispatched'].includes(o.status)).length;
    const uniqueCustomers = new Set(orders.map(o => o.customerId)).size;

    const salesByBranch = branches.map(branch => {
      const branchTotal = completedOrders
        .filter(o => o.branchId === branch.id)
        .reduce((sum, o) => sum + o.total, 0);
      return { branchName: branch.name, total: branchTotal };
    });

    const productCounts: { [key: string]: number } = {};
    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    return {
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      completedOrders: completedOrders.length,
      totalCustomers: uniqueCustomers,
      totalDeliveries: completedOrders.filter(o => o.deliveryType === 'delivery').length,
      topProducts,
      salesByBranch,
    };
  };

  const getDeliveryUsersByBranch = (branchId: string) => {
    return deliveryUsers.filter(u => u.branchId === branchId);
  };

  const getComplaintsByBranch = (branchId: string) => {
    return complaints.filter(c => c.branchId === branchId);
  };

  const saveDeliveryRatings = async (newRatings: DeliveryRating[]) => {
    try {
      await AsyncStorage.setItem(DELIVERY_RATINGS_KEY, JSON.stringify(newRatings));
      setDeliveryRatings(newRatings);
    } catch (error) {
      console.log('Error saving delivery ratings:', error);
    }
  };

  const addDeliveryRating = async (rating: Omit<DeliveryRating, 'id' | 'createdAt'>) => {
    const newRating: DeliveryRating = {
      ...rating,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...deliveryRatings, newRating];
    await saveDeliveryRatings(updated);
    console.log('Delivery rating added:', newRating.id);
    return newRating;
  };

  const getDeliveryRatings = (deliveryId: string) => {
    return deliveryRatings.filter(r => r.deliveryId === deliveryId);
  };

  const getAverageDeliveryRating = (deliveryId: string) => {
    const ratings = deliveryRatings.filter(r => r.deliveryId === deliveryId);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  };

  const saveOrderCancellations = async (newCancellations: OrderCancellation[]) => {
    try {
      await AsyncStorage.setItem(ORDER_CANCELLATIONS_KEY, JSON.stringify(newCancellations));
      setOrderCancellations(newCancellations);
    } catch (error) {
      console.log('Error saving order cancellations:', error);
    }
  };

  const addOrderCancellation = async (cancellation: Omit<OrderCancellation, 'id' | 'timestamp'>) => {
    const now = new Date();
    const orderTime = new Date(orders.find(o => o.id === cancellation.orderId)?.createdAt || now);
    const diffMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
    
    if (diffMinutes > 5) {
      throw new Error('Solo puedes cancelar dentro de los primeros 5 minutos');
    }

    const newCancellation: OrderCancellation = {
      ...cancellation,
      id: Date.now().toString(),
      timestamp: now.toISOString(),
    };
    const updated = [...orderCancellations, newCancellation];
    await saveOrderCancellations(updated);
    
    await updateOrderStatus(cancellation.orderId, 'rejected');
    
    const order = orders.find(o => o.id === cancellation.orderId);
    if (order?.branchId) {
      await addBranchNotification({
        branchId: order.branchId,
        type: 'order_cancelled',
        orderId: cancellation.orderId,
        title: 'Pedido Cancelado',
        message: `El cliente canceló el pedido ${order.orderNumber}. Motivo: ${cancellation.reason}`,
      });
    }
    
    console.log('Order cancellation added:', newCancellation.id);
    return newCancellation;
  };

  const saveOrderDelays = async (newDelays: OrderDelay[]) => {
    try {
      await AsyncStorage.setItem(ORDER_DELAYS_KEY, JSON.stringify(newDelays));
      setOrderDelays(newDelays);
    } catch (error) {
      console.log('Error saving order delays:', error);
    }
  };

  const addOrderDelay = async (delay: Omit<OrderDelay, 'id' | 'timestamp'>) => {
    const newDelay: OrderDelay = {
      ...delay,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...orderDelays, newDelay];
    await saveOrderDelays(updated);
    
    const order = orders.find(o => o.id === delay.orderId);
    if (order?.branchId) {
      await addBranchNotification({
        branchId: order.branchId,
        type: 'order_delayed',
        orderId: delay.orderId,
        title: 'Retraso en Entrega',
        message: `El repartidor reporta un retraso de ${delay.delayMinutes} minutos en el pedido ${order.orderNumber}`,
      });
    }
    
    console.log('Order delay added:', newDelay.id);
    return newDelay;
  };

  const saveBranchNotifications = async (newNotifications: BranchNotification[]) => {
    try {
      await AsyncStorage.setItem(BRANCH_NOTIFICATIONS_KEY, JSON.stringify(newNotifications));
      setBranchNotifications(newNotifications);
    } catch (error) {
      console.log('Error saving branch notifications:', error);
    }
  };

  const addBranchNotification = async (notification: Omit<BranchNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: BranchNotification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...branchNotifications, newNotification];
    await saveBranchNotifications(updated);
    console.log('Branch notification added:', newNotification.id);
    return newNotification;
  };

  const markNotificationAsRead = async (id: string) => {
    const updated = branchNotifications.map(n => n.id === id ? { ...n, read: true } : n);
    await saveBranchNotifications(updated);
    console.log('Notification marked as read:', id);
  };

  const getBranchNotifications = (branchId: string) => {
    return branchNotifications.filter(n => n.branchId === branchId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getUnreadNotificationsCount = (branchId: string) => {
    return branchNotifications.filter(n => n.branchId === branchId && !n.read).length;
  };

  const savePointsSettings = async (settings: PointsSettings) => {
    try {
      console.log('💾 [POINTS SETTINGS] Saving to Firebase and AsyncStorage:', settings);
      await firebaseService.pointsSettings.save(settings);
      await AsyncStorage.setItem(POINTS_SETTINGS_KEY, JSON.stringify(settings));
      setPointsSettings(settings);
      console.log('✅ [POINTS SETTINGS] Points settings saved successfully');
    } catch (error) {
      console.error('❌ [POINTS SETTINGS] Error saving points settings:', error);
      throw error;
    }
  };

  const saveUserPoints = async (newUserPoints: UserPoints[]) => {
    try {
      await AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(newUserPoints));
      setUserPoints(newUserPoints);
    } catch (error) {
      console.log('Error saving user points:', error);
    }
  };

  const syncUserPointsToFirebase = async (userPoint: UserPoints) => {
    try {
      console.log('💾 [USER POINTS] Syncing to Firebase:', userPoint);
      const existing = await firebaseService.userPoints.getById(userPoint.userId);
      if (existing) {
        console.log('🔄 [USER POINTS] Updating existing points in Firebase');
        await firebaseService.userPoints.update(userPoint.userId, {
          availablePoints: userPoint.availablePoints,
          totalPoints: userPoint.totalPoints,
          lastUpdated: userPoint.lastUpdated,
        });
      } else {
        console.log('📝 [USER POINTS] Creating new points in Firebase');
        await firebaseService.userPoints.create(userPoint);
      }
      console.log('✅ [FIREBASE] User points synced to Firebase:', userPoint.userId, 'availablePoints:', userPoint.availablePoints);
    } catch (error) {
      console.error('❌ [FIREBASE] Error syncing user points:', error);
    }
  };

  const getUserPoints = (userId: string): UserPoints => {
    const existing = userPoints.find(up => up.userId === userId);
    if (existing) return existing;
    return {
      userId,
      availablePoints: 0,
      totalPoints: 0,
      lastUpdated: new Date().toISOString(),
    };
  };

  const refreshUserPointsFromFirebase = async (userId: string): Promise<UserPoints> => {
    try {
      console.log('🔄 Refreshing user points from Firebase for:', userId);
      const firebasePoints = await firebaseService.userPoints.getById(userId);
      
      if (firebasePoints) {
        console.log('📊 Firebase points data:', firebasePoints);
        const updated: UserPoints = {
          userId: firebasePoints.userId,
          availablePoints: firebasePoints.availablePoints || 0,
          totalPoints: firebasePoints.totalPoints || 0,
          lastUpdated: firebasePoints.lastUpdated,
        };
        
        const newUserPoints = [...userPoints.filter(up => up.userId !== userId), updated];
        console.log('💾 Saving updated points to state:', updated);
        setUserPoints(newUserPoints);
        await AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(newUserPoints));
        
        console.log('✅ User points refreshed from Firebase:', updated.availablePoints);
        return updated;
      } else {
        console.log('⚠️ No points found in Firebase for user:', userId);
        console.log('📝 Creating initial points document in Firebase...');
        
        const defaultPoints: UserPoints = {
          userId,
          availablePoints: 0,
          totalPoints: 0,
          lastUpdated: new Date().toISOString(),
        };
        
        await firebaseService.userPoints.create(defaultPoints);
        console.log('✅ Initial points document created in Firebase');
        
        const newUserPoints = [...userPoints.filter(up => up.userId !== userId), defaultPoints];
        setUserPoints(newUserPoints);
        await AsyncStorage.setItem(USER_POINTS_KEY, JSON.stringify(newUserPoints));
        
        return defaultPoints;
      }
    } catch (error) {
      console.error('❌ Error refreshing user points from Firebase:', error);
      throw error;
    }
  };

  const addPoints = async (userId: string, amount: number) => {
    console.log('💎 [ADD POINTS] Starting to add', amount, 'points to user:', userId);
    
    const firebasePoints = await firebaseService.userPoints.getById(userId);
    console.log('💎 [ADD POINTS] Current points in Firebase:', firebasePoints);
    
    const currentAvailable = firebasePoints?.availablePoints || 0;
    const currentTotal = firebasePoints?.totalPoints || 0;
    
    const updated: UserPoints = {
      userId,
      availablePoints: currentAvailable + amount,
      totalPoints: currentTotal + amount,
      lastUpdated: new Date().toISOString(),
    };
    
    console.log('💎 [ADD POINTS] New points to save:', updated);
    
    await firebaseService.userPoints.update(userId, {
      availablePoints: updated.availablePoints,
      totalPoints: updated.totalPoints,
    });
    
    const newUserPoints = userPoints.filter(up => up.userId !== userId);
    newUserPoints.push(updated);
    await saveUserPoints(newUserPoints);
    
    console.log(`✅ Added ${amount} points to user ${userId}. New total:`, updated.availablePoints);
    return updated;
  };

  const redeemPoints = async (userId: string, amount: number): Promise<number> => {
    const existing = getUserPoints(userId);
    if (existing.availablePoints < amount) {
      throw new Error('Puntos insuficientes');
    }
    const updated: UserPoints = {
      ...existing,
      availablePoints: existing.availablePoints - amount,
      lastUpdated: new Date().toISOString(),
    };
    const newUserPoints = userPoints.filter(up => up.userId !== userId);
    newUserPoints.push(updated);
    await saveUserPoints(newUserPoints);
    await syncUserPointsToFirebase(updated);
    
    const redeemValue = Math.floor(amount / pointsSettings.conversionRate);
    console.log(`✅ Redeemed ${amount} points for L.${redeemValue} value (synced to Firebase)`);
    return redeemValue;
  };

  const earnPointsFromOrder = async (order: Order) => {
    if (!pointsSettings.enabled) {
      console.log('⚠️ Points system is disabled, skipping points earn');
      return;
    }
    if (order.status !== 'delivered') {
      console.log('⚠️ Order not delivered yet, skipping points earn');
      return;
    }
    
    const pointsToAdd = Math.floor(order.total);
    console.log(`💎 Earning ${pointsToAdd} points for customer ${order.customerId} from order ${order.orderNumber} (1 LPS = 1 punto)`);
    await addPoints(order.customerId, pointsToAdd);
    console.log(`✅ Points earned and synced to Firebase for order ${order.orderNumber}`);
  };

  const requestOrderClaim = async (orderId: string, deliveryId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Orden no encontrada');

    console.log('🔍 [REQUEST CLAIM] Starting claim process for order:', orderId);
    console.log('🔍 [REQUEST CLAIM] Delivery ID:', deliveryId);
    console.log('🔍 [REQUEST CLAIM] Total orders in system:', orders.length);

    const deliveryActiveOrders = orders.filter(o => {
      const isDeliveryOrder = o.deliveryId === deliveryId;
      const isActiveStatus = o.status === 'preparing' || o.status === 'dispatched';
      const isDifferentOrder = o.id !== orderId;
      
      console.log('🔍 [REQUEST CLAIM] Checking order:', {
        orderNumber: o.orderNumber,
        orderId: o.id,
        deliveryId: o.deliveryId,
        status: o.status,
        isDeliveryOrder,
        isActiveStatus,
        isDifferentOrder,
        willCount: isDeliveryOrder && isActiveStatus && isDifferentOrder
      });
      
      return isDeliveryOrder && isActiveStatus && isDifferentOrder;
    });

    const activeOrdersCount = deliveryActiveOrders.length;
    
    console.log('🔍 [REQUEST CLAIM] Active orders count:', activeOrdersCount);
    console.log('🔍 [REQUEST CLAIM] Active orders:', deliveryActiveOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      id: o.id
    })));

    if (activeOrdersCount >= 1) {
      console.log('⚠️ [REQUEST CLAIM] Delivery has active orders, needs approval');
      
      const updated = orders.map(o => {
        if (o.id === orderId) {
          return { ...o, deliveryRequestedBy: deliveryId, requestApproved: false, updatedAt: new Date().toISOString() };
        }
        return o;
      });
      await saveOrders(updated);

      if (order.branchId) {
        const delivery = deliveryUsers.find(d => d.id === deliveryId);
        await addBranchNotification({
          branchId: order.branchId,
          type: 'order_claim_request',
          orderId: orderId,
          deliveryId: deliveryId,
          title: 'Solicitud de Orden Adicional',
          message: `${delivery?.name || 'Repartidor'} solicita tomar el pedido ${order.orderNumber}. Ya tiene ${activeOrdersCount} orden(es) en curso.`,
        });
      }

      console.log('✅ [REQUEST CLAIM] Order claim request saved, waiting for approval');
      return { needsApproval: true };
    }

    console.log('✅ [REQUEST CLAIM] No active orders, claiming directly');
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, deliveryId: deliveryId, status: 'dispatched' as Order['status'], assignedByBranch: false, updatedAt: new Date().toISOString() };
      }
      return o;
    });
    await saveOrders(updated);
    console.log('✅ [REQUEST CLAIM] Order claimed and dispatched:', orderId);
    return { needsApproval: false };
  };

  const approveOrderClaim = async (orderId: string, approved: boolean) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.deliveryRequestedBy) return;

    if (approved) {
      await updateOrderStatus(orderId, 'dispatched', order.deliveryRequestedBy, true);
    } else {
      const updated = orders.map(o => {
        if (o.id === orderId) {
          return { ...o, deliveryRequestedBy: undefined, requestApproved: false, updatedAt: new Date().toISOString() };
        }
        return o;
      });
      await saveOrders(updated);
    }

    console.log('Order claim', approved ? 'approved' : 'rejected', ':', orderId);
  };

  const deleteOrdersByBranches = async (branchIds: string[]) => {
    const updated = orders.filter(o => !branchIds.includes(o.branchId));
    await saveOrders(updated);
    console.log('Orders deleted for branches:', branchIds);
  };

  const resetAllSalesAndOrders = async () => {
    try {
      console.log('🔥 [RESET] Starting reset of all sales and orders...');
      
      console.log('🔥 [RESET] Step 1: Deleting orders from Firebase...');
      const deletedCount = await firebaseService.orders.deleteAll();
      console.log(`✅ [RESET] Deleted ${deletedCount} orders from Firebase`);
      
      console.log('🔥 [RESET] Step 2: Clearing local storage...');
      await AsyncStorage.removeItem(ORDERS_KEY);
      setOrders([]);
      
      await AsyncStorage.removeItem(ORDER_CANCELLATIONS_KEY);
      setOrderCancellations([]);
      
      await AsyncStorage.removeItem(ORDER_DELAYS_KEY);
      setOrderDelays([]);
      
      await AsyncStorage.removeItem(BRANCH_NOTIFICATIONS_KEY);
      setBranchNotifications([]);
      
      await AsyncStorage.removeItem(DELIVERY_RATINGS_KEY);
      setDeliveryRatings([]);
      
      console.log('✅ [RESET] All sales and orders have been reset successfully');
      console.log(`📊 [RESET] Total orders deleted from Firebase: ${deletedCount}`);
      return true;
    } catch (error) {
      console.error('❌ [RESET] Error resetting sales and orders:', error);
      return false;
    }
  };

  const clearProductsCache = async () => {
    try {
      console.log('🗑️ [CLEAR CACHE] Removing products and categories from cache...');
      await AsyncStorage.removeItem(PRODUCTS_KEY);
      await AsyncStorage.removeItem(CATEGORIES_KEY);
      await AsyncStorage.removeItem(PROMOTIONS_KEY);
      await AsyncStorage.removeItem(WOOCOMMERCE_SYNC_KEY);
      
      setProducts([]);
      setCategories([]);
      setPromotions([]);
      setLastSyncTime(null);
      
      console.log('✅ [CLEAR CACHE] Cache cleared successfully');
      console.log('🔄 [CLEAR CACHE] Now syncing with WooCommerce...');
      
      await syncWooCommerceData();
      
      return true;
    } catch (error) {
      console.log('❌ [CLEAR CACHE] Error clearing cache:', error);
      return false;
    }
  };

  return {
    firebaseConnected,
    branches,
    selectedBranchId,
    selectBranch,
    getSelectedBranch,
    isBranchOpen,
    getNextOpenTimeForBranch,
    lastBranchesSync,
    forceSyncBranches,
    complaints,
    deliveryUsers,
    deliveryRequests,
    coupons,
    products,
    categories,
    bankAccounts,
    orders,
    promotions,
    businessHours,
    marketingPopup,
    themeSettings,
    isLoading,
    isSyncing,
    lastSyncTime,
    syncWooCommerceData,
    addBranch,
    updateBranch,
    deleteBranch,
    addDeliveryZone,
    updateDeliveryZone,
    deleteDeliveryZone,
    addComplaint,
    updateComplaintStatus,
    registerDelivery,
    updateDeliveryStatus,
    updateDeliveryUserStatus,
    deleteDeliveryUser,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderProduct,
    getStats,
    getDeliveryUsersByBranch,
    getComplaintsByBranch,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getActiveBankAccounts,
    addOrder,
    updateOrderStatus,
    deleteOrder,
    authorizeTransfer,
    approveOrder,
    getOrdersByBranch,
    getOrdersByDelivery,
    addPromotion,
    updatePromotion,
    deletePromotion,
    updateBusinessHours,
    updateAllBusinessHours,
    updateBranchBusinessHours,
    isStoreOpen,
    isAnyBranchOpen,
    getOpenBranches,
    getNextOpenTime,
    saveMarketingPopup,
    saveThemeSettings,
    getWhatsAppUrl,
    exportBackup,
    importBackup,
    addDeliveryRating,
    getDeliveryRatings,
    getAverageDeliveryRating,
    addOrderCancellation,
    addOrderDelay,
    addBranchNotification,
    markNotificationAsRead,
    getBranchNotifications,
    getUnreadNotificationsCount,
    pointsSettings,
    savePointsSettings,
    userPoints,
    getUserPoints,
    refreshUserPointsFromFirebase,
    addPoints,
    redeemPoints,
    earnPointsFromOrder,
    requestOrderClaim,
    approveOrderClaim,
    deleteOrdersByBranches,
    resetAllSalesAndOrders,
    clearProductsCache,
  };
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  return <DataProviderInner>{children}</DataProviderInner>;
}
