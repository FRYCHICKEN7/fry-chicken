import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Plus, Edit2, Trash2, X, Save } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useData } from '@/providers/DataProvider';
import { Product } from '@/types';

export default function PrizeProductsScreen() {
  const { colors } = useTheme();
  const { products, updateProduct } = useData();
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPrize, setIsPrize] = useState(false);
  const [pointsRequired, setPointsRequired] = useState('');

  const prizeProducts = products.filter((p) => p.isPrize);
  const availableProducts = products.filter((p) => !p.isPrize);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsPrize(product.isPrize || false);
    setPointsRequired(String(product.pointsRequired || ''));
    setShowModal(true);
  };

  const handleAdd = (product: Product) => {
    setSelectedProduct(product);
    setIsPrize(true);
    setPointsRequired('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedProduct) return;

    if (isPrize && !pointsRequired) {
      Alert.alert('Error', 'Debes ingresar los puntos requeridos');
      return;
    }

    const points = parseInt(pointsRequired);
    if (isPrize && (isNaN(points) || points <= 0)) {
      Alert.alert('Error', 'Los puntos deben ser un número mayor a 0');
      return;
    }

    try {
      await updateProduct(selectedProduct.id, {
        isPrize,
        pointsRequired: isPrize ? points : undefined,
      });

      Alert.alert(
        'Éxito',
        isPrize
          ? `${selectedProduct.name} ahora es un premio de ${points} puntos`
          : `${selectedProduct.name} ya no es un premio`
      );
      setShowModal(false);
      setSelectedProduct(null);
      setIsPrize(false);
      setPointsRequired('');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el producto');
    }
  };

  const handleRemove = async (product: Product) => {
    Alert.alert(
      'Confirmar',
      `¿Quitar "${product.name}" de los premios?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateProduct(product.id, {
                isPrize: false,
                pointsRequired: undefined,
              });
              Alert.alert('Éxito', 'Producto quitado de premios');
            } catch {
              Alert.alert('Error', 'No se pudo quitar el producto');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Configurar Premios',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Gift size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Productos Premio Activos
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Estos productos se pueden canjear con puntos
          </Text>

          {prizeProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Gift size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay productos premio configurados
              </Text>
            </View>
          ) : (
            prizeProducts.map((product) => (
              <View
                key={product.id}
                style={[styles.productCard, { backgroundColor: colors.background }]}
              >
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.prizeInfo}>
                    <Text style={[styles.prizePoints, { color: colors.primary }]}>
                      {product.pointsRequired?.toLocaleString()} puntos
                    </Text>
                    <Text style={[styles.prizePrice, { color: colors.textMuted }]}>
                      (Valor: L {product.price.toFixed(2)})
                    </Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => handleEdit(product)}
                  >
                    <Edit2 size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                    onPress={() => handleRemove(product)}
                  >
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Plus size={24} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Agregar Productos a Premios
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Selecciona productos del menú para convertirlos en premios
          </Text>

          {availableProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Todos los productos están configurados como premios
              </Text>
            </View>
          ) : (
            availableProducts.map((product) => (
              <View
                key={product.id}
                style={[styles.productCard, { backgroundColor: colors.background }]}
              >
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productPrice, { color: colors.textMuted }]}>
                    Precio: L {product.price.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.success }]}
                  onPress={() => handleAdd(product)}
                >
                  <Plus size={20} color={colors.white} />
                  <Text style={[styles.addButtonText, { color: colors.white }]}>Agregar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedProduct?.isPrize ? 'Editar Premio' : 'Nuevo Premio'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.productPreview}>
                  <Image source={{ uri: selectedProduct.image }} style={styles.previewImage} />
                  <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={[styles.previewPrice, { color: colors.textMuted }]}>
                    Precio original: L {selectedProduct.price.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchInfo}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>Es un premio</Text>
                      <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Los premios se canjean solo con puntos
                      </Text>
                    </View>
                    <Switch
                      value={isPrize}
                      onValueChange={setIsPrize}
                      trackColor={{ false: colors.border, true: colors.primary + '50' }}
                      thumbColor={isPrize ? colors.primary : colors.textMuted}
                    />
                  </View>
                </View>

                {isPrize && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      Puntos requeridos *
                    </Text>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                      Cantidad de puntos necesarios para canjear este producto
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        },
                      ]}
                      value={pointsRequired}
                      onChangeText={setPointsRequired}
                      placeholder="Ej: 2000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    {pointsRequired && !isNaN(parseInt(pointsRequired)) && (
                      <Text style={[styles.conversion, { color: colors.success }]}>
                        ✓ Equivalente aproximado a L {selectedProduct.price.toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                    ℹ️ Importante
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    • Los premios NO se cobran en dinero{'\n'}
                    • Solo se descuentan puntos del usuario{'\n'}
                    • El usuario solo paga el envío (si aplica){'\n'}
                    • Usa una conversión interna para calcular los puntos
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Save size={18} color={colors.white} />
                <Text style={[styles.saveButtonText, { color: colors.white }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginLeft: 12,
  },
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 36,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
  },
  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prizePoints: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  prizePrice: {
    fontSize: 11,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 20,
  },
  productPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  conversion: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600' as const,
  },
  infoBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
