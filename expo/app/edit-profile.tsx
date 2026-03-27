import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Camera, User, Phone, Mail, Check, Fingerprint, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { 
    user, 
    updateProfile, 
    saveBiometricCredentials, 
    getBiometricCredentials, 
    deleteBiometricCredentials,
    checkBiometricAvailability,
    authenticateWithBiometric,
  } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [credentialInput, setCredentialInput] = useState("");
  const [additionalInput, setAdditionalInput] = useState("");

  const checkBiometricStatus = useCallback(async () => {
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
    
    if (available && user) {
      const credentials = await getBiometricCredentials(user.role);
      setBiometricEnabled(!!credentials);
    }
  }, [checkBiometricAvailability, getBiometricCredentials, user]);

  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para cambiar la foto de perfil");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleEnableBiometric = async () => {
    if (!user) return;

    if (!credentialInput.trim() || (user.role !== 'customer' && !additionalInput.trim())) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        Alert.alert("Error", "Autenticación biométrica cancelada");
        return;
      }

      let credentials: any = {};
      switch (user.role) {
        case 'customer':
          credentials = {
            email: credentialInput.trim().toLowerCase(),
            name: user.name,
            phone: user.phone,
          };
          break;
        case 'admin':
          if (credentialInput.trim() !== 'frychickenhn@gmail.com' || additionalInput.trim() !== 'FRY2026') {
            Alert.alert("Error", "Credenciales incorrectas");
            return;
          }
          credentials = {
            email: credentialInput.trim(),
            password: additionalInput.trim(),
          };
          break;
        case 'branch':
          const storedBranchesData = await AsyncStorage.getItem('fry_chicken_branches');
          if (storedBranchesData) {
            const branchesData = JSON.parse(storedBranchesData);
            const branch = branchesData.find((b: any) => b.code === credentialInput.trim() && b.password === additionalInput.trim());
            if (!branch) {
              Alert.alert("Error", "Código o contraseña incorrectos");
              return;
            }
          } else {
            Alert.alert("Error", "No se encontraron sucursales en el sistema");
            return;
          }
          credentials = {
            code: credentialInput.trim(),
            password: additionalInput.trim(),
          };
          break;
        case 'delivery':
          const storedDeliveryUsers = await AsyncStorage.getItem('fry_chicken_delivery_users');
          if (storedDeliveryUsers) {
            const deliveryUsers = JSON.parse(storedDeliveryUsers);
            const delivery = deliveryUsers.find(
              (d: any) => d.name.toLowerCase().includes(credentialInput.toLowerCase()) && 
                   d.password === additionalInput.trim() &&
                   d.status === 'approved'
            );
            if (!delivery) {
              Alert.alert("Error", "Nombre o contraseña incorrectos");
              return;
            }
          } else {
            Alert.alert("Error", "No se encontraron repartidores en el sistema");
            return;
          }
          credentials = {
            firstName: credentialInput.trim(),
            password: additionalInput.trim(),
          };
          break;
      }

      await saveBiometricCredentials(user.role, credentials);
      setBiometricEnabled(true);
      setShowBiometricDialog(false);
      setCredentialInput("");
      setAdditionalInput("");
      Alert.alert("Éxito", "Huella digital registrada correctamente. Ahora puedes iniciar sesión con tu huella.");
    } catch (error: any) {
      console.error('Error enabling biometric:', error);
      Alert.alert("Error", error.message || "No se pudo registrar la huella digital");
    }
  };

  const handleDisableBiometric = async () => {
    if (!user) return;

    Alert.alert(
      "Desactivar huella",
      "¿Estás seguro de que deseas desactivar el inicio de sesión con huella?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            await deleteBiometricCredentials(user.role);
            setBiometricEnabled(false);
            Alert.alert("Huella desactivada", "El inicio de sesión con huella ha sido desactivado");
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre es requerido");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        profileImage,
      });
      Alert.alert("Éxito", "Perfil actualizado correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log("Error updating profile:", error);
      Alert.alert("Error", "No se pudo actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          <Image
            source={{ uri: profileImage || "https://frychickenhn.com/wp-content/uploads/2022/01/512.png" }}
            style={styles.avatar}
          />
          <View style={styles.cameraButton}>
            <Camera size={20} color={colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Toca para cambiar la foto</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          <View style={styles.inputContainer}>
            <User size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Teléfono</Text>
          <View style={styles.inputContainer}>
            <Phone size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+504 0000-0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Correo Electrónico</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {biometricAvailable && (
        <View style={styles.biometricSection}>
          <View style={styles.biometricHeader}>
            <View style={styles.biometricTitleRow}>
              <Fingerprint size={24} color={colors.primary} />
              <View style={styles.biometricTitleText}>
                <Text style={styles.biometricTitle}>Inicio de sesión con huella</Text>
                <Text style={styles.biometricSubtitle}>
                  {biometricEnabled 
                    ? "Activado - Inicia sesión rápidamente" 
                    : "Activa para iniciar sesión más rápido"}
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(value) => {
                if (value) {
                  setShowBiometricDialog(true);
                } else {
                  handleDisableBiometric();
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      )}

      {showBiometricDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <Fingerprint size={40} color={colors.primary} />
              <Text style={styles.dialogTitle}>Activar huella digital</Text>
              <Text style={styles.dialogMessage}>
                Ingresa tus credenciales para registrar tu huella
              </Text>
            </View>

            <View style={styles.dialogInputs}>
              {user?.role === 'customer' && (
                <>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Correo electrónico</Text>
                    <View style={styles.dialogInputContainer}>
                      <Mail size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={credentialInput}
                        onChangeText={setCredentialInput}
                        placeholder="correo@ejemplo.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Correo electrónico</Text>
                    <View style={styles.dialogInputContainer}>
                      <Mail size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={credentialInput}
                        onChangeText={setCredentialInput}
                        placeholder="correo@ejemplo.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Contraseña</Text>
                    <View style={styles.dialogInputContainer}>
                      <Lock size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={additionalInput}
                        onChangeText={setAdditionalInput}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {user?.role === 'branch' && (
                <>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Código de sucursal</Text>
                    <View style={styles.dialogInputContainer}>
                      <User size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={credentialInput}
                        onChangeText={setCredentialInput}
                        placeholder="Código"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Contraseña</Text>
                    <View style={styles.dialogInputContainer}>
                      <Lock size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={additionalInput}
                        onChangeText={setAdditionalInput}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {user?.role === 'delivery' && (
                <>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Primer nombre</Text>
                    <View style={styles.dialogInputContainer}>
                      <User size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={credentialInput}
                        onChangeText={setCredentialInput}
                        placeholder="Nombre"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.dialogInputGroup}>
                    <Text style={styles.dialogLabel}>Contraseña</Text>
                    <View style={styles.dialogInputContainer}>
                      <Lock size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.dialogInput}
                        value={additionalInput}
                        onChangeText={setAdditionalInput}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowBiometricDialog(false);
                  setCredentialInput("");
                  setAdditionalInput("");
                }}
              >
                <Text style={styles.dialogButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={handleEnableBiometric}
              >
                <Text style={styles.dialogButtonText}>Activar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Check size={20} color={colors.secondary} />
        <Text style={styles.saveButtonText}>
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    avatarSection: {
      alignItems: "center",
      paddingVertical: 32,
    },
    avatarContainer: {
      position: "relative",
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: colors.primary,
    },
    cameraButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.background,
    },
    avatarHint: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    form: {
      padding: 16,
      gap: 20,
    },
    inputGroup: {},
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.secondary,
    },
    bottomPadding: {
      height: 120,
    },
    biometricSection: {
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    biometricHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    biometricTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    biometricTitleText: {
      flex: 1,
    },
    biometricTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    biometricSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    dialogOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    dialog: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      width: "100%",
      maxWidth: 400,
    },
    dialogHeader: {
      alignItems: "center",
      marginBottom: 24,
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 8,
    },
    dialogMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    dialogInputs: {
      gap: 16,
      marginBottom: 24,
    },
    dialogInputGroup: {},
    dialogLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    dialogInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialogInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    dialogButtons: {
      flexDirection: "row",
      gap: 12,
    },
    dialogButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    dialogButtonCancel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialogButtonConfirm: {
      backgroundColor: colors.primary,
    },
    dialogButtonTextCancel: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    dialogButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.secondary,
    },
  });
