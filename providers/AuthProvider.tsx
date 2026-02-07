import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, AppState, AppStateStatus } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { User, Branch, DeliveryUser } from '@/types';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebase-service';

const AUTH_STORAGE_KEY = 'fry_chicken_auth';
const BRANCHES_KEY = 'fry_chicken_branches';
const DELIVERY_USERS_KEY = 'fry_chicken_delivery_users';
const BIOMETRIC_CREDENTIALS_KEY = 'fry_chicken_biometric_creds';
const LAST_ACTIVITY_KEY = 'fry_chicken_last_activity';
const DEFAULT_PROFILE_IMAGE = 'https://frychickenhn.com/wp-content/uploads/2022/01/512.png';
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncBranchesCallback, setSyncBranchesCallback] = useState<(() => Promise<void>) | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutCheckIntervalRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    loadUser();
    loadLastActivity();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔥 Firebase auth state changed - user logged in:', firebaseUser.uid);
        const userData = await firebaseService.users.getById(firebaseUser.uid);
        if (userData) {
          setUser(userData);
          await saveUser(userData);
          updateLastActivity();
        }
      } else {
        console.log('🔥 Firebase auth state changed - user logged out');
      }
    });

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    startTimeoutCheck();

    return () => {
      unsubscribe();
      appStateSubscription.remove();
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      startTimeoutCheck();
    } else {
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
    }
  }, [user]);

  const loadLastActivity = async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored) {
        lastActivityRef.current = parseInt(stored, 10);
      } else {
        lastActivityRef.current = Date.now();
      }
    } catch (error) {
      console.log('Error loading last activity:', error);
      lastActivityRef.current = Date.now();
    }
  };

  const updateLastActivity = async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch (error) {
      console.log('Error saving last activity:', error);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App has come to the foreground');
      if (user) {
        await checkSessionTimeout();
      }
    }
    
    if (nextAppState === 'active' && user) {
      updateLastActivity();
    }
    
    appStateRef.current = nextAppState;
  };

  const checkSessionTimeout = async () => {
    if (!user) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    console.log(`⏱️ Time since last activity: ${Math.floor(timeSinceLastActivity / 1000 / 60)} minutes`);
    
    if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
      console.log('⏰ Session timeout - logging out user');
      await logout();
    }
  };

  const startTimeoutCheck = () => {
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
    }
    
    timeoutCheckIntervalRef.current = setInterval(() => {
      checkSessionTimeout();
    }, 60000);
  };

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (newUser: User | null) => {
    try {
      if (newUser) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.log('Error saving user:', error);
    }
  };

  const registerCustomer = async (identityNumber: string, name: string, email: string, phone: string, password: string) => {
    try {
      console.log('📝 Registering new customer:', name);
      
      if (!email || !email.includes('@')) {
        throw new Error('Por favor ingresa un correo electrónico válido');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser: User = {
        id: firebaseUser.uid,
        role: 'customer',
        name,
        identityNumber,
        email,
        phone,
        profileImage: DEFAULT_PROFILE_IMAGE,
      };
      
      console.log('💾 Saving user to Firebase:', newUser);
      await firebaseService.users.create(newUser);
      
      setUser(newUser);
      await saveUser(newUser);
      
      console.log('🔄 [REGISTER] Syncing branches (business hours) for new user...');
      if (syncBranchesCallback) {
        await syncBranchesCallback();
        console.log('✅ [REGISTER] Branches synced successfully');
      }
      
      console.log('✅ Customer registered:', name);
      return newUser;
    } catch (error: any) {
      console.error('❌ Error registering customer:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este DNI ya está registrado. Por favor inicia sesión.');
      }
      throw new Error(error.message || 'Error al registrar usuario');
    }
  };

  const loginAsCustomer = async (email: string, password: string) => {
    try {
      console.log('🔐 Logging in customer with email:', email);
      
      if (!email || !email.includes('@')) {
        throw new Error('Por favor ingresa un correo electrónico válido');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('✅ Customer signed in with Firebase Auth');

      const userData = await firebaseService.users.getById(firebaseUser.uid);
      
      if (!userData) {
        throw new Error('Usuario no encontrado');
      }
      
      setUser(userData);
      await saveUser(userData);
      await updateLastActivity();
      console.log('✅ Customer logged in:', userData.name);
      return userData;
    } catch (error: any) {
      console.error('❌ Error logging in as customer:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        throw new Error('Correo o contraseña incorrectos');
      }
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      console.log('🔐 Logging in admin:', email);
      
      let firebaseUser;
      let isNewUser = false;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        console.log('✅ Admin signed in with Firebase Auth');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          if (email === 'frychickenhn@gmail.com' && password === 'FRY2027') {
            console.log('📝 Creating admin account in Firebase Auth');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUser = userCredential.user;
            isNewUser = true;
          } else {
            throw new Error('Credenciales inválidas');
          }
        } else {
          console.error('Firebase Auth error:', error);
          throw new Error('Error al iniciar sesión: ' + error.message);
        }
      }

      console.log('🔍 Getting user data from Firestore for uid:', firebaseUser.uid);
      let userData;
      try {
        userData = await firebaseService.users.getById(firebaseUser.uid);
        console.log('📖 User data from Firestore:', userData ? 'Found' : 'Not found');
      } catch (error: any) {
        console.error('⚠️ Error getting user from Firestore:', error);
        console.error('⚠️ Error code:', error?.code);
        console.error('⚠️ Error message:', error?.message);
        userData = null;
      }
      
      if (!userData || isNewUser) {
        userData = {
          id: firebaseUser.uid,
          role: 'admin' as const,
          name: 'Administrador',
          email,
          profileImage: DEFAULT_PROFILE_IMAGE,
        } as User;
        console.log('💾 Creating admin user in Firestore with data:', JSON.stringify(userData));
        try {
          await firebaseService.users.create(userData);
          console.log('✅ Admin user created in Firestore successfully');
          
          const verifyUser = await firebaseService.users.getById(firebaseUser.uid);
          if (verifyUser) {
            console.log('✅ Verified user exists in Firestore:', verifyUser.name);
          } else {
            console.error('❌ User was not found after creation!');
            throw new Error('El perfil no se creó correctamente en la base de datos');
          }
        } catch (error: any) {
          console.error('❌ ERROR creating user in Firestore:', error);
          console.error('❌ Error code:', error?.code);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error stack:', error?.stack);
          throw new Error('No se pudo crear el perfil de usuario. Error: ' + (error?.message || 'desconocido'));
        }
      }

      setUser(userData);
      await saveUser(userData);
      await updateLastActivity();
      console.log('✅ Admin logged in successfully');
      return userData;
    } catch (error: any) {
      console.error('❌ Error logging in as admin:', error);
      throw new Error(error.message || 'Credenciales inválidas');
    }
  };

  const loginAsBranch = async (code: string, password: string) => {
    try {
      console.log('🔐 Logging in branch with code:', code);
      
      const storedBranches = await AsyncStorage.getItem(BRANCHES_KEY);
      if (!storedBranches) {
        throw new Error('No hay sucursales registradas en el sistema');
      }
      
      const branches: Branch[] = JSON.parse(storedBranches);
      const branch = branches.find(b => b.code === code && b.password === password);
      
      if (!branch) {
        throw new Error('Código o contraseña incorrectos');
      }
      
      console.log('🏢 Branch found:', branch.name);
      
      const email = `branch-${branch.code}@frychicken.local`;
      
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        console.log('✅ Branch signed in');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          console.log('📝 Creating branch account');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUser = userCredential.user;
        } else {
          throw error;
        }
      }

      const newUser: User = {
        id: firebaseUser.uid,
        role: 'branch',
        name: branch.name,
        branchId: branch.id,
        profileImage: DEFAULT_PROFILE_IMAGE,
      };
      
      await firebaseService.users.create(newUser);
      setUser(newUser);
      await saveUser(newUser);
      await updateLastActivity();
      console.log('✅ Logged in as branch:', branch.name, 'with branchId:', branch.id);
      return newUser;
    } catch (error) {
      console.error('❌ Error logging in as branch:', error);
      throw error;
    }
  };

  const loginAsDelivery = async (email: string, password: string) => {
    try {
      console.log('🔐 Logging in delivery with email:', email);
      
      if (!email || !email.includes('@')) {
        throw new Error('Por favor ingresa un correo electrónico válido');
      }
      
      const storedDeliveryUsers = await AsyncStorage.getItem(DELIVERY_USERS_KEY);
      if (!storedDeliveryUsers) {
        throw new Error('No hay repartidores registrados en el sistema');
      }
      
      const deliveryUsers: DeliveryUser[] = JSON.parse(storedDeliveryUsers);
      const delivery = deliveryUsers.find(
        d => d.email?.toLowerCase() === email.toLowerCase() && 
             d.password === password &&
             d.status === 'approved'
      );
      
      if (!delivery) {
        const pendingDelivery = deliveryUsers.find(
          d => d.email?.toLowerCase() === email.toLowerCase() && d.password === password
        );
        if (pendingDelivery) {
          throw new Error('Tu cuenta aún no ha sido aprobada. Por favor espera la aprobación de la sucursal.');
        }
        throw new Error('Correo o contraseña incorrectos');
      }
      
      console.log('🚚 Delivery user found:', delivery.name);
      
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        console.log('✅ Delivery signed in with Firebase');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          console.log('📝 Creating delivery Firebase account');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUser = userCredential.user;
        } else {
          throw error;
        }
      }

      const newUser: User = {
        id: firebaseUser.uid,
        role: 'delivery',
        name: delivery.name,
        email: delivery.email,
        phone: delivery.phone,
        branchId: delivery.branchId,
        profileImage: DEFAULT_PROFILE_IMAGE,
      };
      
      await firebaseService.users.create(newUser);
      setUser(newUser);
      await saveUser(newUser);
      await updateLastActivity();
      console.log('✅ Logged in as delivery:', delivery.name);
      return newUser;
    } catch (error) {
      console.error('❌ Error logging in as delivery:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      await saveUser(null);
      await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
      console.log('✅ Logged out');
    } catch (error) {
      console.error('❌ Error logging out:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      console.log('🗑️ Deleting user account:', user.id);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado en Firebase');
      }

      await firebaseService.users.delete(user.id);
      console.log('✅ User deleted from Firestore');

      if (user.role === 'customer') {
        try {
          const userPoints = await firebaseService.userPoints.getById(user.id);
          if (userPoints) {
            await firebaseService.userPoints.delete(user.id);
            console.log('✅ User points deleted');
          }
        } catch (error) {
          console.log('⚠️ No user points to delete or error deleting:', error);
        }
      }

      await firebaseDeleteUser(currentUser);
      console.log('✅ User deleted from Firebase Auth');

      setUser(null);
      await saveUser(null);
      
      if (user.role === 'customer') {
        await deleteBiometricCredentials('customer');
      }

      console.log('✅ Account deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      throw new Error(error.message || 'Error al eliminar la cuenta');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await saveUser(updatedUser);
    console.log('Profile updated:', updates);
    return updatedUser;
  };

  const saveBiometricCredentials = async (role: string, credentials: any) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`, JSON.stringify(credentials));
      } else {
        await SecureStore.setItemAsync(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`, JSON.stringify(credentials));
      }
      console.log('✅ Biometric credentials saved for role:', role);
    } catch (error) {
      console.error('❌ Error saving biometric credentials:', error);
      throw error;
    }
  };

  const getBiometricCredentials = async (role: string) => {
    try {
      let stored;
      if (Platform.OS === 'web') {
        stored = await AsyncStorage.getItem(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`);
      } else {
        stored = await SecureStore.getItemAsync(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`);
      }
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Error getting biometric credentials:', error);
      return null;
    }
  };

  const deleteBiometricCredentials = async (role: string) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`);
      } else {
        await SecureStore.deleteItemAsync(`${BIOMETRIC_CREDENTIALS_KEY}_${role}`);
      }
      console.log('✅ Biometric credentials deleted for role:', role);
    } catch (error) {
      console.error('❌ Error deleting biometric credentials:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      return false;
    }
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  };

  const authenticateWithBiometric = async () => {
    if (Platform.OS === 'web') {
      throw new Error('Autenticación biométrica no disponible en web');
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticar con huella digital',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
      });
      return result.success;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return false;
    }
  };

  const loginWithBiometric = async (role: string) => {
    try {
      const credentials = await getBiometricCredentials(role);
      if (!credentials) {
        throw new Error('No hay credenciales guardadas');
      }

      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        throw new Error('Autenticación biométrica fallida');
      }

      console.log('🔐 Biometric authentication successful, logging in with role:', role);

      let email: string;
      let password: string = credentials.password;

      switch (role) {
        case 'customer': {
          email = credentials.email;
          if (!email || !email.includes('@')) {
            throw new Error('Correo no válido');
          }
          break;
        }
        case 'admin':
          email = credentials.email;
          break;
        case 'branch':
          email = `branch-${credentials.code}@frychicken.local`;
          break;
        case 'delivery':
          email = credentials.email;
          break;
        default:
          throw new Error('Rol inválido');
      }

      console.log('🔥 Signing in with Firebase Auth:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('✅ Firebase Auth successful, uid:', firebaseUser.uid);

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📖 Getting user data from Firestore');
      const userData = await firebaseService.users.getById(firebaseUser.uid);
      
      if (!userData) {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      setUser(userData);
      await saveUser(userData);
      await updateLastActivity();
      console.log('✅ Logged in with biometric:', userData.name);
      return userData;
    } catch (error: any) {
      console.error('❌ Error logging in with biometric:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      console.log('🔑 Resetting password for:', email);

      const isValid = await firebaseService.passwordReset.verifyToken(email, token);
      if (!isValid) {
        throw new Error('Código inválido o expirado. Por favor solicita uno nuevo.');
      }

      const existingUser = await firebaseService.users.getByEmail(email);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      const { updatePassword } = await import('firebase/auth');
      if (!auth.currentUser) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, newPassword);
      }

      if (auth.currentUser && auth.currentUser.email === email) {
        await updatePassword(auth.currentUser, newPassword);
      } else {
        throw new Error('No se pudo actualizar la contraseña. Por favor intenta iniciar sesión primero.');
      }

      await firebaseService.passwordReset.deleteToken(email);
      console.log('✅ Password reset successfully');
    } catch (error: any) {
      console.error('❌ Error resetting password:', error);
      throw new Error(error.message || 'Error al restablecer la contraseña');
    }
  };

  const createAdminUser = async (name: string, email: string, password: string) => {
    try {
      if (!user || user.email !== 'frychickenhn@gmail.com') {
        throw new Error('Solo el administrador principal puede crear otros administradores');
      }

      console.log('👤 Creating new admin user:', email);

      if (!email || !email.includes('@')) {
        throw new Error('Por favor ingresa un correo electrónico válido');
      }

      if (!password || password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const existingUser = await firebaseService.users.getByEmail(email);
      if (existingUser) {
        throw new Error('Ya existe un usuario con este correo electrónico');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const newAdmin: User = {
        id: firebaseUser.uid,
        role: 'admin',
        name,
        email,
        profileImage: DEFAULT_PROFILE_IMAGE,
      };

      console.log('💾 Saving admin to Firestore:', newAdmin);
      await firebaseService.users.create(newAdmin);

      await firebaseSignOut(auth);
      
      if (user.email) {
        await signInWithEmailAndPassword(auth, user.email, 'currentPassword');
      }

      console.log('✅ Admin user created successfully:', name);
      return newAdmin;
    } catch (error: any) {
      console.error('❌ Error creating admin user:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este correo electrónico ya está registrado');
      }
      throw new Error(error.message || 'Error al crear usuario administrador');
    }
  };



  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    registerCustomer,
    loginAsCustomer,
    loginAsAdmin,
    loginAsBranch,
    loginAsDelivery,
    logout,
    deleteAccount,
    updateProfile,
    saveBiometricCredentials,
    getBiometricCredentials,
    deleteBiometricCredentials,
    checkBiometricAvailability,
    authenticateWithBiometric,
    loginWithBiometric,
    resetPassword,
    setSyncBranchesCallback,
    createAdminUser,
    updateLastActivity,
  };
});