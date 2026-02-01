import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, ArrowLeft } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const { registerCustomer } = useAuth();
  const [identityNumber, setIdentityNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!identityNumber.trim() || !name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (!acceptedPrivacyPolicy || !acceptedTerms) {
      Alert.alert(
        "Error",
        "Debes aceptar la Política de Privacidad y los Términos y Condiciones para continuar"
      );
      return;
    }

    setIsLoading(true);
    try {
      await registerCustomer(identityNumber.trim(), name.trim(), email.trim(), phone.trim(), password);
      Alert.alert(
        "Registro Exitoso",
        "Tu cuenta ha sido creada exitosamente",
        [
          {
            text: "Continuar",
            onPress: () => router.replace("/cart" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear la cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>
              Completa tus datos para crear tu cuenta
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DNI *</Text>
              <View style={styles.inputContainer}>
                <CreditCard size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="0801-1990-12345"
                  placeholderTextColor={Colors.textMuted}
                  value={identityNumber}
                  onChangeText={setIdentityNumber}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico *</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teléfono *</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="+504 9999-9999"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña *</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            <View style={styles.policiesContainer}>
              <TouchableOpacity
                style={styles.policyCheckboxRow}
                onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    acceptedPrivacyPolicy && styles.checkboxChecked,
                  ]}
                >
                  {acceptedPrivacyPolicy && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.policyText}>
                  Acepto la{" "}
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
                <View
                  style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
                >
                  {acceptedTerms && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.policyText}>
                  Acepto los{" "}
                  <Link href="/terms-and-conditions" asChild>
                    <Text style={styles.policyLink}>Términos y Condiciones</Text>
                  </Link>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? "Creando cuenta..." : "CREAR CUENTA"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
  },
  policiesContainer: {
    gap: 16,
    marginTop: 8,
  },
  policyCheckboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "20",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  policyLink: {
    color: Colors.primary,
    fontWeight: "600" as const,
    textDecorationLine: "underline" as const,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
});
