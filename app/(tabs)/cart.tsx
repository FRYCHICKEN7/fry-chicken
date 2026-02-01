import { useState, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, X, GlassWater, UtensilsCrossed } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useCart } from "@/providers/CartProvider";
import { useData } from "@/providers/DataProvider";
import { useAuth } from "@/providers/AuthProvider";
import CartItemCard from "@/components/CartItemCard";
import { Product } from "@/types";
import { formatPrice } from "@/lib/formatPrice";

export default function CartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, itemCount, addItem } = useCart();
  const { products, categories } = useData();
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<{[key: string]: number}>({});
  const [extrasType, setExtrasType] = useState<'drinks' | 'extras' | null>(null);

  const drinks = useMemo(() => {
    console.log('🔍 [CART DEBUG] Total products:', products.length);
    console.log('🔍 [CART DEBUG] Categories:', categories.map(c => ({ id: c.id, name: c.name })));
    console.log('🔍 [CART DEBUG] Sample products:', products.slice(0, 5).map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId, available: p.available })));
    
    const drinkCategories = categories.filter(c => {
      const normalizedName = c.name.toLowerCase().trim();
      return normalizedName === 'refrescos' || 
             normalizedName === 'refrescos naturales' || 
             normalizedName.startsWith('refrescos ');
    });
    const drinkCategoryIds = drinkCategories.map(c => c.id);
    console.log('🥤 [CART DEBUG] Drink categories found:', drinkCategories.map(c => ({ id: c.id, name: c.name })));
    
    const filtered = products.filter(p => drinkCategoryIds.includes(p.categoryId) && p.available);
    console.log('🥤 [CART DEBUG] Drinks found:', filtered.length, filtered.map(p => p.name));
    return filtered;
  }, [products, categories]);
  
  const extras = useMemo(() => {
    const extraCategories = categories.filter(c => 
      c.name.toLowerCase().includes('complement') || 
      c.name.toLowerCase().includes('extra')
    );
    const extraCategoryIds = extraCategories.map(c => c.id);
    console.log('🍟 [CART DEBUG] Extra categories found:', extraCategories.map(c => ({ id: c.id, name: c.name })));
    
    const filtered = products.filter(p => extraCategoryIds.includes(p.categoryId) && p.available);
    console.log('🍟 [CART DEBUG] Extras found:', filtered.length, filtered.map(p => p.name));
    return filtered;
  }, [products, categories]);

  const subtotal = getSubtotal();
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const styles = createStyles(colors);

  const handleAddExtra = (product: Product) => {
    setSelectedExtras(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const handleRemoveExtra = (productId: string) => {
    setSelectedExtras(prev => {
      const newCount = (prev[productId] || 0) - 1;
      if (newCount <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newCount };
    });
  };

  const handleConfirmExtras = () => {
    Object.entries(selectedExtras).forEach(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        for (let i = 0; i < quantity; i++) {
          addItem(product);
        }
      }
    });
    setSelectedExtras({});
    setShowExtrasModal(false);
    setExtrasType(null);
  };

  const handleCloseModal = () => {
    setShowExtrasModal(false);
    setExtrasType(null);
  };

  const getExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return total + (product ? product.price * quantity : 0);
    }, 0);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Carrito</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <ShoppingBag size={64} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>
            Agrega deliciosos productos desde nuestro menú
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.browseButtonText}>Ver Menú</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Carrito</Text>
        </View>

        <FlatList
          data={items}
          renderItem={({ item }) => (
            <CartItemCard
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <View style={styles.authRequiredContainer}>
            <Text style={styles.authRequiredTitle}>Regístrate para continuar</Text>
            <Text style={styles.authRequiredSubtitle}>
              Para realizar tu pedido necesitas registrarte o iniciar sesión en tu cuenta
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
            <Text style={styles.summaryValue}>L. {formatPrice(subtotal)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push("/customer-login" as any)}
          >
            <Text style={styles.checkoutButtonText}>Registrarse / Iniciar Sesión</Text>
            <ArrowRight size={20} color={colors.secondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={clearCart} style={styles.clearButton}>
          <Trash2 size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={({ item }) => (
          <CartItemCard
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
          <Text style={styles.summaryValue}>L. {formatPrice(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={styles.summaryValue}>
            {deliveryFee === 0 ? "Por calcular" : `L. ${formatPrice(deliveryFee)}`}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>L. {formatPrice(total)}</Text>
        </View>

        <TouchableOpacity
          style={styles.addExtrasButton}
          onPress={() => setShowExtrasModal(true)}
        >
          <Plus size={18} color="#FFD500" />
          <Text style={styles.addExtrasButtonText}>Agregar Extras o Refrescos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push("/checkout" as any)}
        >
          <Text style={styles.checkoutButtonText}>Continuar al Pago</Text>
          <ArrowRight size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={showExtrasModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {extrasType === null ? 'Agregar Extras' : extrasType === 'drinks' ? 'Refrescos' : 'Complementos'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {extrasType === null ? (
              <View style={styles.extrasOptionsContainer}>
                <TouchableOpacity
                  style={styles.extrasOptionCard}
                  onPress={() => setExtrasType('drinks')}
                  activeOpacity={0.8}
                >
                  <View style={styles.extrasOptionIcon}>
                    <GlassWater size={48} color={colors.primary} />
                  </View>
                  <Text style={styles.extrasOptionTitle}>Refrescos</Text>
                  <Text style={styles.extrasOptionSubtitle}>{drinks.length} opciones disponibles</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.extrasOptionCard}
                  onPress={() => setExtrasType('extras')}
                  activeOpacity={0.8}
                >
                  <View style={styles.extrasOptionIcon}>
                    <UtensilsCrossed size={48} color={colors.primary} />
                  </View>
                  <Text style={styles.extrasOptionTitle}>Complementos</Text>
                  <Text style={styles.extrasOptionSubtitle}>{extras.length} opciones disponibles</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.extrasSection}>
                    {extrasType === 'drinks' && (
                      <View style={styles.extrasGrid}>
                        {drinks.map((drink) => (
                          <View key={drink.id} style={styles.extraCard}>
                            <Image source={{ uri: drink.image }} style={styles.extraImage} />
                            <Text style={styles.extraName} numberOfLines={2}>{drink.name}</Text>
                            <Text style={styles.extraPrice}>L. {formatPrice(drink.price)}</Text>
                            <View style={styles.extraControls}>
                              {selectedExtras[drink.id] ? (
                                <>
                                  <TouchableOpacity
                                    style={styles.extraControlButton}
                                    onPress={() => handleRemoveExtra(drink.id)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Minus size={16} color={colors.white} />
                                  </TouchableOpacity>
                                  <Text style={styles.extraQuantity}>{selectedExtras[drink.id]}</Text>
                                  <TouchableOpacity
                                    style={styles.extraControlButton}
                                    onPress={() => handleAddExtra(drink)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Plus size={16} color={colors.white} />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <TouchableOpacity
                                  style={styles.addExtraBtn}
                                  onPress={() => handleAddExtra(drink)}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Plus size={18} color={colors.primary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {extrasType === 'extras' && (
                      <View style={styles.extrasGrid}>
                        {extras.map((extra) => (
                          <View key={extra.id} style={styles.extraCard}>
                            <Image source={{ uri: extra.image }} style={styles.extraImage} />
                            <Text style={styles.extraName} numberOfLines={2}>{extra.name}</Text>
                            <Text style={styles.extraPrice}>L. {formatPrice(extra.price)}</Text>
                            <View style={styles.extraControls}>
                              {selectedExtras[extra.id] ? (
                                <>
                                  <TouchableOpacity
                                    style={styles.extraControlButton}
                                    onPress={() => handleRemoveExtra(extra.id)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Minus size={16} color={colors.white} />
                                  </TouchableOpacity>
                                  <Text style={styles.extraQuantity}>{selectedExtras[extra.id]}</Text>
                                  <TouchableOpacity
                                    style={styles.extraControlButton}
                                    onPress={() => handleAddExtra(extra)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Plus size={16} color={colors.white} />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <TouchableOpacity
                                  style={styles.addExtraBtn}
                                  onPress={() => handleAddExtra(extra)}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Plus size={18} color={colors.primary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>

                {extrasType !== null && (
                  <View style={styles.backButtonContainer}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setExtrasType(null)}
                    >
                      <Text style={styles.backButtonText}>← Volver a opciones</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {Object.keys(selectedExtras).length > 0 && (
              <View style={styles.modalFooter}>
                <View style={styles.modalFooterRow}>
                  <Text style={styles.modalFooterLabel}>Total extras:</Text>
                  <Text style={styles.modalFooterValue}>L. {formatPrice(getExtrasTotal())}</Text>
                </View>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmExtras}>
                  <Text style={styles.confirmButtonText}>Agregar al Carrito</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "800" as const,
    },
    clearButton: {
      padding: 8,
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700" as const,
      marginBottom: 8,
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 24,
    },
    browseButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
    browseButtonText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: "700" as const,
    },
    authRequiredContainer: {
      backgroundColor: colors.surfaceLight,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    authRequiredTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700" as const,
      marginBottom: 6,
    },
    authRequiredSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      backgroundColor: colors.surface,
      padding: 20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    summaryValue: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "600" as const,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    totalLabel: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700" as const,
    },
    totalValue: {
      color: colors.textPrimary,
      fontSize: 32,
      fontWeight: "900" as const,
    },
    checkoutButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    checkoutButtonText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: "700" as const,
    },
    addExtrasButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 12,
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: "#000000",
      gap: 8,
    },
    addExtrasButtonText: {
      color: "#FFD500",
      fontSize: 14,
      fontWeight: "600" as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end" as const,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
    },
    modalHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    extrasSection: {
      padding: 16,
    },
    extrasSectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 16,
    },
    extrasSectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    extrasGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 12,
    },
    extraCard: {
      width: "30%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 8,
      alignItems: "center" as const,
    },
    extraImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginBottom: 8,
    },
    extraName: {
      fontSize: 11,
      color: colors.textPrimary,
      textAlign: "center" as const,
      fontWeight: "500" as const,
      minHeight: 28,
    },
    extraPrice: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "700" as const,
      marginBottom: 8,
    },
    extraControls: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    extraControlButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    extraQuantity: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      minWidth: 20,
      textAlign: "center" as const,
    },
    addExtraBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceLight,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    modalFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    modalFooterRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      marginBottom: 12,
    },
    modalFooterLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalFooterValue: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    confirmButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center" as const,
    },
    confirmButtonText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: "700" as const,
    },
    extrasOptionsContainer: {
      padding: 24,
      gap: 16,
    },
    extrasOptionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center" as const,
      borderWidth: 2,
      borderColor: colors.border,
    },
    extrasOptionIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceLight,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 16,
    },
    extrasOptionTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    extrasOptionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    backButtonContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    backButton: {
      paddingVertical: 12,
      alignItems: "center" as const,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.primary,
    },
  });
