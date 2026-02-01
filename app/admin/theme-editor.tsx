import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Palette,
  Type,
  Check,
  RotateCcw,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { ThemeSettings } from "@/types";

const COLOR_PRESETS = [
  { name: "Fry Chicken", primary: "#FCBA1D", accent: "#D01714", success: "#21A118" },
  { name: "Ocean", primary: "#3B82F6", accent: "#EF4444", success: "#10B981" },
  { name: "Forest", primary: "#22C55E", accent: "#F97316", success: "#14B8A6" },
  { name: "Sunset", primary: "#F97316", accent: "#EC4899", success: "#84CC16" },
  { name: "Royal", primary: "#8B5CF6", accent: "#F43F5E", success: "#06B6D4" },
];

const FONT_SIZES = [
  { label: "Pequeño", value: "small" as const },
  { label: "Mediano", value: "medium" as const },
  { label: "Grande", value: "large" as const },
];

export default function ThemeEditorScreen() {
  const { colors } = useTheme();
  const { themeSettings, saveThemeSettings } = useData();
  const [settings, setSettings] = useState<ThemeSettings>(themeSettings);
  

  const handleSave = async () => {
    try {
      await saveThemeSettings(settings);
      Alert.alert("Éxito", "Configuración de tema guardada correctamente");
    } catch {
      Alert.alert("Error", "No se pudo guardar la configuración");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Restablecer Tema",
      "¿Deseas volver a la configuración por defecto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restablecer",
          onPress: () => {
            const defaultSettings: ThemeSettings = {
              primaryColor: "#FCBA1D",
              secondaryColor: "#000000",
              accentColor: "#D01714",
              successColor: "#21A118",
              backgroundColor: "#F5F5F5",
              surfaceColor: "#FFFFFF",
              textPrimaryColor: "#1A1A1A",
              textSecondaryColor: "#666666",
              buttonColor: "#000000",
              whatsappButtonColor: "#25D366",
              addToCartButtonColor: "#FCBA1D",
              addToCartTextColor: "#FFFFFF",
              fontFamily: "System",
              fontSize: "medium",
            };
            setSettings(defaultSettings);
          },
        },
      ]
    );
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setSettings({
      ...settings,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      successColor: preset.success,
    });
  };

  const updateColor = (field: keyof ThemeSettings, value: string) => {
    setSettings({ ...settings, [field]: value });
  };

  const styles = createStyles(colors);

  const ColorPicker = ({ label, field, value }: { label: string; field: keyof ThemeSettings; value: string }) => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.colorLabel}>{label}</Text>
      <View style={styles.colorRow}>
        <View style={[styles.colorPreview, { backgroundColor: value }]} />
        <TextInput
          style={styles.colorInput}
          value={value}
          onChangeText={(text) => updateColor(field, text)}
          placeholder="#000000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
      <View style={styles.quickColors}>
        {["#FCBA1D", "#D01714", "#21A118", "#3B82F6", "#8B5CF6", "#000000", "#FFFFFF"].map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.quickColorButton, { backgroundColor: color, borderColor: color === "#FFFFFF" ? colors.border : color }]}
            onPress={() => updateColor(field, color)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Editor de Tema" }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Palette size={24} color={colors.primary} />
          <Text style={styles.title}>Personalizar Tema</Text>
        </View>
        <Text style={styles.subtitle}>
          Configura los colores, fuentes y estilos de la aplicación
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Presets de Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.presetsRow}>
              {COLOR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={styles.presetCard}
                  onPress={() => applyPreset(preset)}
                >
                  <View style={styles.presetColors}>
                    <View style={[styles.presetColor, { backgroundColor: preset.primary }]} />
                    <View style={[styles.presetColor, { backgroundColor: preset.accent }]} />
                    <View style={[styles.presetColor, { backgroundColor: preset.success }]} />
                  </View>
                  <Text style={styles.presetName}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colores Principales</Text>
          <ColorPicker label="Color Primario" field="primaryColor" value={settings.primaryColor} />
          <ColorPicker label="Color Secundario" field="secondaryColor" value={settings.secondaryColor} />
          <ColorPicker label="Color de Acento" field="accentColor" value={settings.accentColor} />
          <ColorPicker label="Color de Éxito" field="successColor" value={settings.successColor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colores de Interfaz</Text>
          <ColorPicker label="Fondo" field="backgroundColor" value={settings.backgroundColor} />
          <ColorPicker label="Superficies" field="surfaceColor" value={settings.surfaceColor} />
          <ColorPicker label="Texto Principal" field="textPrimaryColor" value={settings.textPrimaryColor} />
          <ColorPicker label="Texto Secundario" field="textSecondaryColor" value={settings.textSecondaryColor} />
          <ColorPicker label="Botones" field="buttonColor" value={settings.buttonColor} />
          <ColorPicker label="Botón WhatsApp" field="whatsappButtonColor" value={settings.whatsappButtonColor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Botón Añadir al Carrito</Text>
          <ColorPicker label="Color del Botón" field="addToCartButtonColor" value={settings.addToCartButtonColor} />
          <ColorPicker label="Color del Texto" field="addToCartTextColor" value={settings.addToCartTextColor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipografía</Text>
          <View style={styles.inputGroup}>
            <Type size={20} color={colors.textSecondary} />
            <Text style={styles.inputLabel}>Tamaño de Fuente</Text>
          </View>
          <View style={styles.fontSizeSelector}>
            {FONT_SIZES.map((size) => (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.fontSizeOption,
                  settings.fontSize === size.value && styles.fontSizeOptionActive,
                ]}
                onPress={() => setSettings({ ...settings, fontSize: size.value })}
              >
                <Text
                  style={[
                    styles.fontSizeText,
                    settings.fontSize === size.value && styles.fontSizeTextActive,
                  ]}
                >
                  {size.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Vista Previa</Text>
          <View style={[styles.previewCard, { backgroundColor: settings.surfaceColor }]}>
            <View style={[styles.previewHeader, { backgroundColor: settings.primaryColor }]}>
              <Text style={[styles.previewHeaderText, { color: settings.secondaryColor }]}>
                Fry Chicken HN
              </Text>
            </View>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { color: settings.textPrimaryColor }]}>
                Combo Familiar
              </Text>
              <Text style={[styles.previewSubtitle, { color: settings.textSecondaryColor }]}>
                12 piezas de pollo crujiente
              </Text>
              <View style={styles.previewButtons}>
                <View style={[styles.previewButton, { backgroundColor: settings.successColor }]}>
                  <Text style={styles.previewButtonText}>Añadir</Text>
                </View>
                <View style={[styles.previewButton, { backgroundColor: settings.accentColor }]}>
                  <Text style={styles.previewButtonText}>Ver más</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RotateCcw size={20} color={colors.textSecondary} />
            <Text style={styles.resetButtonText}>Restablecer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Check size={20} color={colors.secondary} />
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 20,
    },
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    presetsRow: {
      flexDirection: "row",
      gap: 12,
    },
    presetCard: {
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      minWidth: 90,
    },
    presetColors: {
      flexDirection: "row",
      gap: 4,
      marginBottom: 8,
    },
    presetColor: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    presetName: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    colorPickerContainer: {
      marginBottom: 16,
    },
    colorLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    colorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    colorPreview: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    colorInput: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "600" as const,
    },
    quickColors: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    quickColorButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
    },
    inputGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    fontSizeSelector: {
      flexDirection: "row",
      gap: 10,
    },
    fontSizeOption: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    fontSizeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    fontSizeText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    fontSizeTextActive: {
      color: colors.primary,
    },
    previewSection: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    previewCard: {
      borderRadius: 16,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    previewHeader: {
      padding: 16,
      alignItems: "center",
    },
    previewHeaderText: {
      fontSize: 18,
      fontWeight: "800" as const,
    },
    previewContent: {
      padding: 16,
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      marginBottom: 4,
    },
    previewSubtitle: {
      fontSize: 13,
      marginBottom: 12,
    },
    previewButtons: {
      flexDirection: "row",
      gap: 10,
    },
    previewButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    previewButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600" as const,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    resetButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      gap: 8,
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      gap: 8,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.secondary,
    },
    bottomPadding: {
      height: 40,
    },
  });
