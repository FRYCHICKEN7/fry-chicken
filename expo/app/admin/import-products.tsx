import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  FileJson,
  FileSpreadsheet,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { ImportLog } from "@/types";

export default function ImportProductsScreen() {
  const { colors } = useTheme();
  const { products, categories, addProduct, updateProduct } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showWooModal, setShowWooModal] = useState(false);
  const [duplicates, setDuplicates] = useState<{ name: string; existingPrice: number; newPrice: number; productData: any }[]>([]);
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  const handlePickJSON = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      setIsLoading(true);
      
      const response = await fetch(file.uri);
      const text = await response.text();
      const data = JSON.parse(text);

      await processImportData(data, "json");
    } catch (error) {
      console.error("Error importing JSON:", error);
      Alert.alert("Error", "No se pudo leer el archivo JSON. Verifica el formato.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickExcel = async () => {
    Alert.alert(
      "Formato Excel",
      "El archivo debe ser CSV con columnas: Nombre, Categoría, Precio, Descripción, Imagen (URL)\n\nSeparador: coma (,)",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", onPress: pickCSV },
      ]
    );
  };

  const pickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      setIsLoading(true);
      
      const response = await fetch(file.uri);
      const text = await response.text();
      
      const lines = text.split("\n").filter(line => line.trim());
      
      const products = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        if (values.length >= 4) {
          products.push({
            name: values[0] || `Producto ${i}`,
            category: values[1] || "General",
            price: parseFloat(values[2]) || 0,
            description: values[3] || "",
            image: values[4] || "https://via.placeholder.com/400",
          });
        }
      }

      await processImportData(products, "excel");
    } catch (error) {
      console.error("Error importing CSV:", error);
      Alert.alert("Error", "No se pudo leer el archivo CSV. Verifica el formato.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWooCommerceImport = () => {
    setShowWooModal(true);
  };

  const processWooCommerce = async () => {
    if (!wooUrl || !wooKey || !wooSecret) {
      Alert.alert("Error", "Completa todos los campos de WooCommerce");
      return;
    }

    setIsLoading(true);
    setShowWooModal(false);

    try {
      const credentials = `${wooKey}:${wooSecret}`;
      const base64Credentials = btoa(credentials);
      const url = `${wooUrl}/wp-json/wc/v3/products?per_page=100`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${base64Credentials}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al conectar con WooCommerce");
      }

      const wooProducts = await response.json();
      
      const products = wooProducts.map((p: any) => ({
        name: p.name,
        category: p.categories?.[0]?.name || "General",
        price: parseFloat(p.price) || 0,
        description: p.short_description?.replace(/<[^>]*>/g, "") || p.description?.replace(/<[^>]*>/g, "") || "",
        image: p.images?.[0]?.src || "https://via.placeholder.com/400",
      }));

      await processImportData(products, "woocommerce");
    } catch (error) {
      console.error("Error importing from WooCommerce:", error);
      Alert.alert("Error", "No se pudo conectar con WooCommerce. Verifica las credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  const processImportData = async (data: any[], source: "excel" | "json" | "woocommerce") => {
    const errors: string[] = [];
    const duplicatesFound: { name: string; existingPrice: number; newPrice: number; productData: any }[] = [];
    let successCount = 0;

    for (const item of data) {
      if (!item.name || !item.price) {
        errors.push(`Producto sin nombre o precio: ${JSON.stringify(item)}`);
        continue;
      }

      const existingProduct = products.find(p => 
        p.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingProduct && existingProduct.price !== item.price) {
        duplicatesFound.push({
          name: item.name,
          existingPrice: existingProduct.price,
          newPrice: item.price,
          productData: { ...item, existingId: existingProduct.id },
        });
      } else if (!existingProduct) {
        const categoryName = item.category || "General";
        let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        
        if (!category) {
          category = categories[0];
        }

        try {
          await addProduct({
            name: item.name,
            description: item.description || "",
            price: item.price,
            image: item.image || "https://via.placeholder.com/400",
            categoryId: category.id,
            isCombo: false,
            available: true,
          });
          successCount++;
        } catch (error) {
          errors.push(`Error al agregar ${item.name}: ${error}`);
        }
      } else {
        successCount++;
      }
    }

    const log: ImportLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      source,
      totalProducts: data.length,
      successCount,
      errorCount: errors.length,
      duplicateCount: duplicatesFound.length,
      errors,
      duplicates: duplicatesFound.map(d => ({
        name: d.name,
        existingPrice: d.existingPrice,
        newPrice: d.newPrice,
      })),
    };

    setImportLog(log);

    if (duplicatesFound.length > 0) {
      setDuplicates(duplicatesFound);
      setShowDuplicateModal(true);
    } else {
      setShowLogModal(true);
    }
  };

  const handleDuplicateDecision = async (duplicate: any, keepNew: boolean) => {
    if (keepNew) {
      const categoryName = duplicate.productData.category || "General";
      let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!category) {
        category = categories[0];
      }

      await updateProduct(duplicate.productData.existingId, {
        price: duplicate.newPrice,
        description: duplicate.productData.description || undefined,
        image: duplicate.productData.image || undefined,
      });
    }

    setDuplicates(prev => prev.filter(d => d.name !== duplicate.name));

    if (duplicates.length === 1) {
      setShowDuplicateModal(false);
      setShowLogModal(true);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <AlertTriangle size={24} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Importación de Productos</Text>
              <Text style={styles.infoText}>
                Soporta Excel (CSV), JSON y WooCommerce. Los productos duplicados con precios diferentes requerirán confirmación.
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handlePickExcel}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.success + "20" }]}>
                <FileSpreadsheet size={32} color={colors.success} />
              </View>
              <Text style={styles.optionTitle}>Excel / CSV</Text>
              <Text style={styles.optionDescription}>
                Formato: Nombre, Categoría, Precio, Descripción, Imagen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={handlePickJSON}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
                <FileJson size={32} color={colors.primary} />
              </View>
              <Text style={styles.optionTitle}>Archivo JSON</Text>
              <Text style={styles.optionDescription}>
                Array de objetos con propiedades: name, category, price, description, image
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleWooCommerceImport}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: "#7F54B3" + "20" }]}>
                <Globe size={32} color="#7F54B3" />
              </View>
              <Text style={styles.optionTitle}>WooCommerce</Text>
              <Text style={styles.optionDescription}>
                Conecta con tu tienda WooCommerce usando API REST
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Procesando importación...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showDuplicateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Productos Duplicados</Text>
              <TouchableOpacity onPress={() => setShowDuplicateModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Se encontraron productos existentes con precios diferentes. ¿Qué precio deseas mantener?
            </Text>

            <ScrollView style={styles.duplicatesList}>
              {duplicates.map((dup) => (
                <View key={dup.name} style={styles.duplicateCard}>
                  <Text style={styles.duplicateName}>{dup.name}</Text>
                  <View style={styles.priceCompareContainer}>
                    <View style={styles.priceOption}>
                      <Text style={styles.priceLabel}>Precio Actual</Text>
                      <Text style={styles.priceValue}>L. {dup.existingPrice.toFixed(2)}</Text>
                      <TouchableOpacity
                        style={[styles.priceButton, { backgroundColor: colors.accent }]}
                        onPress={() => handleDuplicateDecision(dup, false)}
                      >
                        <Text style={styles.priceButtonText}>Mantener</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priceOption}>
                      <Text style={styles.priceLabel}>Precio Nuevo</Text>
                      <Text style={styles.priceValue}>L. {dup.newPrice.toFixed(2)}</Text>
                      <TouchableOpacity
                        style={[styles.priceButton, { backgroundColor: colors.success }]}
                        onPress={() => handleDuplicateDecision(dup, true)}
                      >
                        <Text style={styles.priceButtonText}>Actualizar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWooModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conectar WooCommerce</Text>
              <TouchableOpacity onPress={() => setShowWooModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL de la Tienda</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://mitienda.com"
                  placeholderTextColor={colors.textMuted}
                  value={wooUrl}
                  onChangeText={setWooUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Consumer Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ck_..."
                  placeholderTextColor={colors.textMuted}
                  value={wooKey}
                  onChangeText={setWooKey}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Consumer Secret</Text>
                <TextInput
                  style={styles.input}
                  placeholder="cs_..."
                  placeholderTextColor={colors.textMuted}
                  value={wooSecret}
                  onChangeText={setWooSecret}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: colors.primary }]}
                onPress={processWooCommerce}
              >
                <Text style={styles.connectButtonText}>Importar Productos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resultado de Importación</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {importLog && (
              <View style={styles.logContainer}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total de Productos:</Text>
                  <Text style={styles.statValue}>{importLog.totalProducts}</Text>
                </View>
                <View style={[styles.statRow, { backgroundColor: colors.success + "20" }]}>
                  <View style={styles.statIconLabel}>
                    <CheckCircle size={20} color={colors.success} />
                    <Text style={[styles.statLabel, { color: colors.success }]}>Importados:</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {importLog.successCount}
                  </Text>
                </View>
                <View style={[styles.statRow, { backgroundColor: colors.accent + "20" }]}>
                  <View style={styles.statIconLabel}>
                    <XCircle size={20} color={colors.accent} />
                    <Text style={[styles.statLabel, { color: colors.accent }]}>Errores:</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.accent }]}>
                    {importLog.errorCount}
                  </Text>
                </View>
                <View style={[styles.statRow, { backgroundColor: colors.primary + "20" }]}>
                  <View style={styles.statIconLabel}>
                    <AlertTriangle size={20} color={colors.primary} />
                    <Text style={[styles.statLabel, { color: colors.primary }]}>Duplicados:</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {importLog.duplicateCount}
                  </Text>
                </View>

                {importLog.errors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    <Text style={styles.errorsTitle}>Detalles de Errores:</Text>
                    <ScrollView style={styles.errorsList}>
                      {importLog.errors.map((error, index) => (
                        <Text key={index} style={styles.errorText}>
                          • {error}
                        </Text>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowLogModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    infoBox: {
      flexDirection: "row",
      backgroundColor: colors.primary + "15",
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      gap: 12,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    optionsContainer: {
      gap: 16,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    optionTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    loadingContainer: {
      alignItems: "center",
      marginTop: 40,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    duplicatesList: {
      maxHeight: 400,
    },
    duplicateCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    duplicateName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    priceCompareContainer: {
      flexDirection: "row",
      gap: 12,
    },
    priceOption: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    priceLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    priceValue: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    priceButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    priceButtonText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.white,
    },
    formContainer: {
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    connectButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
    connectButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.white,
    },
    logContainer: {
      gap: 12,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    statIconLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "600" as const,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    errorsContainer: {
      marginTop: 12,
      gap: 8,
    },
    errorsTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    errorsList: {
      maxHeight: 150,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
    },
    errorText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    closeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
    closeButtonText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.white,
    },
  });
