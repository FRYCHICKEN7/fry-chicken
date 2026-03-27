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
import { Plus, X, MapPin, Trash2, Building2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useData } from '@/providers/DataProvider';
import { DeliveryZone } from '@/types';

export default function DeliveryZonesManagementScreen() {
  const { colors } = useTheme();
  const { branches, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zonePrice, setZonePrice] = useState('');

  const handleAddZone = (branchId: string) => {
    setSelectedBranchId(branchId);
    setZoneName('');
    setZonePrice('');
    setEditingZone(null);
    setShowAddModal(true);
  };

  const handleEditZone = (branchId: string, zone: DeliveryZone) => {
    setSelectedBranchId(branchId);
    setZoneName(zone.name);
    setZonePrice(zone.price.toString());
    setEditingZone(zone);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    
    if (!zoneName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la zona');
      return;
    }

    const price = parseFloat(zonePrice);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Por favor ingresa un precio válido');
      return;
    }

    try {
      if (editingZone) {
        await updateDeliveryZone(selectedBranchId, editingZone.id, {
          name: zoneName.trim(),
          price: price,
          sucursalId: selectedBranchId,
        });
        Alert.alert('Éxito', 'Zona actualizada correctamente');
      } else {
        await addDeliveryZone(selectedBranchId, {
          name: zoneName.trim(),
          price: price,
          sucursalId: selectedBranchId,
        });
        Alert.alert('Éxito', 'Zona creada correctamente');
      }
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la zona');
    }
  };

  const handleDeleteZone = (branchId: string, zoneId: string, zoneName: string) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar la zona "${zoneName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDeliveryZone(branchId, zoneId);
              Alert.alert('Éxito', 'Zona eliminada correctamente');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la zona');
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.description}>
            Gestiona las zonas de envío de cada sucursal. Las zonas determinan automáticamente a qué sucursal se asigna un pedido.
          </Text>
        </View>

        {branches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building2 size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay sucursales creadas</Text>
            <Text style={styles.emptySubtext}>
              Crea sucursales primero para poder gestionar zonas de envío
            </Text>
          </View>
        ) : (
          branches.map((branch) => (
            <View key={branch.id} style={styles.branchCard}>
              <View style={styles.branchHeader}>
                <View style={styles.branchInfo}>
                  <Building2 size={24} color={colors.primary} />
                  <View style={styles.branchTexts}>
                    <Text style={styles.branchName}>{branch.name}</Text>
                    <Text style={styles.branchMeta}>
                      {branch.deliveryZones.length} zona(s)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddZone(branch.id)}
                >
                  <Plus size={20} color={colors.primary} />
                  <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {branch.deliveryZones.length > 0 ? (
                <View style={styles.zonesList}>
                  {branch.deliveryZones.map((zone) => (
                    <View key={zone.id} style={styles.zoneCard}>
                      <View style={styles.zoneInfo}>
                        <MapPin size={20} color={colors.success} />
                        <View style={styles.zoneTexts}>
                          <Text style={styles.zoneName}>{zone.name}</Text>
                          <Text style={styles.zonePrice}>L. {zone.price.toFixed(2)}</Text>
                        </View>
                      </View>
                      <View style={styles.zoneActions}>
                        <TouchableOpacity
                          style={styles.zoneActionButton}
                          onPress={() => handleEditZone(branch.id, zone)}
                        >
                          <Text style={styles.zoneActionText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.zoneActionButton, styles.deleteActionButton]}
                          onPress={() => handleDeleteZone(branch.id, zone.id, zone.name)}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noZonesContainer}>
                  <MapPin size={32} color={colors.textMuted} />
                  <Text style={styles.noZonesText}>Sin zonas de envío</Text>
                  <Text style={styles.noZonesSubtext}>
                    Agrega zonas para que los clientes puedan realizar pedidos con envío
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingZone ? 'Editar Zona' : 'Nueva Zona de Envío'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.label}>Nombre de la Zona</Text>
                <TextInput
                  style={styles.input}
                  value={zoneName}
                  onChangeText={setZoneName}
                  placeholder="Ej: El Chaparro, Centro, Col. Kennedy"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Precio de Envío (Lempiras)</Text>
                <TextInput
                  style={styles.input}
                  value={zonePrice}
                  onChangeText={setZonePrice}
                  placeholder="Ej: 50"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.hint}>
                <Text style={styles.hintText}>
                  💡 Los clientes verán esta zona al seleccionar envío a domicilio. El sistema asignará automáticamente el pedido a esta sucursal cuando el cliente seleccione esta zona.
                </Text>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingZone ? 'Guardar Cambios' : 'Crear Zona'}
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
    scrollView: {
      flex: 1,
    },
    header: {
      padding: 16,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    branchCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    branchHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    branchInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    branchTexts: {
      marginLeft: 12,
      flex: 1,
    },
    branchName: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    branchMeta: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    zonesList: {
      gap: 8,
    },
    zoneCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    zoneInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    zoneTexts: {
      marginLeft: 12,
      flex: 1,
    },
    zoneName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    zonePrice: {
      fontSize: 13,
      color: colors.success,
      fontWeight: '600' as const,
    },
    zoneActions: {
      flexDirection: 'row',
      gap: 8,
    },
    zoneActionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.primary + '15',
    },
    zoneActionText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    deleteActionButton: {
      backgroundColor: colors.error + '15',
      paddingHorizontal: 8,
    },
    noZonesContainer: {
      alignItems: 'center',
      padding: 24,
    },
    noZonesText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginTop: 12,
    },
    noZonesSubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      marginTop: 48,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
    bottomPadding: {
      height: 32,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.textPrimary,
    },
    formSection: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hint: {
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    hintText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.secondary,
    },
  });
