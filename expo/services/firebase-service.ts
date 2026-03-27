import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import {
  Order,
  Branch,
  DeliveryUser,
  Product,
  Category,
  User,
  BranchNotification,
  BankAccount,
  PasswordRecoveryRequest,
  PointsSettings,
  Municipality,
} from '@/types';

export const firebaseService = {
  orders: {
    create: async (order: Order) => {
      console.log('🔥 Creating order in Firebase:', order.orderNumber);
      const orderData = {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      delete (orderData as any).adminApproved;
      delete (orderData as any).deliveryId;
      await setDoc(doc(db, 'orders', order.id), orderData);
      console.log('✅ Order created in Firebase');
    },

    update: async (orderId: string, updates: Partial<Order>) => {
      try {
        console.log('🔥 [FIREBASE] Updating order:', orderId);
        console.log('🔥 [FIREBASE] Updates:', updates);
        console.log('🔥 [FIREBASE] Current user:', auth.currentUser?.uid);
        console.log('🔥 [FIREBASE] Current user email:', auth.currentUser?.email);
        
        if (!auth.currentUser) {
          throw new Error('No estás autenticado. Por favor inicia sesión de nuevo.');
        }
        
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          throw new Error('Tu perfil no existe en el sistema.');
        }
        
        const userData = userDoc.data();
        console.log('👤 [FIREBASE] User data:', {
          role: userData?.role,
          branchId: userData?.branchId
        });
        
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (!orderDoc.exists()) {
          throw new Error('El pedido no existe.');
        }
        
        const orderData = orderDoc.data();
        console.log('📦 [FIREBASE] Order data:', {
          branchId: orderData?.branchId,
          status: orderData?.status
        });
        
        if (userData?.role === 'branch' && String(orderData?.branchId) !== String(userData?.branchId)) {
          console.error('🚫 [FIREBASE] Branch access denied! User branchId:', userData?.branchId, 'Order branchId:', orderData?.branchId);
          throw new Error(`Este pedido pertenece a otra sucursal. Tu sucursal: ${userData?.branchId}, Pedido sucursal: ${orderData?.branchId}`);
        }
        
        await updateDoc(doc(db, 'orders', orderId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ [FIREBASE] Order updated successfully');
      } catch (error: any) {
        console.error('❌ [FIREBASE] Error updating order:', error);
        console.error('❌ [FIREBASE] Error code:', error.code);
        console.error('❌ [FIREBASE] Error message:', error.message);
        
        if (error.code === 'permission-denied') {
          throw new Error('No tienes permisos para actualizar este pedido. Verifica que tu cuenta tenga los permisos correctos.');
        }
        
        throw error;
      }
    },

    delete: async (orderId: string) => {
      console.log('🔥 Deleting order from Firebase:', orderId);
      await deleteDoc(doc(db, 'orders', orderId));
      console.log('✅ Order deleted from Firebase');
    },

    getByBranch: (branchId: string, callback: (orders: Order[]) => void) => {
      console.log('🔥 [FIREBASE] Listening to orders for branch:', branchId, '(type:', typeof branchId, ')');
      const q = query(
        collection(db, 'orders'),
        where('branchId', '==', String(branchId)),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const orderBranchId = String(data.branchId);
          console.log('📦 [FIREBASE] Order:', doc.id, 'branchId:', orderBranchId, 'Requested branchId:', String(branchId));
          
          if (orderBranchId === String(branchId)) {
            orders.push({
              ...data,
              id: doc.id,
              branchId: orderBranchId,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            } as Order);
          }
        });
        console.log('📦 [FIREBASE] Orders filtered for branch', branchId, ':', orders.length);
        callback(orders);
      }, (error) => {
        console.error('❌ [FIREBASE] Error listening to branch orders:', error.code, error.message);
        callback([]);
      });
    },

    getByDelivery: (deliveryId: string, callback: (orders: Order[]) => void) => {
      console.log('🔥 Listening to orders for delivery:', deliveryId);
      const q = query(
        collection(db, 'orders'),
        where('deliveryId', '==', deliveryId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          orders.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as Order);
        });
        console.log('🚚 Orders updated for delivery:', orders.length);
        callback(orders);
      }, (error) => {
        console.error('❌ Error listening to delivery orders:', error.code);
        callback([]);
      });
    },

    getAll: (callback: (orders: Order[]) => void) => {
      console.log('🔥 Listening to all orders');
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          orders.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as Order);
        });
        console.log('📦 All orders updated:', orders.length);
        callback(orders);
      }, (error) => {
        console.error('❌ Error listening to orders:', error.code, error.message);
        callback([]);
      });
    },

    getAvailableForDelivery: (branchId: string, callback: (orders: Order[]) => void) => {
      console.log('🔥 Listening to available orders for delivery in branch:', branchId);
      const q = query(
        collection(db, 'orders'),
        where('branchId', '==', branchId),
        where('status', 'in', ['confirmed', 'preparing']),
        where('deliveryType', '==', 'delivery'),
        orderBy('createdAt', 'asc')
      );

      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.deliveryId) {
            orders.push({
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            } as Order);
          }
        });
        console.log('📦 Available orders for delivery:', orders.length);
        callback(orders);
      }, (error) => {
        console.error('❌ Error listening to available orders:', error.code);
        callback([]);
      });
    },

    getAvailableForDeliveryMultipleBranches: (branchIds: string[], callback: (orders: Order[]) => void) => {
      console.log('🔥 Listening to available orders for delivery in branches:', branchIds);
      
      if (branchIds.length === 0) {
        console.log('⚠️ No branch IDs provided, returning empty orders');
        callback([]);
        return () => {};
      }

      const unsubscribers: (() => void)[] = [];
      const ordersMap = new Map<string, Order>();

      const updateOrders = () => {
        const allOrders = Array.from(ordersMap.values());
        console.log('📦 Combined available orders from all branches:', allOrders.length);
        callback(allOrders);
      };

      branchIds.forEach((branchId) => {
        const branchIdStr = String(branchId);
        console.log(`🔍 [FIREBASE] Setting up listener for branchId: ${branchIdStr}`);
        const q = query(
          collection(db, 'orders'),
          where('branchId', '==', branchIdStr),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const orderId = change.doc.id;

            if (change.type === 'removed') {
              ordersMap.delete(orderId);
            } else {
              const isAvailable = !data.deliveryId && 
                                !data.deliveryRequestedBy &&
                                ['pending', 'preparing', 'ready'].includes(data.status) &&
                                data.deliveryType === 'delivery';
              
              if (isAvailable) {
                ordersMap.set(orderId, {
                  ...data,
                  id: orderId,
                  createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                } as Order);
              } else {
                ordersMap.delete(orderId);
              }
            }
          });
          console.log(`📦 [Branch: ${branchId}] Updated orders in map:`, ordersMap.size);
          updateOrders();
        }, (error) => {
          console.error(`❌ Error listening to orders for branch ${branchId}:`, error.code);
        });

        unsubscribers.push(unsubscribe);
      });

      return () => {
        console.log('🔥 Cleaning up multiple branch listeners');
        unsubscribers.forEach(unsub => unsub());
      };
    },

    getAllDeliveryOrdersFromBranches: (branchIds: string[], callback: (orders: Order[]) => void) => {
      console.log('🔥 Listening to ALL delivery orders from branches:', branchIds);
      
      if (branchIds.length === 0) {
        console.log('⚠️ No branch IDs provided, returning empty orders');
        callback([]);
        return () => {};
      }

      const unsubscribers: (() => void)[] = [];
      const ordersMap = new Map<string, Order>();

      const updateOrders = () => {
        const allOrders = Array.from(ordersMap.values());
        console.log('📦 All delivery orders from branches:', allOrders.length);
        callback(allOrders);
      };

      branchIds.forEach((branchId) => {
        const branchIdStr = String(branchId);
        console.log(`🔍 [FIREBASE] Setting up ALL orders listener for branchId: ${branchIdStr}`);
        const q = query(
          collection(db, 'orders'),
          where('branchId', '==', branchIdStr),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const orderId = change.doc.id;

            if (change.type === 'removed') {
              ordersMap.delete(orderId);
            } else {
              if (data.deliveryType === 'delivery') {
                ordersMap.set(orderId, {
                  ...data,
                  id: orderId,
                  createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                } as Order);
              } else {
                ordersMap.delete(orderId);
              }
            }
          });
          console.log(`📦 [Branch: ${branchId}] All delivery orders in map:`, ordersMap.size);
          updateOrders();
        }, (error) => {
          console.error(`❌ Error listening to all orders for branch ${branchId}:`, error.code);
        });

        unsubscribers.push(unsubscribe);
      });

      return () => {
        console.log('🔥 Cleaning up all delivery orders listeners');
        unsubscribers.forEach(unsub => unsub());
      };
    },

    deleteAll: async (): Promise<number> => {
      console.log('🔥 [DELETE ALL ORDERS] Starting deletion of all orders from Firebase...');
      try {
        const snapshot = await getDocs(collection(db, 'orders'));
        const totalOrders = snapshot.size;
        console.log(`📦 [DELETE ALL ORDERS] Found ${totalOrders} orders to delete`);
        
        if (totalOrders === 0) {
          console.log('✅ [DELETE ALL ORDERS] No orders to delete');
          return 0;
        }

        const batchSize = 500;
        let deletedCount = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snapshot.docs) {
          batch.delete(doc(db, 'orders', docSnap.id));
          batchCount++;
          deletedCount++;

          if (batchCount === batchSize) {
            await batch.commit();
            console.log(`📦 [DELETE ALL ORDERS] Batch committed: ${deletedCount}/${totalOrders}`);
            batch = writeBatch(db);
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
          console.log(`📦 [DELETE ALL ORDERS] Final batch committed: ${deletedCount}/${totalOrders}`);
        }

        console.log(`✅ [DELETE ALL ORDERS] Successfully deleted ${deletedCount} orders from Firebase`);
        return deletedCount;
      } catch (error: any) {
        console.error('❌ [DELETE ALL ORDERS] Error deleting orders:', error);
        throw error;
      }
    },
  },

  branches: {
    create: async (branch: Branch) => {
      console.log('🔥 Creating branch in Firebase:', branch.name);
      await setDoc(doc(db, 'branches', branch.id), branch);
      console.log('✅ Branch created in Firebase');
    },

    update: async (branchId: string, updates: Partial<Branch>) => {
      console.log('🔥 Updating branch in Firebase:', branchId);
      console.log('🔥 Branch updates:', updates);
      console.log('🔥 Current Firebase Auth user:', auth.currentUser?.uid);
      console.log('🔥 Current Firebase Auth email:', auth.currentUser?.email);
      
      if (!auth.currentUser) {
        console.error('❌ No Firebase Auth user found!');
        throw new Error('No hay usuario autenticado en Firebase. Por favor, cierra sesión e inicia sesión nuevamente.');
      }
      
      try {
        console.log('🔍 Verifying user role in Firestore...');
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          console.error('❌ User document does not exist in Firestore!');
          throw new Error('Tu usuario no está registrado en Firebase. Contacta al soporte.');
        }
        const userData = userDoc.data();
        console.log('👤 User role:', userData?.role);
        console.log('🏪 User branchId:', userData?.branchId);
        
        if (userData?.role === 'admin') {
          console.log('✅ User is admin, can update any branch');
        } else if (userData?.role === 'branch' && userData?.branchId === branchId) {
          console.log('✅ User is branch manager, can update their own branch');
        } else {
          console.error('❌ User does not have permission! Role:', userData?.role, 'BranchId:', userData?.branchId, 'Target:', branchId);
          throw new Error(`No tienes permisos para actualizar esta sucursal. Tu rol actual es: ${userData?.role}`);
        }
        
        console.log('✅ User verified, proceeding with update...');
        await setDoc(doc(db, 'branches', branchId), updates, { merge: true });
        console.log('✅ Branch updated in Firebase');
      } catch (error: any) {
        console.error('❌ Error updating branch:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        
        if (error.message && error.message.includes('permisos')) {
          throw error;
        }
        
        if (error.code === 'permission-denied') {
          throw new Error('No tienes permisos para actualizar sucursales. Verifica las reglas de Firebase.');
        }
        
        throw new Error(`Error al actualizar sucursal: ${error.message || 'Error desconocido'}`);
      }
    },

    delete: async (branchId: string) => {
      console.log('🔥 Deleting branch from Firebase:', branchId);
      await deleteDoc(doc(db, 'branches', branchId));
      console.log('✅ Branch deleted from Firebase');
    },

    getAll: (callback: (branches: Branch[]) => void) => {
      console.log('🔥 Listening to all branches');
      return onSnapshot(collection(db, 'branches'), (snapshot) => {
        const branches: Branch[] = [];
        snapshot.forEach((doc) => {
          branches.push({ ...doc.data(), id: doc.id } as Branch);
        });
        console.log('🏢 Branches updated:', branches.length);
        callback(branches);
      }, (error) => {
        console.error('❌ Error listening to branches:', error.code);
        callback([]);
      });
    },

    getById: async (branchId: string): Promise<Branch | null> => {
      const docRef = doc(db, 'branches', branchId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Branch;
      }
      return null;
    },
  },

  deliveryUsers: {
    create: async (user: DeliveryUser) => {
      console.log('🔥 Creating delivery user in Firebase:', user.name);
      const cleanData = Object.fromEntries(
        Object.entries({ ...user, createdAt: Timestamp.now() })
          .filter(([_, value]) => value !== undefined)
      );
      console.log('🔥 Clean data to save:', JSON.stringify(cleanData, null, 2));
      await setDoc(doc(db, 'deliveryUsers', user.id), cleanData);
      console.log('✅ Delivery user created in Firebase');
    },

    update: async (userId: string, updates: Partial<DeliveryUser>) => {
      console.log('🔥 Updating delivery user in Firebase:', userId);
      await updateDoc(doc(db, 'deliveryUsers', userId), updates);
      console.log('✅ Delivery user updated in Firebase');
    },

    delete: async (userId: string) => {
      console.log('🔥 Deleting delivery user from Firebase:', userId);
      await deleteDoc(doc(db, 'deliveryUsers', userId));
      console.log('✅ Delivery user deleted from Firebase');
    },

    getAll: (callback: (users: DeliveryUser[]) => void) => {
      console.log('🔥 Listening to all delivery users');
      return onSnapshot(collection(db, 'deliveryUsers'), (snapshot) => {
        const users: DeliveryUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          users.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          } as DeliveryUser);
        });
        console.log('🚚 Delivery users updated:', users.length);
        callback(users);
      }, (error) => {
        console.error('❌ Error listening to delivery users:', error.code);
        callback([]);
      });
    },

    getAllSnapshot: async (): Promise<DeliveryUser[]> => {
      console.log('🔥 Getting all delivery users snapshot');
      const snapshot = await getDocs(collection(db, 'deliveryUsers'));
      const users: DeliveryUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        } as DeliveryUser);
      });
      console.log('🚚 Delivery users snapshot retrieved:', users.length);
      return users;
    },

    getByBranch: (branchId: string, callback: (users: DeliveryUser[]) => void) => {
      console.log('🔥 Listening to delivery users for branch:', branchId);
      const q = query(collection(db, 'deliveryUsers'), where('branchId', '==', branchId));

      return onSnapshot(q, (snapshot) => {
        const users: DeliveryUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          users.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          } as DeliveryUser);
        });
        console.log('🚚 Delivery users updated for branch:', users.length);
        callback(users);
      }, (error) => {
        console.error('❌ Error listening to branch delivery users:', error.code);
        callback([]);
      });
    },
  },

  users: {
    create: async (user: User) => {
      console.log('🔥 Creating user in Firebase:', user.name);
      await setDoc(doc(db, 'users', user.id), user);
      console.log('✅ User created in Firebase');
    },

    update: async (userId: string, updates: Partial<User>) => {
      console.log('🔥 Updating user in Firebase:', userId);
      await updateDoc(doc(db, 'users', userId), updates);
      console.log('✅ User updated in Firebase');
    },

    delete: async (userId: string) => {
      console.log('🔥 Deleting user from Firebase:', userId);
      await deleteDoc(doc(db, 'users', userId));
      console.log('✅ User deleted from Firebase');
    },

    getById: async (userId: string): Promise<User | null> => {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as User;
      }
      return null;
    },

    getByIdentityNumber: async (identityNumber: string): Promise<User | null> => {
      console.log('🔍 Searching user by identity number:', identityNumber);
      const q = query(collection(db, 'users'), where('identityNumber', '==', identityNumber));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { ...docSnap.data(), id: docSnap.id } as User;
      }
      return null;
    },

    getByEmail: async (email: string): Promise<User | null> => {
      console.log('🔍 Searching user by email:', email);
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { ...docSnap.data(), id: docSnap.id } as User;
      }
      return null;
    },

    getAll: (callback: (users: User[]) => void) => {
      console.log('🔥 Listening to all users');
      return onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((doc) => {
          users.push({ ...doc.data(), id: doc.id } as User);
        });
        console.log('👥 Users updated:', users.length);
        callback(users);
      }, (error) => {
        console.error('❌ Error listening to users:', error.code);
        callback([]);
      });
    },

    getAllSnapshot: async (): Promise<User[]> => {
      console.log('🔥 Getting all users snapshot');
      const snapshot = await getDocs(collection(db, 'users'));
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push({ ...doc.data(), id: doc.id } as User);
      });
      console.log('👥 Users snapshot retrieved:', users.length);
      return users;
    },
  },

  products: {
    batchCreate: async (products: Product[]) => {
      console.log('🔥 Batch creating products in Firebase:', products.length);
      const batch = writeBatch(db);
      products.forEach((product) => {
        const docRef = doc(db, 'products', product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log('✅ Products batch created in Firebase');
    },

    getAll: (callback: (products: Product[]) => void) => {
      console.log('🔥 Listening to all products');
      return onSnapshot(collection(db, 'products'), (snapshot) => {
        const products: Product[] = [];
        snapshot.forEach((doc) => {
          products.push({ ...doc.data(), id: doc.id } as Product);
        });
        console.log('🍗 Products updated:', products.length);
        callback(products);
      }, (error) => {
        console.error('❌ Error listening to products:', error.code);
        callback([]);
      });
    },
  },

  categories: {
    batchCreate: async (categories: Category[]) => {
      console.log('🔥 Batch creating categories in Firebase:', categories.length);
      const batch = writeBatch(db);
      categories.forEach((category) => {
        const docRef = doc(db, 'categories', category.id);
        batch.set(docRef, category);
      });
      await batch.commit();
      console.log('✅ Categories batch created in Firebase');
    },

    getAll: (callback: (categories: Category[]) => void) => {
      console.log('🔥 Listening to all categories');
      return onSnapshot(collection(db, 'categories'), (snapshot) => {
        const categories: Category[] = [];
        snapshot.forEach((doc) => {
          categories.push({ ...doc.data(), id: doc.id } as Category);
        });
        console.log('📁 Categories updated:', categories.length);
        callback(categories);
      }, (error) => {
        console.error('❌ Error listening to categories:', error.code);
        callback([]);
      });
    },
  },

  notifications: {
    create: async (notification: BranchNotification) => {
      console.log('🔥 Creating notification in Firebase');
      await setDoc(doc(db, 'notifications', notification.id), {
        ...notification,
        createdAt: Timestamp.now(),
      });
      console.log('✅ Notification created in Firebase');
    },

    markAsRead: async (notificationId: string) => {
      console.log('🔥 Marking notification as read:', notificationId);
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      console.log('✅ Notification marked as read');
    },

    getByBranch: (branchId: string, callback: (notifications: BranchNotification[]) => void) => {
      console.log('🔥 Listening to notifications for branch:', branchId);
      const q = query(
        collection(db, 'notifications'),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const notifications: BranchNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          } as BranchNotification);
        });
        console.log('🔔 Notifications updated for branch:', notifications.length);
        callback(notifications);
      }, (error) => {
        console.error('❌ Error listening to notifications:', error.code);
        callback([]);
      });
    },
  },

  userPoints: {
    create: async (userPoints: any) => {
      console.log('🔥 Creating user points in Firebase:', userPoints.userId);
      await setDoc(doc(db, 'userPoints', userPoints.userId), {
        ...userPoints,
        lastUpdated: Timestamp.now(),
      });
      console.log('✅ User points created in Firebase');
    },

    update: async (userId: string, updates: any) => {
      console.log('🔥 Updating user points in Firebase:', userId);
      await updateDoc(doc(db, 'userPoints', userId), {
        ...updates,
        lastUpdated: Timestamp.now(),
      });
      console.log('✅ User points updated in Firebase');
    },

    delete: async (userId: string) => {
      console.log('🔥 Deleting user points from Firebase:', userId);
      await deleteDoc(doc(db, 'userPoints', userId));
      console.log('✅ User points deleted from Firebase');
    },

    getById: async (userId: string): Promise<any | null> => {
      console.log('🔍 [USER POINTS] Getting points for user:', userId);
      const docRef = doc(db, 'userPoints', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const result = {
          ...data,
          userId: docSnap.id,
          lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || data.lastUpdated,
        };
        console.log('✅ [USER POINTS] Points found:', result);
        return result;
      }
      console.log('⚠️ [USER POINTS] No points found for user:', userId);
      return null;
    },

    getAll: (callback: (userPoints: any[]) => void) => {
      console.log('🔥 Listening to all user points');
      return onSnapshot(collection(db, 'userPoints'), (snapshot) => {
        const points: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const pointsData = {
            ...data,
            userId: doc.id,
            lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || data.lastUpdated,
          };
          points.push(pointsData);
          console.log('💎 [USER POINTS] Loaded points for user:', doc.id, pointsData);
        });
        console.log('💎 User points updated:', points.length);
        callback(points);
      }, (error) => {
        console.error('❌ Error listening to user points:', error.code);
        callback([]);
      });
    },
  },

  bankAccounts: {
    create: async (account: BankAccount) => {
      console.log('🔥 Creating bank account in Firebase:', account.bankName);
      await setDoc(doc(db, 'bankAccounts', account.id), account);
      console.log('✅ Bank account created in Firebase');
    },

    update: async (accountId: string, updates: Partial<BankAccount>) => {
      console.log('🔥 Updating bank account in Firebase:', accountId);
      await updateDoc(doc(db, 'bankAccounts', accountId), updates);
      console.log('✅ Bank account updated in Firebase');
    },

    delete: async (accountId: string) => {
      console.log('🔥 Deleting bank account from Firebase:', accountId);
      await deleteDoc(doc(db, 'bankAccounts', accountId));
      console.log('✅ Bank account deleted from Firebase');
    },

    getAll: (callback: (accounts: BankAccount[]) => void) => {
      console.log('🔥 Listening to all bank accounts');
      return onSnapshot(collection(db, 'bankAccounts'), (snapshot) => {
        const accounts: BankAccount[] = [];
        snapshot.forEach((doc) => {
          accounts.push({ ...doc.data(), id: doc.id } as BankAccount);
        });
        console.log('💳 Bank accounts updated:', accounts.length);
        callback(accounts);
      }, (error) => {
        console.error('❌ Error listening to bank accounts:', error.code);
        callback([]);
      });
    },
  },

  sync: {
    syncLocalDataToFirebase: async (localData: {
      branches?: Branch[];
      deliveryUsers?: DeliveryUser[];
      orders?: Order[];
      products?: Product[];
      categories?: Category[];
      bankAccounts?: BankAccount[];
    }) => {
      console.log('🔄 Starting sync of local data to Firebase...');
      
      const batch = writeBatch(db);
      let count = 0;

      if (localData.branches) {
        localData.branches.forEach((branch) => {
          const docRef = doc(db, 'branches', branch.id);
          batch.set(docRef, branch, { merge: true });
          count++;
        });
      }

      if (localData.deliveryUsers) {
        localData.deliveryUsers.forEach((user) => {
          const docRef = doc(db, 'deliveryUsers', user.id);
          batch.set(docRef, user, { merge: true });
          count++;
        });
      }

      if (localData.orders) {
        localData.orders.forEach((order) => {
          const docRef = doc(db, 'orders', order.id);
          batch.set(docRef, order, { merge: true });
          count++;
        });
      }

      if (localData.products) {
        localData.products.forEach((product) => {
          const docRef = doc(db, 'products', product.id);
          batch.set(docRef, product, { merge: true });
          count++;
        });
      }

      if (localData.categories) {
        localData.categories.forEach((category) => {
          const docRef = doc(db, 'categories', category.id);
          batch.set(docRef, category, { merge: true });
          count++;
        });
      }

      if (localData.bankAccounts) {
        localData.bankAccounts.forEach((account) => {
          const docRef = doc(db, 'bankAccounts', account.id);
          batch.set(docRef, account, { merge: true });
          count++;
        });
      }

      await batch.commit();
      console.log(`✅ Synced ${count} documents to Firebase`);
      return count;
    },
  },

  passwordRecoveryRequests: {
    create: async (request: Omit<PasswordRecoveryRequest, 'id' | 'createdAt'>): Promise<string> => {
      console.log('🔑 Creating password recovery request for:', request.userEmail);
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const requestData = {
        ...request,
        id: requestId,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'passwordRecoveryRequests', requestId), requestData);
      console.log('✅ Password recovery request created:', requestId);
      return requestId;
    },

    getAll: (callback: (requests: PasswordRecoveryRequest[]) => void) => {
      console.log('🔥 Listening to all password recovery requests');
      const q = query(
        collection(db, 'passwordRecoveryRequests'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const requests: PasswordRecoveryRequest[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            temporaryPasswordExpiresAt: data.temporaryPasswordExpiresAt?.toDate?.()?.toISOString() || data.temporaryPasswordExpiresAt,
            approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
          } as PasswordRecoveryRequest);
        });
        console.log('📋 Password recovery requests updated:', requests.length);
        callback(requests);
      });
    },

    update: async (requestId: string, updates: Partial<PasswordRecoveryRequest>) => {
      console.log('🔥 Updating password recovery request:', requestId);
      await updateDoc(doc(db, 'passwordRecoveryRequests', requestId), updates);
      console.log('✅ Password recovery request updated');
    },

    delete: async (requestId: string) => {
      console.log('🗑️ Deleting password recovery request:', requestId);
      await deleteDoc(doc(db, 'passwordRecoveryRequests', requestId));
      console.log('✅ Password recovery request deleted');
    },
  },

  passwordReset: {
    createToken: async (email: string): Promise<string> => {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = Date.now() + 3600000;
      
      console.log('🔑 Creating password reset token for:', email);
      await setDoc(doc(db, 'passwordResets', email), {
        token,
        expiresAt,
        createdAt: Timestamp.now(),
      });
      console.log('✅ Password reset token created');
      return token;
    },

    verifyToken: async (email: string, token: string): Promise<boolean> => {
      try {
        console.log('🔍 Verifying password reset token for:', email);
        const docSnap = await getDoc(doc(db, 'passwordResets', email));
        
        if (!docSnap.exists()) {
          console.log('❌ No reset token found');
          return false;
        }
        
        const data = docSnap.data();
        if (data.token !== token) {
          console.log('❌ Invalid token');
          return false;
        }
        
        if (Date.now() > data.expiresAt) {
          console.log('❌ Token expired');
          await deleteDoc(doc(db, 'passwordResets', email));
          return false;
        }
        
        console.log('✅ Token verified');
        return true;
      } catch (error) {
        console.error('❌ Error verifying token:', error);
        return false;
      }
    },

    deleteToken: async (email: string) => {
      console.log('🗑️ Deleting password reset token for:', email);
      await deleteDoc(doc(db, 'passwordResets', email));
      console.log('✅ Token deleted');
    },
  },

  storage: {
    uploadReceipt: async (orderId: string, imageUri: string): Promise<string> => {
      try {
        console.log('📤 Converting receipt to base64 for order:', orderId);
        console.log('📷 Image URI:', imageUri);
        
        if (!imageUri) {
          throw new Error('No se proporcionó una imagen');
        }
        
        console.log('📥 Fetching image from URI...');
        const response = await fetch(imageUri);
        
        if (!response.ok) {
          throw new Error(`No se pudo obtener la imagen: ${response.status} ${response.statusText}`);
        }
        
        console.log('🔄 Converting to blob...');
        const blob = await response.blob();
        console.log('📦 Blob size:', blob.size, 'bytes, type:', blob.type);
        
        if (blob.size === 0) {
          throw new Error('La imagen está vacía');
        }
        
        if (blob.size > 500000) {
          console.warn('⚠️ Image is large (>500KB), consider compressing');
        }
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            console.log('✅ Receipt converted to base64 successfully');
            console.log('📏 Base64 length:', base64data.length);
            resolve(base64data);
          };
          reader.onerror = () => {
            reject(new Error('Error al convertir la imagen a base64'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error: any) {
        console.error('❌ Error converting receipt:', error);
        console.error('❌ Error message:', error.message);
        
        throw new Error(error.message || 'Error al procesar el comprobante');
      }
    },
  },

  pointsSettings: {
    save: async (settings: PointsSettings) => {
      console.log('🔥 Saving points settings to Firebase');
      console.log('💎 Settings:', settings);
      await setDoc(doc(db, 'pointsSettings', 'config'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Points settings saved to Firebase');
    },

    get: async (): Promise<PointsSettings | null> => {
      console.log('🔍 Getting points settings from Firebase');
      const docRef = doc(db, 'pointsSettings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Points settings found:', data);
        return {
          enabled: data.enabled,
          conversionRate: data.conversionRate,
          redeemableCategories: data.redeemableCategories || [],
        };
      }
      console.log('⚠️ No points settings found in Firebase');
      return null;
    },

    listen: (callback: (settings: PointsSettings | null) => void) => {
      console.log('🔥 Listening to points settings');
      return onSnapshot(doc(db, 'pointsSettings', 'config'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('💎 Points settings updated:', data);
          callback({
            enabled: data.enabled,
            conversionRate: data.conversionRate,
            redeemableCategories: data.redeemableCategories || [],
          });
        } else {
          console.log('⚠️ No points settings found');
          callback(null);
        }
      }, (error) => {
        console.error('❌ Error listening to points settings:', error.code);
        callback(null);
      });
    },
  },

  deliveryRequests: {
    create: async (request: any) => {
      console.log('🔥 Creating delivery request in Firebase:', request.name);
      const cleanData = Object.fromEntries(
        Object.entries({ ...request, createdAt: Timestamp.now(), status: 'pending' })
          .filter(([_, value]) => value !== undefined)
      );
      console.log('🔥 Clean data to save:', JSON.stringify(cleanData, null, 2));
      await setDoc(doc(db, 'deliveryRequests', request.id), cleanData);
      console.log('✅ Delivery request created in Firebase');
    },

    getByBranch: (branchId: string, callback: (requests: any[]) => void) => {
      console.log('🔥 Listening to delivery requests for branch:', branchId);
      const q = query(collection(db, 'deliveryRequests'), where('branchId', '==', branchId));

      return onSnapshot(q, (snapshot) => {
        const requests: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          });
        });
        console.log('📋 Delivery requests updated for branch:', requests.length);
        callback(requests);
      }, (error) => {
        console.error('❌ Error listening to delivery requests:', error.code);
        callback([]);
      });
    },

    getAll: (callback: (requests: any[]) => void) => {
      console.log('🔥 Listening to all delivery requests');
      return onSnapshot(collection(db, 'deliveryRequests'), (snapshot) => {
        const requests: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          });
        });
        console.log('📋 All delivery requests updated:', requests.length);
        callback(requests);
      }, (error) => {
        console.error('❌ Error listening to delivery requests:', error.code);
        callback([]);
      });
    },

    getByDni: async (dni: string): Promise<any[]> => {
      console.log('🔍 Searching delivery requests by DNI:', dni);
      const q = query(collection(db, 'deliveryRequests'), where('dni', '==', dni));
      const snapshot = await getDocs(q);
      const requests: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        });
      });
      console.log('📋 Found', requests.length, 'delivery requests with DNI:', dni);
      return requests;
    },

    approveAllByDni: async (dni: string): Promise<number> => {
      console.log('✅ [APPROVE ALL BY DNI] Starting approval for all requests with DNI:', dni);
      const q = query(collection(db, 'deliveryRequests'), where('dni', '==', dni));
      const snapshot = await getDocs(q);
      
      let count = 0;
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('✅ [APPROVE ALL BY DNI] Approving request:', docSnap.id, 'branchId:', data.branchId);
        batch.update(doc(db, 'deliveryRequests', docSnap.id), { status: 'approved' });
        count++;
      });
      
      if (count > 0) {
        await batch.commit();
        console.log('✅ [APPROVE ALL BY DNI] Approved', count, 'delivery requests with DNI:', dni);
      } else {
        console.log('⚠️ [APPROVE ALL BY DNI] No requests found with DNI:', dni);
      }
      
      return count;
    },

    rejectAllByDni: async (dni: string): Promise<number> => {
      console.log('❌ [REJECT ALL BY DNI] Starting rejection for all requests with DNI:', dni);
      const q = query(collection(db, 'deliveryRequests'), where('dni', '==', dni));
      const snapshot = await getDocs(q);
      
      let count = 0;
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('❌ [REJECT ALL BY DNI] Rejecting request:', docSnap.id, 'branchId:', data.branchId);
        batch.update(doc(db, 'deliveryRequests', docSnap.id), { status: 'rejected' });
        count++;
      });
      
      if (count > 0) {
        await batch.commit();
        console.log('❌ [REJECT ALL BY DNI] Rejected', count, 'delivery requests with DNI:', dni);
      } else {
        console.log('⚠️ [REJECT ALL BY DNI] No requests found with DNI:', dni);
      }
      
      return count;
    },

    update: async (requestId: string, updates: any) => {
      console.log('🔥 Updating delivery request in Firebase:', requestId);
      await updateDoc(doc(db, 'deliveryRequests', requestId), updates);
      console.log('✅ Delivery request updated in Firebase');
    },

    delete: async (requestId: string) => {
      console.log('🔥 Deleting delivery request from Firebase:', requestId);
      await deleteDoc(doc(db, 'deliveryRequests', requestId));
      console.log('✅ Delivery request deleted from Firebase');
    },
  },

  municipalities: {
    create: async (municipality: Municipality) => {
      console.log('🔥 Creating municipality in Firebase:', municipality.nombre);
      await setDoc(doc(db, 'municipalities', municipality.id), municipality);
      console.log('✅ Municipality created in Firebase');
    },

    update: async (municipalityId: string, updates: Partial<Municipality>) => {
      console.log('🔥 Updating municipality in Firebase:', municipalityId);
      await updateDoc(doc(db, 'municipalities', municipalityId), updates);
      console.log('✅ Municipality updated in Firebase');
    },

    delete: async (municipalityId: string) => {
      console.log('🔥 Deleting municipality from Firebase:', municipalityId);
      await deleteDoc(doc(db, 'municipalities', municipalityId));
      console.log('✅ Municipality deleted from Firebase');
    },

    getAll: (callback: (municipalities: Municipality[]) => void) => {
      console.log('🔥 Listening to all municipalities');
      return onSnapshot(collection(db, 'municipalities'), (snapshot) => {
        const municipalities: Municipality[] = [];
        snapshot.forEach((doc) => {
          municipalities.push({ ...doc.data(), id: doc.id } as Municipality);
        });
        console.log('🏙️ Municipalities updated:', municipalities.length);
        callback(municipalities);
      }, (error) => {
        console.error('❌ Error listening to municipalities:', error.code);
        callback([]);
      });
    },

    getById: async (municipalityId: string): Promise<Municipality | null> => {
      console.log('🔍 Getting municipality from Firebase:', municipalityId);
      const docRef = doc(db, 'municipalities', municipalityId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Municipality;
      }
      return null;
    },
  },
};
