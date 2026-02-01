import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Coins, Check } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";

export default function PointsSettingsScreen() {
  const { colors } = useTheme();
  const { pointsSettings, savePointsSettings, categories } = useData();
  const [enabled, setEnabled] = useState(pointsSettings.enabled);
  const [conversionRate, setConversionRate] = useState(pointsSettings.conversionRate.toString());
  const [redeemableCategories, setRedeemableCategories] = useState<string[]>(pointsSettings.redeemableCategories);

  const handleSave = async () => {
    const rate = parseInt(conversionRate, 10);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Error", "La tasa de conversión debe ser un número válido mayor a 0");
      return;
    }

    try {
      await savePointsSettings({
        enabled,
        conversionRate: rate,
        redeemableCategories,
      });
      Alert.alert("Éxito", "Configuración de puntos guardada correctamente");
    } catch {
      Alert.alert("Error", "No se pudo guardar la configuración");
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (redeemableCategories.includes(categoryId)) {
      setRedeemableCategories(redeemableCategories.filter(id => id !== categoryId));
    } else {
      setRedeemableCategories([...redeemableCategories, categoryId]);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Sistema de Puntos" }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Coins size={24} color={colors.primary} />
          <Text style={styles.title}>Configurar Puntos</Text>
        </View>
        <Text style={styles.subtitle}>
          Configura el sistema de puntos y recompensas para clientes
        </Text>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Sistema de Puntos</Text>
              <Text style={styles.switchDescription}>
                Activa o desactiva el sistema de puntos
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primary + "40" }}
              thumbColor={enabled ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasa de Conversión</Text>
          <Text style={styles.sectionDescription}>
            Define cuántos puntos equivalen a 1 Lempira para canjear por productos
          </Text>
          <View style={styles.conversionCard}>
            <TextInput
              style={styles.conversionInput}
              value={conversionRate}
              onChangeText={setConversionRate}
              placeholder="10"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.conversionText}>puntos = 1 LPS</Text>
          </View>
          <Text style={styles.exampleText}>
            💡 Valor recomendado: 10 puntos = 1 LPS{"\n"}
            Ejemplo: Producto de L 154 = {(154 * (parseInt(conversionRate) || 10)).toLocaleString()} puntos requeridos
          </Text>
          {conversionRate !== "10" && (
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => setConversionRate("10")}
            >
              <Text style={styles.resetButtonText}>Restablecer a valor recomendado (10)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cómo Ganar Puntos</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Los clientes ganan 1 punto por cada lempira gastado{"\n"}
              • Los puntos se acreditan automáticamente cuando el pedido es entregado{"\n"}
              • Los puntos se sincronizan con Firebase{"\n"}
              • Los puntos acumulados pueden canjearse por productos de categorías permitidas
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías Canjeables por Puntos</Text>
          <Text style={styles.sectionDescription}>
            Selecciona las categorías donde los clientes pueden canjear sus puntos por productos
          </Text>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No hay categorías disponibles</Text>
          ) : (
            categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  redeemableCategories.includes(category.id) && styles.categoryCardActive,
                ]}
                onPress={() => toggleCategory(category.id)}
              >
                <Text style={[
                  styles.categoryName,
                  redeemableCategories.includes(category.id) && styles.categoryNameActive,
                ]}>
                  {category.name}
                </Text>
                {redeemableCategories.includes(category.id) && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
          {redeemableCategories.length === 0 && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                ⚠️ Selecciona al menos una categoría para permitir que los clientes puedan canjear puntos por productos
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Guardar Configuración</Text>
        </TouchableOpacity>

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
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    switchLabel: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    switchDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    conversionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 16,
    },
    conversionInput: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: colors.primary,
      minWidth: 80,
      textAlign: "center",
    },
    conversionText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    exampleText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 12,
      fontStyle: "italic" as const,
      lineHeight: 18,
    },
    resetButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.primary + "15",
      borderRadius: 8,
      alignItems: "center",
    },
    resetButtonText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    infoCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 16,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    categoryCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    categoryCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    categoryName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    categoryNameActive: {
      color: colors.primary,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: 20,
    },
    warningCard: {
      backgroundColor: colors.accent + "15",
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    warningText: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: "600" as const,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      marginHorizontal: 16,
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
