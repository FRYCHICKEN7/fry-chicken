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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Plus, MapPin, DollarSign, Edit2, Trash2, X, ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { Branch, DeliveryZone } from '@/types';


export default function ZonesScreen() {
  const params = useLocalSearchParams();
  const { branches, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } = useData();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(
    params.branchId ? branches.find(b => b.id === params.branchId) || null : null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });

  const resetForm = () => {
    setFormData({ name: '', price: '' });
    setEditingZone(null);
  };

  const handleOpenModal = (zone?: DeliveryZone) => {
    if (!selectedBranch) {
      Alert.alert('Error', 'Primero selecciona una sucursal');
      return;
    }
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        price: zone.price.toString(),
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !selectedBranch) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'El precio debe ser un número válido');
      return;
    }

    try {
      if (editingZone) {
        await updateDeliveryZone(selectedBranch.id, editingZone.id, { name: formData.name, price });
        Alert.alert('Éxito', 'Zona actualizada correctamente');
      } else {
        await addDeliveryZone(selectedBranch.id, { name: formData.name, price });
        Alert.alert('Éxito', 'Zona creada correctamente');
      }
      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la zona');
    }
  };

  const handleDelete = (zone: DeliveryZone) => {
    if (!selectedBranch) return;
    Alert.alert(
      'Eliminar Zona',
      `¿Estás seguro de eliminar "${zone.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteDeliveryZone(selectedBranch.id, zone.id),
        },
      ]
    );
  };

  const currentBranch = selectedBranch ? branches.find(b => b.id === selectedBranch.id) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Zonas de Envío' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.branchSelector}
            onPress={() => setBranchSelectorVisible(true)}
          >
            <MapPin size={18} color={Colors.primary} />
            <Text style={styles.branchSelectorText}>
              {selectedBranch?.name || 'Seleccionar Sucursal'}
            </Text>
            <ChevronDown size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {!selectedBranch ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Selecciona una sucursal para ver sus zonas de envío</Text>
          </View>
        ) : (
          <>
            <View style={styles.zonesHeader}>
              <Text style={styles.zonesTitle}>
                Zonas ({currentBranch?.deliveryZones.length || 0})
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
                <Plus size={20} color={Colors.secondary} />
                <Text style={styles.addButtonText}>Nueva Zona</Text>
              </TouchableOpacity>
            </View>

            {currentBranch?.deliveryZones.map((zone) => (
              <View key={zone.id} style={styles.zoneCard}>
                <View style={styles.zoneInfo}>
                  <View style={styles.zoneIcon}>
                    <MapPin size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.zoneDetails}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <View style={styles.priceRow}>
                      <DollarSign size={14} color={Colors.success} />
                      <Text style={styles.zonePrice}>L. {zone.price.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.zoneActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenModal(zone)}>
                    <Edit2 size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(zone)}>
                    <Trash2 size={18} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {currentBranch?.deliveryZones.length === 0 && (
              <View style={styles.emptyZones}>
                <Text style={styles.emptyZonesText}>No hay zonas de envío configuradas</Text>
                <Text style={styles.emptyZonesSubtext}>Agrega zonas para habilitar entregas a domicilio</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={branchSelectorVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Sucursal</Text>
              <TouchableOpacity onPress={() => setBranchSelectorVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.branchList}>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.branchOption,
                    selectedBranch?.id === branch.id && styles.branchOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBranch(branch);
                    setBranchSelectorVisible(false);
                  }}
                >
                  <Text style={[
                    styles.branchOptionText,
                    selectedBranch?.id === branch.id && styles.branchOptionTextSelected,
                  ]}>
                    {branch.name}
                  </Text>
                  <Text style={styles.branchOptionSubtext}>{branch.deliveryZones.length} zonas</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingZone ? 'Editar Zona' : 'Nueva Zona'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nombre de la Zona *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ej: Colonia Kennedy"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>Costo de Envío (L.) *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

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
    padding: 16,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  branchSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  zonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  zonesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
  },
  zoneInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneDetails: {
    flex: 1,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  zonePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  zoneActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyZones: {
    alignItems: 'center',
    padding: 32,
  },
  emptyZonesText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyZonesSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
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
    maxHeight: '70%',
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
  branchList: {
    padding: 16,
  },
  branchOption: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
  },
  branchOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  branchOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  branchOptionTextSelected: {
    color: Colors.primary,
  },
  branchOptionSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
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
