import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown,
  Image as ImageIcon,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { Product } from '@/types';

export default function ProductsScreen() {
  const { products, categories, addProduct, updateProduct, deleteProduct, reorderProduct } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    categoryId: '',
    isCombo: false,
    comboType: '' as 'personal' | 'familiar' | 'promotion' | '',
    includesDrink: false,
    available: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      categoryId: categories[0]?.id || '',
      isCombo: false,
      comboType: '',
      includesDrink: false,
      available: true,
    });
    setEditingProduct(null);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        image: product.image,
        categoryId: product.categoryId,
        isCombo: product.isCombo,
        comboType: product.comboType || '',
        includesDrink: product.includesDrink || false,
        available: product.available,
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Mantiene el formato cuadrado para el diseño nuevo
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image: formData.image || 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
        categoryId: formData.categoryId,
        isCombo: formData.isCombo,
        comboType: formData.comboType || undefined,
        includesDrink: formData.includesDrink,
        available: formData.available,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      } else {
        await addProduct(productData);
        Alert.alert('Éxito', 'Producto creado correctamente');
      }
      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto');
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de eliminar "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteProduct(product.id),
        },
      ]
    );
  };

  const handleToggleAvailability = async (product: Product) => {
    await updateProduct(product.id, { available: !product.available });
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.categoryId === selectedCategory);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sin categoría';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Gestionar Productos' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Productos ({filteredProducts.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
            <Plus size={20} color={Colors.secondary} />
            <Text style={styles.addButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredProducts.map((product, index) => (
          <View key={product.id} style={styles.productCard}>
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.productCategory}>{getCategoryName(product.categoryId)}</Text>
              <Text style={styles.productPrice}>L {product.price.toFixed(2)}</Text>
              <View style={styles.availabilityRow}>
                <Text style={styles.availabilityLabel}>Disponible</Text>
                <Switch
                  value={product.available}
                  onValueChange={() => handleToggleAvailability(product)}
                  trackColor={{ false: Colors.border, true: Colors.success + '60' }}
                  thumbColor={product.available ? Colors.success : Colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => reorderProduct(product.id, 'up')}
                disabled={index === 0}
              >
                <ChevronUp size={18} color={index === 0 ? Colors.border : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => reorderProduct(product.id, 'down')}
                disabled={index === filteredProducts.length - 1}
              >
                <ChevronDown size={18} color={index === filteredProducts.length - 1 ? Colors.border : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenModal(product)}>
                <Edit2 size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(product)}>
                <Trash2 size={18} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                {formData.image ? (
                  <Image source={{ uri: formData.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ImageIcon size={40} color={Colors.textMuted} />
                    <Text style={styles.imagePlaceholderText}>Seleccionar Imagen</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nombre del producto"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción del producto"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Precio *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Categoría *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryOption, formData.categoryId === cat.id && styles.categoryOptionActive]}
                    onPress={() => setFormData({ ...formData, categoryId: cat.id })}
                  >
                    <Text style={[
                      styles.categoryOptionText, 
                      formData.categoryId === cat.id && styles.categoryOptionTextActive
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Es Combo</Text>
                <Switch
                  value={formData.isCombo}
                  onValueChange={(value) => setFormData({ ...formData, isCombo: value })}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={formData.isCombo ? Colors.primary : Colors.textMuted}
                />
              </View>

              {formData.isCombo && (
                <>
                  <Text style={styles.inputLabel}>Tipo de Combo</Text>
                  <View style={styles.comboTypeSelector}>
                    {['personal', 'familiar', 'promotion'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.comboTypeOption, formData.comboType === type && styles.comboTypeOptionActive]}
                        onPress={() => setFormData({ ...formData, comboType: type as any })}
                      >
                        <Text style={[
                          styles.comboTypeText,
                          formData.comboType === type && styles.comboTypeTextActive
                        ]}>
                          {type === 'personal' ? 'Personal' : type === 'familiar' ? 'Familiar' : 'Promoción'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Incluye Refresco</Text>
                    <Switch
                      value={formData.includesDrink}
                      onValueChange={(value) => setFormData({ ...formData, includesDrink: value })}
                      trackColor={{ false: Colors.border, true: Colors.success + '60' }}
                      thumbColor={formData.includesDrink ? Colors.success : Colors.textMuted}
                    />
                  </View>
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Disponible</Text>
                <Switch
                  value={formData.available}
                  onValueChange={(value) => setFormData({ ...formData, available: value })}
                  trackColor={{ false: Colors.border, true: Colors.success + '60' }}
                  thumbColor={formData.available ? Colors.success : Colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Guardar</Text>
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: Colors.secondary,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'contain', 
    backgroundColor: '#1a1a1a', 
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginRight: 8,
  },
  productActions: {
    justifyContent: 'center',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  imagePickerButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: '#1a1a1a',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  imagePlaceholderText: {
    color: Colors.textMuted,
    marginTop: 8,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    marginBottom: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  comboTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  comboTypeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comboTypeOptionActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  comboTypeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  comboTypeTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
});
