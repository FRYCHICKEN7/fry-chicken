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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Send,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useData } from '@/providers/DataProvider';
import { Coupon } from '@/types';

export default function CouponsScreen() {
  const { colors } = useTheme();
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    minOrder: '',
    maxUses: '',
    validFrom: '',
    validUntil: '',
    description: '',
    active: true,
    distributed: false,
    scheduledDate: '',
  });

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      minOrder: '',
      maxUses: '100',
      validFrom: today,
      validUntil: nextMonth,
      description: '',
      active: true,
      distributed: false,
      scheduledDate: '',
    });
    setEditingCoupon(null);
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toString(),
        minOrder: coupon.minOrder?.toString() || '',
        maxUses: coupon.maxUses.toString(),
        validFrom: coupon.validFrom.split('T')[0],
        validUntil: coupon.validUntil.split('T')[0],
        description: coupon.description || '',
        active: coupon.active,
        distributed: coupon.distributed,
        scheduledDate: coupon.scheduledDate?.split('T')[0] || '',
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.value || !formData.validUntil) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: parseFloat(formData.value),
        minOrder: formData.minOrder ? parseFloat(formData.minOrder) : undefined,
        maxUses: parseInt(formData.maxUses) || 100,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        description: formData.description,
        active: formData.active,
        distributed: formData.distributed,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
        Alert.alert('Éxito', 'Cupón actualizado correctamente');
      } else {
        await addCoupon(couponData);
        Alert.alert('Éxito', 'Cupón creado correctamente');
      }
      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cupón');
    }
  };

  const handleDelete = (coupon: Coupon) => {
    Alert.alert(
      'Eliminar Cupón',
      `¿Estás seguro de eliminar el cupón "${coupon.code}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteCoupon(coupon.id),
        },
      ]
    );
  };

  const handleDistribute = async (coupon: Coupon) => {
    Alert.alert(
      'Divulgar Cupón',
      `¿Quieres enviar el cupón "${coupon.code}" a todos los usuarios?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar Ahora',
          onPress: async () => {
            await updateCoupon(coupon.id, { distributed: true });
            Alert.alert('Éxito', 'El cupón será mostrado a todos los usuarios');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Gestionar Cupones' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cupones ({coupons.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
            <Plus size={20} color={colors.secondary} />
            <Text style={styles.addButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Tag size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateText}>No hay cupones creados</Text>
            <Text style={styles.emptyStateSubtext}>Crea tu primer cupón de descuento</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={[styles.couponCard, isExpired(coupon.validUntil) && styles.couponCardExpired]}>
              <View style={styles.couponHeader}>
                <View style={styles.couponCodeContainer}>
                  <Tag size={16} color={colors.primary} />
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                </View>
                <View style={styles.couponBadges}>
                  {coupon.distributed && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Divulgado</Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: coupon.active ? colors.success + '20' : colors.textMuted + '20' }]}>
                    <Text style={[styles.badgeText, { color: coupon.active ? colors.success : colors.textMuted }]}>
                      {coupon.active ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.couponValue}>
                {coupon.type === 'percentage' ? (
                  <View style={styles.valueRow}>
                    <Percent size={20} color={colors.success} />
                    <Text style={styles.valueText}>{coupon.value}% de descuento</Text>
                  </View>
                ) : (
                  <View style={styles.valueRow}>
                    <DollarSign size={20} color={colors.success} />
                    <Text style={styles.valueText}>L {coupon.value.toFixed(2)} de descuento</Text>
                  </View>
                )}
              </View>

              {coupon.description && (
                <Text style={styles.couponDescription}>{coupon.description}</Text>
              )}

              <View style={styles.couponDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>
                    Válido: {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
                  </Text>
                </View>
                {coupon.scheduledDate && (
                  <View style={styles.detailRow}>
                    <Clock size={14} color={colors.primary} />
                    <Text style={styles.detailText}>
                      Programado: {formatDate(coupon.scheduledDate)}
                    </Text>
                  </View>
                )}
                <Text style={styles.usageText}>
                  Usos: {coupon.usedCount} / {coupon.maxUses}
                </Text>
              </View>

              <View style={styles.couponActions}>
                {!coupon.distributed && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.distributeBtn]} 
                    onPress={() => handleDistribute(coupon)}
                  >
                    <Send size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Divulgar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.editBtn]} 
                  onPress={() => handleOpenModal(coupon)}
                >
                  <Edit2 size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.deleteBtn]} 
                  onPress={() => handleDelete(coupon)}
                >
                  <Trash2 size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Código del Cupón *</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="DESCUENTO10"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción del cupón"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Tipo de Descuento</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeOption, formData.type === 'percentage' && styles.typeOptionActive]}
                  onPress={() => setFormData({ ...formData, type: 'percentage' })}
                >
                  <Percent size={20} color={formData.type === 'percentage' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.typeOptionText, formData.type === 'percentage' && styles.typeOptionTextActive]}>
                    Porcentaje
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, formData.type === 'fixed' && styles.typeOptionActive]}
                  onPress={() => setFormData({ ...formData, type: 'fixed' })}
                >
                  <DollarSign size={20} color={formData.type === 'fixed' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.typeOptionText, formData.type === 'fixed' && styles.typeOptionTextActive]}>
                    Monto Fijo
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Valor del Descuento *</Text>
              <TextInput
                style={styles.input}
                value={formData.value}
                onChangeText={(text) => setFormData({ ...formData, value: text })}
                placeholder={formData.type === 'percentage' ? '10' : '50.00'}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Pedido Mínimo (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.minOrder}
                onChangeText={(text) => setFormData({ ...formData, minOrder: text })}
                placeholder="100.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Máximo de Usos</Text>
              <TextInput
                style={styles.input}
                value={formData.maxUses}
                onChangeText={(text) => setFormData({ ...formData, maxUses: text })}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Fecha de Caducidad *</Text>
              <TextInput
                style={styles.input}
                value={formData.validUntil}
                onChangeText={(text) => setFormData({ ...formData, validUntil: text })}
                placeholder="2025-12-31"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Programar Envío (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.scheduledDate}
                onChangeText={(text) => setFormData({ ...formData, scheduledDate: text })}
                placeholder="2025-01-01 (dejar vacío para no programar)"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Activo</Text>
                <Switch
                  value={formData.active}
                  onValueChange={(value) => setFormData({ ...formData, active: value })}
                  trackColor={{ false: colors.border, true: colors.success + '60' }}
                  thumbColor={formData.active ? colors.success : colors.textMuted}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Divulgar Inmediatamente</Text>
                <Switch
                  value={formData.distributed}
                  onValueChange={(value) => setFormData({ ...formData, distributed: value })}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={formData.distributed ? colors.primary : colors.textMuted}
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: colors.secondary,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  couponCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  couponCardExpired: {
    opacity: 0.6,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponCode: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  couponBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  couponValue: {
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.success,
  },
  couponDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  couponDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  usageText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  couponActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  distributeBtn: {
    backgroundColor: colors.success,
  },
  editBtn: {
    backgroundColor: colors.surfaceLight,
  },
  deleteBtn: {
    backgroundColor: colors.surfaceLight,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
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
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  typeOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.secondary,
    fontWeight: '700' as const,
    fontSize: 15,
  },
});
