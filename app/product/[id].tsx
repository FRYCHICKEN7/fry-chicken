import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus, Check } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { useCart } from "@/providers/CartProvider";
import { Product, CartExtra } from "@/types";
import AddToCartSuccessModal from "@/components/AddToCartSuccessModal";
import { formatPrice } from "@/lib/formatPrice";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { products, categories } = useData();
  const { addItem } = useCart();

  const product = products.find((p) => p.id === id);
  const [selectedDrink, setSelectedDrink] = useState<Product | null>(null);
  const [drinkType, setDrinkType] = useState<"regular" | "natural">("regular");
  const [extras, setExtras] = useState<CartExtra[]>([]);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  const refreshCategory = useMemo(() => {
    const cat = categories.find(c => {
      const name = c.name.toLowerCase();
      return name === 'refrescos' || name === 'bebidas';
    });
    console.log('🥤 [DRINKS] Refresh category found:', cat?.name, 'ID:', cat?.id);
    console.log('🥤 [DRINKS] All categories:', categories.map(c => c.name));
    return cat;
  }, [categories]);
  
  const naturalRefreshCategory = useMemo(() => {
    const cat = categories.find(c => {
      const name = c.name.toLowerCase();
      return name.includes('natural') || name.includes('naturales');
    });
    console.log('🍋 [DRINKS] Natural refresh category found:', cat?.name, 'ID:', cat?.id);
    return cat;
  }, [categories]);
  
  const extrasCategory = useMemo(() => {
    const cat = categories.find(c => c.name.toLowerCase().includes('complement'));
    console.log('➕ [EXTRAS] Extras category found:', cat?.name, 'ID:', cat?.id);
    return cat;
  }, [categories]);

  const regularDrinks = useMemo(() => {
    console.log('🔍 [DRINKS] Starting regularDrinks filter');
    console.log('🔍 [DRINKS] Total products:', products.length);
    console.log('🔍 [DRINKS] refreshCategory:', refreshCategory?.name, 'ID:', refreshCategory?.id);
    
    console.log('🔍 [DRINKS] All products with their categories:');
    products.forEach(p => {
      console.log(`  - ${p.name} | CategoryID: ${p.categoryId} | Available: ${p.available}`);
    });
    
    console.log('🔍 [DRINKS] All categories:');
    categories.forEach(c => {
      console.log(`  - ${c.name} | ID: ${c.id}`);
    });
    
    const drinks = products.filter((d) => {
      const categoryMatch = refreshCategory && d.categoryId === refreshCategory.id;
      const isAvailable = d.available;
      const nameMatch = d.name.includes('500');
      
      console.log(`🔍 [DRINKS] Checking: ${d.name} | Cat: ${d.categoryId} | Match: ${categoryMatch} | Avail: ${isAvailable} | Name: ${nameMatch}`);
      
      return categoryMatch && isAvailable && nameMatch;
    });
    
    console.log('🥤 [DRINKS] Regular drinks found:', drinks.length);
    if (drinks.length > 0) {
      console.log('🥤 [DRINKS] Found drinks:', drinks.map(d => d.name));
    } else {
      console.log('⚠️ [DRINKS] NO DRINKS FOUND!');
      console.log('⚠️ [DRINKS] Products in Refrescos category:', refreshCategory?.id);
      const inCategory = products.filter(p => refreshCategory && p.categoryId === refreshCategory.id);
      console.log('⚠️ [DRINKS] Count in category:', inCategory.length);
      inCategory.forEach(p => {
        console.log('  -', p.name, '| Available:', p.available, '| Has 500:', p.name.includes('500'));
      });
    }
    
    return drinks;
  }, [products, refreshCategory, categories]);
  
  const naturalDrinks = useMemo(() => {
    const drinks = products.filter((d) => 
      naturalRefreshCategory && d.categoryId === naturalRefreshCategory.id && d.available
    );
    console.log('🍋 [DRINKS] Natural drinks found:', drinks.length, drinks.map(d => d.name));
    return drinks;
  }, [products, naturalRefreshCategory]);
  
  const availableExtras = useMemo(() => {
    const extras = products.filter((p) => 
      extrasCategory && p.categoryId === extrasCategory.id && p.available
    );
    console.log('➕ [EXTRAS] Extras found:', extras.length, extras.map(e => e.name));
    return extras;
  }, [products, extrasCategory]);
  const availableDrinks = drinkType === "regular" ? regularDrinks : naturalDrinks;

  const styles = createStyles(colors);

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Producto no encontrado</Text>
      </View>
    );
  }

  const toggleExtra = (extra: Product) => {
    const existing = extras.find((e) => e.product.id === extra.id);
    if (existing) {
      setExtras(extras.filter((e) => e.product.id !== extra.id));
    } else {
      setExtras([...extras, { product: extra, quantity: 1 }]);
    }
    if (!showExtras) {
      setShowExtras(true);
    }
  };

  const updateExtraQuantity = (extraId: string, delta: number) => {
    setExtras(
      extras
        .map((e) => {
          if (e.product.id === extraId) {
            const newQty = e.quantity + delta;
            return newQty > 0 ? { ...e, quantity: newQty } : null;
          }
          return e;
        })
        .filter(Boolean) as CartExtra[]
    );
  };

  const calculateTotal = () => {
    let total = product.price * quantity;
    extras.forEach((e) => {
      total += e.product.price * e.quantity;
    });
    return total;
  };

  const handleAddToCart = () => {
    if (product.includesDrink && !selectedDrink) {
      return;
    }
    addItem(product, selectedDrink ?? undefined, extras, notes || undefined);
    setShowSuccessModal(true);
  };

  const needsDrinkSelection = product.isCombo && product.comboType === "personal" && product.includesDrink;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: product.image }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.description}>{stripHtml(product.description || '')}</Text>
        <Text style={styles.price}>L. {formatPrice(product.price)}</Text>

        {needsDrinkSelection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Elige tu Refresco *</Text>
            <View style={styles.drinkTypeRow}>
              <TouchableOpacity
                style={[
                  styles.drinkTypeButton,
                  drinkType === "regular" && styles.drinkTypeButtonSelected,
                ]}
                onPress={() => {
                  setDrinkType("regular");
                  setSelectedDrink(null);
                }}
              >
                <Text
                  style={[
                    styles.drinkTypeText,
                    drinkType === "regular" && styles.drinkTypeTextSelected,
                  ]}
                >
                  Refresco
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.drinkTypeButton,
                  drinkType === "natural" && styles.drinkTypeButtonSelected,
                ]}
                onPress={() => {
                  setDrinkType("natural");
                  setSelectedDrink(null);
                }}
              >
                <Text
                  style={[
                    styles.drinkTypeText,
                    drinkType === "natural" && styles.drinkTypeTextSelected,
                  ]}
                >
                  Natural
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.drinksGrid}>
              {availableDrinks.length === 0 ? (
                <View>
                  <Text style={styles.noDrinksText}>
                    No hay {drinkType === 'regular' ? 'refrescos' : 'refrescos naturales'} disponibles
                  </Text>
                  <TouchableOpacity
                    style={[styles.debugButton, { backgroundColor: colors.accent }]}
                    onPress={() => {
                      const info = `DEBUG INFO:\n\nTotal productos: ${products.length}\n\nCategoría Refrescos: ${refreshCategory?.name || 'NO ENCONTRADA'}\nID: ${refreshCategory?.id || 'N/A'}\n\nProductos en esta categoría:\n${products.filter(p => refreshCategory && p.categoryId === refreshCategory.id).map(p => `- ${p.name} (tiene 500: ${p.name.includes('500')})`).join('\n')}\n\nRefrescos con 500: ${regularDrinks.length}`;
                      Alert.alert('Debug Info', info);
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Ver Debug Info</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                availableDrinks.map((drink) => (
                  <TouchableOpacity
                    key={drink.id}
                    style={[
                      styles.drinkOption,
                      selectedDrink?.id === drink.id && styles.drinkOptionSelected,
                    ]}
                    onPress={() => setSelectedDrink(drink)}
                  >
                    <Image source={{ uri: drink.image }} style={styles.drinkImage} />
                    <Text
                      style={[
                        styles.drinkName,
                        selectedDrink?.id === drink.id && styles.drinkNameSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {drink.name}
                    </Text>
                    {selectedDrink?.id === drink.id && (
                      <View style={styles.checkIcon}>
                        <Check size={14} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {availableExtras.length > 0 && (
          <View style={styles.section}>
            {!showExtras && extras.length === 0 ? (
              <TouchableOpacity
                style={styles.addExtrasButton}
                onPress={() => setShowExtras(true)}
              >
                <Plus size={20} color={colors.primary} />
                <Text style={styles.addExtrasButtonText}>Agregar Extra</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Extras (Opcional)</Text>
                {availableExtras.map((extra) => {
                  const cartExtra = extras.find((e) => e.product.id === extra.id);
                  const isSelected = !!cartExtra;
                  return (
                    <TouchableOpacity
                      key={extra.id}
                      style={[styles.extraItem, isSelected && styles.extraItemSelected]}
                      onPress={() => toggleExtra(extra)}
                    >
                      <Image source={{ uri: extra.image }} style={styles.extraImage} />
                      <View style={styles.extraInfo}>
                        <Text style={styles.extraName}>{extra.name}</Text>
                        <Text style={styles.extraPrice}>+L. {formatPrice(extra.price)}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.extraQuantityControls}>
                          <TouchableOpacity
                            style={styles.extraQuantityButton}
                            onPress={() => updateExtraQuantity(extra.id, -1)}
                          >
                            <Minus size={14} color={colors.white} />
                          </TouchableOpacity>
                          <Text style={styles.extraQuantity}>{cartExtra?.quantity}</Text>
                          <TouchableOpacity
                            style={styles.extraQuantityButton}
                            onPress={() => updateExtraQuantity(extra.id, 1)}
                          >
                            <Plus size={14} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.addExtraButton}>
                          <Plus size={18} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas Especiales</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Sin cebolla, extra salsa..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Plus size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            needsDrinkSelection && !selectedDrink && styles.addButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={needsDrinkSelection && !selectedDrink}
        >
          <Text style={styles.addButtonText}>
            Agregar L. {formatPrice(calculateTotal())}
          </Text>
        </TouchableOpacity>
      </View>

      <AddToCartSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    resizeMode: "cover" as const,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800" as const,
    marginBottom: 8,
  },
  description: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  price: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800" as const,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  drinkTypeRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 16,
  },
  drinkTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: colors.border,
  },
  drinkTypeButtonSelected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  drinkTypeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  drinkTypeTextSelected: {
    color: colors.primary,
  },
  drinksGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  drinkOption: {
    width: "30%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative" as const,
  },
  drinkOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  drinkImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
  },
  drinkName: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: "center" as const,
  },
  drinkNameSelected: {
    color: colors.primary,
    fontWeight: "600" as const,
  },
  checkIcon: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  extraItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  extraItemSelected: {
    borderColor: colors.primary,
  },
  extraImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  extraInfo: {
    flex: 1,
  },
  extraName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  extraPrice: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  addExtraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  extraQuantityControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  extraQuantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  extraQuantity: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700" as const,
    minWidth: 24,
    textAlign: "center" as const,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.surface,
    gap: 16,
  },
  quantityRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quantityText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700" as const,
    minWidth: 32,
    textAlign: "center" as const,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.addToCartButton,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center" as const,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.addToCartText,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: "center" as const,
    marginTop: 100,
  },
  noDrinksText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center" as const,
    paddingVertical: 20,
  },
  debugButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  addExtrasButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
  },
  addExtrasButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
