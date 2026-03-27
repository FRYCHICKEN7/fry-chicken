import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Megaphone,
  Image as ImageIcon,
  Check,
  Trash2,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { MarketingPopup } from "@/types";

export default function MarketingPopupScreen() {
  const { colors } = useTheme();
  const { marketingPopup, saveMarketingPopup, products } = useData();
  const [popup, setPopup] = useState<MarketingPopup | null>(marketingPopup);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    marketingPopup?.productId || ""
  );

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPopup({
        id: popup?.id || Date.now().toString(),
        image: result.assets[0].uri,
        productId: selectedProductId,
        isActive: popup?.isActive ?? true,
        displayDuration: popup?.displayDuration ?? 4,
      });
    }
  };

  const handleSave = async () => {
    if (!popup?.image) {
      Alert.alert("Error", "Por favor selecciona una imagen");
      return;
    }

    if (!selectedProductId) {
      Alert.alert("Error", "Por favor selecciona un producto");
      return;
    }

    try {
      await saveMarketingPopup({
        ...popup,
        productId: selectedProductId,
      });
      Alert.alert("Éxito", "Popup de marketing guardado correctamente");
    } catch {
      Alert.alert("Error", "No se pudo guardar el popup");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Popup",
      "¿Estás seguro de eliminar el popup de marketing?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await saveMarketingPopup(null);
            setPopup(null);
            setSelectedProductId("");
          },
        },
      ]
    );
  };

  const toggleActive = () => {
    if (popup) {
      setPopup({ ...popup, isActive: !popup.isActive });
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Marketing Popup" }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Megaphone size={24} color={colors.primary} />
          <Text style={styles.title}>Popup de Marketing</Text>
        </View>
        <Text style={styles.subtitle}>
          Configura una imagen promocional que aparecerá al iniciar la app
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
          <Text style={styles.infoText}>
            • La imagen aparecerá al abrir la aplicación{"\n"}
            • Se cerrará automáticamente después de 4 segundos{"\n"}
            • El cliente puede presionar para ver el producto{"\n"}
            • Puede cerrar manualmente con el botón X
          </Text>
        </View>

        {popup?.isActive !== undefined && (
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Popup Activo</Text>
              <Text style={styles.toggleSubtitle}>
                {popup.isActive ? "Se mostrará al abrir la app" : "No se mostrará"}
              </Text>
            </View>
            <Switch
              value={popup.isActive}
              onValueChange={toggleActive}
              trackColor={{ false: colors.surfaceLight, true: colors.success + "50" }}
              thumbColor={popup.isActive ? colors.success : colors.textMuted}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagen Promocional</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {popup?.image ? (
              <Image source={{ uri: popup.image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <ImageIcon size={48} color={colors.textMuted} />
                <Text style={styles.imagePlaceholderText}>
                  Toca para seleccionar imagen
                </Text>
                <Text style={styles.imagePlaceholderHint}>
                  Recomendado: 16:9 (1920x1080)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Producto Vinculado</Text>
          <Text style={styles.sectionSubtitle}>
            Cuando el cliente presione la imagen, verá este producto
          </Text>

          {selectedProduct && (
            <View style={styles.selectedProduct}>
              <Image
                source={{ uri: selectedProduct.image }}
                style={styles.selectedProductImage}
              />
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductName}>
                  {selectedProduct.name}
                </Text>
                <Text style={styles.selectedProductPrice}>
                  L. {selectedProduct.price.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProductId("")}
                style={styles.removeButton}
              >
                <Trash2 size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productsList}
          >
            {products.slice(0, 15).map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  selectedProductId === product.id && styles.productCardSelected,
                ]}
                onPress={() => setSelectedProductId(product.id)}
              >
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                {selectedProductId === product.id && (
                  <View style={styles.selectedBadge}>
                    <Check size={14} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.actions}>
          {popup && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={20} color={colors.accent} />
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, !popup && { flex: 1 }]}
            onPress={handleSave}
          >
            <Check size={20} color={colors.secondary} />
            <Text style={styles.saveButtonText}>Guardar Popup</Text>
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
    infoCard: {
      backgroundColor: colors.primary + "15",
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 16,
      borderRadius: 16,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primary,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    toggleCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
    },
    toggleInfo: {
      flex: 1,
    },
    toggleTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    toggleSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    imagePicker: {
      borderRadius: 16,
      overflow: "hidden",
    },
    previewImage: {
      width: "100%",
      height: 200,
      borderRadius: 16,
    },
    imagePlaceholder: {
      height: 200,
      backgroundColor: colors.surfaceLight,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    imagePlaceholderText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginTop: 12,
    },
    imagePlaceholderHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    selectedProduct: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    selectedProductImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
    },
    selectedProductInfo: {
      flex: 1,
      marginLeft: 12,
    },
    selectedProductName: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    selectedProductPrice: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primary,
      marginTop: 2,
    },
    removeButton: {
      padding: 8,
    },
    productsList: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    productCard: {
      width: 100,
      marginRight: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      overflow: "hidden",
    },
    productCardSelected: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    productImage: {
      width: 100,
      height: 80,
    },
    productName: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      padding: 8,
    },
    selectedBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: colors.primary,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    deleteButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.accent + "15",
      gap: 8,
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.accent,
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
