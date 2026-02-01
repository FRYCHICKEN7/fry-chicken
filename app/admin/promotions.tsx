import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
} from "react-native";
import {
  Plus,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Check,
  ShoppingCart,
  Tag,
  Package,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { Promotion } from "@/types";

export default function PromotionsScreen() {
  const { colors } = useTheme();
  const { promotions, products, categories, addPromotion, updatePromotion, deletePromotion } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    image: "",
    title: "",
    action: "product" as "cart" | "category" | "product",
    targetId: "",
  });

  const resetForm = () => {
    setFormData({
      image: "",
      title: "",
      action: "product",
      targetId: "",
    });
    setEditingPromotion(null);
  };

  const handleOpenModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        image: promotion.image,
        title: promotion.title,
        action: promotion.action,
        targetId: promotion.targetId || "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

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
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Por favor ingresa un título para la promoción");
      return;
    }

    if (!formData.image) {
      Alert.alert("Error", "Por favor selecciona una imagen");
      return;
    }

    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, formData);
        Alert.alert("Éxito", "Promoción actualizada correctamente");
      } else {
        await addPromotion(formData);
        Alert.alert("Éxito", "Promoción agregada correctamente");
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.log("Error saving promotion:", error);
      Alert.alert("Error", "No se pudo guardar la promoción");
    }
  };

  const handleDelete = (promotion: Promotion) => {
    Alert.alert(
      "Eliminar Promoción",
      `¿Estás seguro de eliminar "${promotion.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deletePromotion(promotion.id);
          },
        },
      ]
    );
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "cart":
        return "Ir al carrito";
      case "category":
        return "Ver categoría";
      case "product":
        return "Ver producto";
      default:
        return action;
    }
  };

  const getTargetName = (action: string, targetId?: string) => {
    if (!targetId) return "";
    if (action === "category") {
      const category = categories.find(c => c.id === targetId);
      return category?.name || "";
    }
    if (action === "product") {
      const product = products.find(p => p.id === targetId);
      return product?.name || "";
    }
    return "";
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Promociones</Text>
          <Text style={styles.subtitle}>
            Gestiona banners y promociones del carrusel
          </Text>
        </View>

        {promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <ImageIcon size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin promociones</Text>
            <Text style={styles.emptySubtitle}>
              Agrega promociones para mostrar en el carrusel
            </Text>
          </View>
        ) : (
          <View style={styles.promotionsList}>
            {promotions.map((promotion) => (
              <View key={promotion.id} style={styles.promotionCard}>
                <Image 
                  source={{ uri: promotion.image }} 
                  style={styles.promotionImage} 
                  resizeMode="cover" 
                />
                <View style={styles.promotionInfo}>
                  <Text style={styles.promotionTitle}>{promotion.title}</Text>
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {getActionLabel(promotion.action)}
                      {promotion.targetId && `: ${getTargetName(promotion.action, promotion.targetId)}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.promotionActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleOpenModal(promotion)}
                  >
                    <Edit2 size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(promotion)}
                  >
                    <Trash2 size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleOpenModal()}
      >
        <Plus size={24} color={colors.secondary} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                {formData.image ? (
                  <Image 
                    source={{ uri: formData.image }} 
                    style={styles.previewImage} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ImageIcon size={40} color={colors.textMuted} />
                    <Text style={styles.imagePlaceholderText}>Seleccionar imagen</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Título de la promoción</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Ej: Martes de Locura"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Acción al presionar</Text>
                <View style={styles.actionSelector}>
                  <TouchableOpacity
                    style={[
                      styles.actionOption,
                      formData.action === "cart" && styles.actionOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, action: "cart", targetId: "" })}
                  >
                    <ShoppingCart size={20} color={formData.action === "cart" ? colors.primary : colors.textMuted} />
                    <Text style={[styles.actionOptionText, formData.action === "cart" && styles.actionOptionTextSelected]}>
                      Carrito
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionOption,
                      formData.action === "category" && styles.actionOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, action: "category", targetId: "" })}
                  >
                    <Tag size={20} color={formData.action === "category" ? colors.primary : colors.textMuted} />
                    <Text style={[styles.actionOptionText, formData.action === "category" && styles.actionOptionTextSelected]}>
                      Categoría
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionOption,
                      formData.action === "product" && styles.actionOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, action: "product", targetId: "" })}
                  >
                    <Package size={20} color={formData.action === "product" ? colors.primary : colors.textMuted} />
                    <Text style={[styles.actionOptionText, formData.action === "product" && styles.actionOptionTextSelected]}>
                      Producto
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.action === "category" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selecciona categoría</Text>
                  <View style={styles.targetList}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.targetItem,
                          formData.targetId === category.id && styles.targetItemSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, targetId: category.id })}
                      >
                        <Text
                          style={[
                            styles.targetItemText,
                            formData.targetId === category.id && styles.targetItemTextSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {formData.action === "product" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selecciona producto</Text>
                  <View style={styles.targetList}>
                    {products.slice(0, 10).map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.targetItem,
                          formData.targetId === product.id && styles.targetItemSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, targetId: product.id })}
                      >
                        <Text
                          style={[
                            styles.targetItemText,
                            formData.targetId === product.id && styles.targetItemTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Check size={20} color={colors.secondary} />
                <Text style={styles.saveButtonText}>
                  {editingPromotion ? "Guardar Cambios" : "Agregar Promoción"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    header: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    promotionsList: {
      padding: 16,
      gap: 16,
    },
    promotionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
    },
    promotionImage: {
      width: "100%",
      height: 150,
    },
    promotionInfo: {
      padding: 12,
    },
    promotionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    actionBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    actionBadgeText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    promotionActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    editButton: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    deleteButton: {},
    bottomPadding: {
      height: 100,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
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
      maxHeight: "90%",
      padding: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    imagePickerButton: {
      marginBottom: 20,
      borderRadius: 12,
      overflow: "hidden",
    },
    previewImage: {
      width: "100%",
      height: 180,
    },
    imagePlaceholder: {
      height: 180,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    imagePlaceholderText: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textMuted,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionSelector: {
      flexDirection: "row",
      gap: 10,
    },
    actionOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 4,
    },
    actionOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    actionOptionText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    actionOptionTextSelected: {
      color: colors.primary,
    },
    targetList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    targetItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    targetItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    targetItemText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    targetItemTextSelected: {
      color: colors.primary,
      fontWeight: "600" as const,
    },
    saveButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
      marginBottom: 32,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.secondary,
    },
  });
