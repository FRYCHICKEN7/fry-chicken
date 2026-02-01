import { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { User, Phone } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { firebaseService } from "@/services/firebase-service";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { userId, name, email } = useLocalSearchParams<{ userId: string; name: string; email: string }>();
  const { updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    identityNumber: "",
    phone: "",
  });

  const handleComplete = async () => {
    if (!form.identityNumber.trim() || !form.phone.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);
    try {
      console.log('📝 Completing profile for user:', userId);
      
      const updates = {
        identityNumber: form.identityNumber,
        phone: form.phone,
      };

      await firebaseService.users.update(userId, updates);
      console.log('✅ Profile completed in Firebase');

      await updateProfile(updates);
      console.log('✅ Profile updated in local state');

      Alert.alert(
        "¡Perfil Completado!",
        "Tu información ha sido guardada exitosamente",
        [
          {
            text: "Continuar",
            onPress: () => router.replace("/"),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error completing profile:', error);
      Alert.alert("Error", error.message || "No se pudo guardar la información");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <User size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Completa tu Perfil</Text>
          <Text style={styles.subtitle}>
            Para continuar, necesitamos algunos datos adicionales
          </Text>
          <View style={styles.userInfoCard}>
            <Text style={styles.userInfoLabel}>Nombre:</Text>
            <Text style={styles.userInfoValue}>{name}</Text>
            <Text style={styles.userInfoLabel}>Correo:</Text>
            <Text style={styles.userInfoValue}>{email}</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DNI *</Text>
            <View style={styles.inputWithIcon}>
              <User size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="0801-1990-12345"
                placeholderTextColor={Colors.textMuted}
                value={form.identityNumber}
                onChangeText={(text) =>
                  setForm({ ...form, identityNumber: text })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="+504 9999-9999"
                placeholderTextColor={Colors.textMuted}
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={styles.helperText}>
            Esta información es necesaria para procesar tus pedidos
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.completeButton, isLoading && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text style={styles.completeButtonText}>
            {isLoading ? "Guardando..." : "Completar Registro"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  userInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userInfoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    fontWeight: "600",
  },
  userInfoValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
});
