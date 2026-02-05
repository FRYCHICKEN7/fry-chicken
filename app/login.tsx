import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { User, Building2, Truck, Shield, Eye, EyeOff, Mail, KeyRound, Fingerprint, UserPlus } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { UserRole } from "@/types";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

type LoginMode = UserRole;
type CustomerMode = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const { 
    registerCustomer,
    loginAsCustomer, 
    loginAsAdmin, 
    loginAsBranch, 
    loginWithEmail, // Añadido para delivery
    saveBiometricCredentials,
    getBiometricCredentials,
    checkBiometricAvailability,
    loginWithBiometric,
  } = useAuth();
  const [mode, setMode] = useState<LoginMode>("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);

  const [customerMode, setCustomerMode] = useState<CustomerMode>('login');
  const [customerForm, setCustomerForm] = useState({
    identityNumber: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
  });

  const [branchForm, setBranchForm] = useState({
    code: "",
    password: "",
  });

  const [deliveryForm, setDeliveryForm] = useState({
    email: "",
    password: "",
  });

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryRole, setRecoveryRole] = useState<LoginMode>("admin");

  const checkBiometric = useCallback(async () => {
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
    console.log('🔐 Biometric available:', available);
  }, [checkBiometricAvailability]);

  const checkSavedCredentials = useCallback(async () => {
    const credentials = await getBiometricCredentials(mode);
    setHasSavedCredentials(!!credentials);
    console.log('🔑 Has saved credentials for', mode, ':', !!credentials);
  }, [mode, getBiometricCredentials]);

  useEffect(() => {
    checkBiometric();
  }, [checkBiometric]);

  useEffect(() => {
    checkSavedCredentials();
  }, [checkSavedCredentials]);

  const handlePasswordRecovery = async () => {
    if (recoveryRole === 'customer' || recoveryRole === 'admin') {
      if (!recoveryEmail.trim()) {
        Alert.alert("Error", "Por favor ingresa tu correo electrónico");
        return;
      }

      try {
        console.log('📧 Enviando correo de recuperación a:', recoveryEmail);
        await sendPasswordResetEmail(auth, recoveryEmail.trim());
        setShowRecoveryModal(false);
        setRecoveryEmail("");
        Alert.alert(
          "Correo Enviado",
          "Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada y spam."
        );
      } catch (error: any) {
        console.error('❌ Error enviando correo:', error);
        let errorMessage = "No se pudo enviar el correo de recuperación";
        
        if (error.code === 'auth/user-not-found') {
          errorMessage = "No existe una cuenta con este correo electrónico";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "El correo electrónico no es válido";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Demasiados intentos. Por favor intenta más tarde";
        }
        
        Alert.alert("Error", errorMessage);
      }
      return;
    }
    
    if (recoveryRole === 'branch' || recoveryRole === 'delivery') {
      const message = recoveryRole === 'branch'
        ? "Por favor contacta al administrador para restablecer tu contraseña de sucursal."
        : "Por favor contacta a tu sucursal asignada o al administrador para restablecer tu contraseña.";
      
      Alert.alert("Recuperación de Contraseña", message);
      setShowRecoveryModal(false);
      setRecoveryEmail("");
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithBiometric(mode);
      if (mode === 'branch') {
        router.replace('/branch-orders' as any);
      } else if (mode === 'delivery') {
        router.replace('/delivery-orders' as any);
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo iniciar sesión con huella");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      let credentials: any = null;
      switch (mode) {
        case "customer":
          if (customerMode === 'register') {
            if (!customerForm.identityNumber || !customerForm.name || !customerForm.email || !customerForm.phone || !customerForm.password) {
              Alert.alert("Error", "Por favor completa todos los campos requeridos");
              return;
            }
            if (!acceptedPrivacyPolicy || !acceptedTerms) {
              Alert.alert("Error", "Debes aceptar la Política de Privacidad y los Términos y Condiciones para continuar");
              return;
            }
            await registerCustomer(customerForm.identityNumber, customerForm.name, customerForm.email, customerForm.phone, customerForm.password);
            credentials = { email: customerForm.email, password: customerForm.password };
          } else {
            if (!customerForm.email || !customerForm.password) {
              Alert.alert("Error", "Por favor completa todos los campos requeridos");
              return;
            }
            await loginAsCustomer(customerForm.email, customerForm.password);
            credentials = { email: customerForm.email, password: customerForm.password };
          }
          break;
        case "admin":
          if (!adminForm.email || !adminForm.password) {
            Alert.alert("Error", "Por favor completa todos los campos");
            return;
          }
          await loginAsAdmin(adminForm.email, adminForm.password);
          credentials = { email: adminForm.email, password: adminForm.password };
          break;
        case "branch":
          if (!branchForm.code || !branchForm.password) {
            Alert.alert("Error", "Por favor completa todos los campos");
            return;
          }
          await loginAsBranch(branchForm.code, branchForm.password);
          credentials = { code: branchForm.code, password: branchForm.password };
          break;
        case "delivery":
          // MODIFICADO: Ahora usa loginWithEmail como en el código 2
          if (!deliveryForm.email || !deliveryForm.password) {
            Alert.alert("Error", "Por favor completa todos los campos");
            return;
          }
          const result = await loginWithEmail(deliveryForm.email.trim(), deliveryForm.password);
          if (!result.success) {
            Alert.alert("Error", result.error || "Error al iniciar sesión");
            return;
          }
          credentials = { email: deliveryForm.email, password: deliveryForm.password };
          break;
      }

      if (saveCredentials && credentials && biometricAvailable) {
        try {
          await saveBiometricCredentials(mode, credentials);
          Alert.alert("Éxito", "Credenciales guardadas. Podrás usar tu huella la próxima vez.");
        } catch (error) {
          console.error('Error saving credentials:', error);
        }
      }

      if (mode === 'branch') {
        router.replace('/branch-orders' as any);
      } else if (mode === 'delivery') {
        router.replace('/delivery-orders' as any);
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const modeConfig = {
    customer: { icon: User, label: "Cliente", color: Colors.primary },
    admin: { icon: Shield, label: "Admin", color: Colors.accent },
    branch: { icon: Building2, label: "Sucursal", color: "#3B82F6" },
    delivery: { icon: Truck, label: "Delivery", color: Colors.success },
  };

  const renderForm = () => {
    switch (mode) {
      case "customer":
        return (
          <>
            <View style={styles.customerModeSelector}>
              <TouchableOpacity
                style={[styles.customerModeButton, customerMode === 'login' && styles.customerModeButtonActive]}
                onPress={() => setCustomerMode('login')}
              >
                <User size={18} color={customerMode === 'login' ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.customerModeText, customerMode === 'login' && styles.customerModeTextActive]}>Iniciar Sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customerModeButton, customerMode === 'register' && styles.customerModeButtonActive]}
                onPress={() => setCustomerMode('register')}
              >
                <UserPlus size={18} color={customerMode === 'register' ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.customerModeText, customerMode === 'register' && styles.customerModeTextActive]}>Registrarse</Text>
              </TouchableOpacity>
            </View>

            {customerMode === 'login' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo Electrónico *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={Colors.textMuted}
                  value={customerForm.email}
                  onChangeText={(text) =>
                    setCustomerForm({ ...customerForm, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DNI *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0801-1990-12345"
                  placeholderTextColor={Colors.textMuted}
                  value={customerForm.identityNumber}
                  onChangeText={(text) =>
                    setCustomerForm({ ...customerForm, identityNumber: text })
                  }
                  keyboardType="numeric"
                />
              </View>
            )}

            {customerMode === 'register' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre Completo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre"
                    placeholderTextColor={Colors.textMuted}
                    value={customerForm.name}
                    onChangeText={(text) =>
                      setCustomerForm({ ...customerForm, name: text })
                    }
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Electrónico *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={Colors.textMuted}
                    value={customerForm.email}
                    onChangeText={(text) =>
                      setCustomerForm({ ...customerForm, email: text })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Teléfono *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+504 9999-9999"
                    placeholderTextColor={Colors.textMuted}
                    value={customerForm.phone}
                    onChangeText={(text) =>
                      setCustomerForm({ ...customerForm, phone: text })
                    }
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  placeholderTextColor={Colors.textMuted}
                  value={customerForm.password}
                  onChangeText={(text) =>
                    setCustomerForm({ ...customerForm, password: text })
                  }
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {customerMode === 'register' && (
              <View style={styles.policiesContainer}>
                <TouchableOpacity
                  style={styles.policyCheckboxRow}
                  onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedPrivacyPolicy && styles.checkboxChecked]}>
                    {acceptedPrivacyPolicy && <View style={styles.checkboxInner} />}
                  </View>
                  <Text style={styles.policyText}>
                    Acepto la{' '}
                    <Link href="/privacy-policy" asChild>
                      <Text style={styles.policyLink}>Política de Privacidad</Text>
                    </Link>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.policyCheckboxRow}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && <View style={styles.checkboxInner} />}
                  </View>
                  <Text style={styles.policyText}>
                    Acepto los{' '}
                    <Link href="/terms-and-conditions" asChild>
                      <Text style={styles.policyLink}>Términos y Condiciones</Text>
                    </Link>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        );
      case "admin":
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@frychicken.com"
                placeholderTextColor={Colors.textMuted}
                value={adminForm.email}
                onChangeText={(text) => setAdminForm({ ...adminForm, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  placeholderTextColor={Colors.textMuted}
                  value={adminForm.password}
                  onChangeText={(text) => setAdminForm({ ...adminForm, password: text })}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        );
      case "branch":
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Código de Sucursal</Text>
              <TextInput
                style={styles.input}
                placeholder="SUC-001"
                placeholderTextColor={Colors.textMuted}
                value={branchForm.code}
                onChangeText={(text) => setBranchForm({ ...branchForm, code: text })}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  placeholderTextColor={Colors.textMuted}
                  value={branchForm.password}
                  onChangeText={(text) => setBranchForm({ ...branchForm, password: text })}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        );
      case "delivery":
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor={Colors.textMuted}
                value={deliveryForm.email}
                onChangeText={(text) =>
                  setDeliveryForm({ ...deliveryForm, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  placeholderTextColor={Colors.textMuted}
                  value={deliveryForm.password}
                  onChangeText={(text) =>
                    setDeliveryForm({ ...deliveryForm, password: text })
                  }
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.modeSelector}>
          {(Object.keys(modeConfig) as LoginMode[]).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;
            const isActive = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modeButton,
                  isActive && { backgroundColor: config.color + "20", borderColor: config.color },
                ]}
                onPress={() => setMode(m)}
              >
                <Icon size={20} color={isActive ? config.color : Colors.textMuted} />
                <Text
                  style={[
                    styles.modeButtonText,
                    isActive && { color: config.color },
                  ]}
                >
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.formContainer}>
          {renderForm()}
        </View>

        {biometricAvailable && !hasSavedCredentials && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.biometricCheckbox}
            onPress={() => setSaveCredentials(!saveCredentials)}
          >
            <View style={[styles.checkbox, saveCredentials && styles.checkboxChecked]}>
              {saveCredentials && <View style={styles.checkboxInner} />}
            </View>
            <Fingerprint size={18} color={Colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.biometricCheckboxText}>Guardar para usar huella digital</Text>
          </TouchableOpacity>
        )}

        {biometricAvailable && hasSavedCredentials && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.biometricButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Fingerprint size={22} color={Colors.secondary} />
            <Text style={styles.biometricButtonText}>Ingresar con Huella</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? (mode === "customer" && customerMode === 'register' ? "Registrando..." : "Ingresando...") : (mode === "customer" && customerMode === 'register' ? "Registrarse" : "Iniciar Sesión")}
          </Text>
        </TouchableOpacity>

        {mode === "customer" && (
          <>
            <Text style={styles.helperText}>
              {customerMode === 'register' ? 'Crea tu cuenta para realizar pedidos' : 'Ingresa con tu correo y contraseña'}
            </Text>
            {customerMode === 'login' && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => {
                  setRecoveryRole('customer');
                  setShowRecoveryModal(true);
                }}
              >
                <KeyRound size={16} color={Colors.textSecondary} />
                <Text style={styles.forgotPasswordText}>¿He olvidado la contraseña?</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {mode === "delivery" && (
          <TouchableOpacity
            style={styles.registerDeliveryButton}
            onPress={() => router.push("/delivery-register" as any)}
          >
            <Text style={styles.registerDeliveryText}>¿Quieres ser repartidor? Regístrate aquí</Text>
          </TouchableOpacity>
        )}

        {mode !== "customer" && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => {
              setRecoveryRole(mode);
              setShowRecoveryModal(true);
            }}
          >
            <KeyRound size={16} color={Colors.textSecondary} />
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showRecoveryModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
            <Text style={styles.modalSubtitle}>
              {recoveryRole === "customer" || recoveryRole === "admin"
                ? "Ingresa tu correo electrónico. Recibirás un correo con un enlace seguro para restablecer tu contraseña."
                : recoveryRole === "branch"
                ? "Contacta al administrador para recuperar tu acceso"
                : "Contacta a tu sucursal o administrador"}
            </Text>
            
            {(recoveryRole === "customer" || recoveryRole === "admin") && (
              <View style={styles.inputGroup}>
                <View style={styles.recoveryInputContainer}>
                  <Mail size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.recoveryInput}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={Colors.textMuted}
                    value={recoveryEmail}
                    onChangeText={setRecoveryEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRecoveryModal(false);
                  setRecoveryEmail("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handlePasswordRecovery}
              >
                <Text style={styles.modalConfirmText}>
                  {recoveryRole === "customer" || recoveryRole === "admin" ? "Enviar" : "Entendido"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  modeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modeButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
  registerDeliveryButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
  },
  registerDeliveryText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  forgotPasswordButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 16,
    gap: 8,
  },
  forgotPasswordText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  recoveryInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recoveryInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center' as const,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
  },
  modalConfirmText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  biometricButton: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 10,
    marginBottom: 12,
  },
  biometricButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  biometricCheckbox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  checkboxChecked: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '20',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: Colors.success,
  },
  biometricCheckboxText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  customerModeSelector: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
  },
  customerModeButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  customerModeButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  customerModeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  customerModeTextActive: {
    color: Colors.primary,
  },
  policiesContainer: {
    marginTop: 8,
    gap: 12,
  },
  policyCheckboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  policyLink: {
    color: Colors.primary,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
});
