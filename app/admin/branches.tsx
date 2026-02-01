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
import { Stack } from 'expo-router';
import { Plus, MapPin, Phone, Edit2, Trash2, X, MessageCircle, Key, ExternalLink, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { Branch, BusinessHours } from '@/types';


export default function BranchesScreen() {
  const { branches, addBranch, updateBranch, deleteBranch, updateBranchBusinessHours, isBranchOpen } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    whatsapp: '',
    code: '',
    password: '',
    mapsLink: '',
  });
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [editingBranchHours, setEditingBranchHours] = useState<Branch | null>(null);
  const [localHours, setLocalHours] = useState<BusinessHours[]>([]);

  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '', whatsapp: '', code: '', password: '', mapsLink: '' });
    setEditingBranch(null);
  };

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        whatsapp: branch.whatsapp,
        code: branch.code,
        password: branch.password,
        mapsLink: branch.mapsLink || '',
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address || !formData.phone || !formData.code || !formData.password) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      const branchData: Partial<Branch> = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim(),
        code: formData.code.trim(),
        password: formData.password.trim(),
        mapsLink: formData.mapsLink.trim() || undefined,
      };

      if (editingBranch) {
        branchData.isOpen = editingBranch.isOpen;
        if (editingBranch.businessHours) {
          branchData.businessHours = editingBranch.businessHours;
        }
        if (editingBranch.deliveryZones) {
          branchData.deliveryZones = editingBranch.deliveryZones;
        }
      } else {
        branchData.isOpen = true;
      }

      if (editingBranch) {
        console.log('🔄 Updating branch:', editingBranch.id);
        console.log('🔄 Branch data:', JSON.stringify(branchData, null, 2));
        await updateBranch(editingBranch.id, branchData);
        console.log('✅ Branch updated successfully');
        Alert.alert('Éxito', 'Sucursal actualizada correctamente');
      } else {
        console.log('➕ Adding new branch');
        console.log('➕ Branch data:', JSON.stringify(branchData, null, 2));
        const newBranch = await addBranch(branchData as Omit<Branch, 'id' | 'deliveryZones'>);
        console.log('✅ Branch created with ID:', newBranch.id);
        
        console.log('⏳ Esperando 2 segundos para que Firebase sincronice...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        Alert.alert(
          'Éxito', 
          'Sucursal creada correctamente. La sucursal se ha guardado en Firebase y debería aparecer cuando recargues la app.',
          [{ text: 'OK' }]
        );
      }
      setModalVisible(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error saving branch:', error);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Error code:', error?.code);
      
      let errorMessage = 'No se pudo guardar la sucursal';
      
      if (error?.code === 'permission-denied' || error?.message?.includes('permisos') || error?.message?.includes('permission')) {
        errorMessage = '❌ ERROR DE PERMISOS:\n\nTu usuario no tiene permisos de administrador en Firebase.\n\nPara resolver esto:\n1. Ve a Firebase Console\n2. Abre Firestore Database\n3. Busca la colección "users"\n4. Encuentra tu usuario (frychickenhn@gmail.com)\n5. Edita el campo "role" y cambia su valor a "admin"\n6. Guarda los cambios\n7. Cierra sesión y vuelve a iniciar sesión';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDelete = (branch: Branch) => {
    Alert.alert(
      'Eliminar Sucursal',
      `¿Estás seguro de eliminar "${branch.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteBranch(branch.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Gestionar Sucursales' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sucursales ({branches.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
            <Plus size={20} color={Colors.secondary} />
            <Text style={styles.addButtonText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {branches.map((branch) => (
          <View key={branch.id} style={styles.branchCard}>
            <View style={styles.branchHeader}>
              <View style={styles.branchInfo}>
                <Text style={styles.branchName}>{branch.name}</Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: isBranchOpen(branch.id) ? Colors.success + '20' : Colors.accent + '20' }]}
                >
                  <Text style={[styles.statusText, { color: isBranchOpen(branch.id) ? Colors.success : Colors.accent }]}>
                    {isBranchOpen(branch.id) ? 'Abierta' : 'Cerrada'}
                  </Text>
                </View>
              </View>
              <View style={styles.branchActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenModal(branch)}>
                  <Edit2 size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(branch)}>
                  <Trash2 size={18} color={Colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.branchDetails}>
              <View style={styles.detailRow}>
                <MapPin size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{branch.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Phone size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{branch.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <MessageCircle size={16} color={Colors.success} />
                <Text style={styles.detailText}>{branch.whatsapp}</Text>
              </View>
              <View style={styles.detailRow}>
                <Key size={16} color={Colors.primary} />
                <Text style={styles.detailText}>Código: {branch.code}</Text>
              </View>
              {branch.mapsLink && (
                <TouchableOpacity 
                  style={styles.detailRow}
                  onPress={() => {
                    const url = branch.mapsLink;
                    if (url) {
                      import('expo-linking').then(({ openURL }) => {
                        openURL(url).catch(() => {
                          Alert.alert('Error', 'No se pudo abrir el enlace');
                        });
                      });
                    }
                  }}
                >
                  <ExternalLink size={16} color="#3B82F6" />
                  <Text style={[styles.detailText, { color: '#3B82F6' }]}>Ver en Google Maps</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.zonesSection}>
              <Text style={styles.zonesTitle}>Zonas de Envío: {branch.deliveryZones.length}</Text>
              <TouchableOpacity 
                style={styles.hoursButton}
                onPress={() => {
                  setEditingBranchHours(branch);
                  setLocalHours(branch.businessHours || [
                    { dayOfWeek: 0, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true },
                    { dayOfWeek: 6, openTime: '08:00', closeTime: '18:00', isOpen: true },
                  ]);
                  setHoursModalVisible(true);
                }}
              >
                <Clock size={14} color={Colors.primary} />
                <Text style={styles.hoursButtonText}>Configurar Horarios</Text>
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
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nombre de la sucursal"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>Dirección *</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Dirección completa"
                placeholderTextColor={Colors.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+504 XXXX-XXXX"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={formData.whatsapp}
                onChangeText={(text) => setFormData({ ...formData, whatsapp: text })}
                placeholder="+504XXXXXXXX (sin guiones)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Código de Sucursal *</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="SUC-001"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Contraseña *</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Contraseña de acceso"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Link de Google Maps (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.mapsLink}
                onChangeText={(text) => setFormData({ ...formData, mapsLink: text })}
                placeholder="https://maps.app.goo.gl/..."
                placeholderTextColor={Colors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
                multiline
              />
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

      <Modal visible={hoursModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Horarios - {editingBranchHours?.name}
              </Text>
              <TouchableOpacity onPress={() => setHoursModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {localHours.map((hour) => {
                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                return (
                  <View key={hour.dayOfWeek} style={styles.hourCard}>
                    <View style={styles.hourHeader}>
                      <Text style={styles.dayName}>{dayNames[hour.dayOfWeek]}</Text>
                      <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => {
                          const updated = localHours.map(h => 
                            h.dayOfWeek === hour.dayOfWeek ? { ...h, isOpen: !h.isOpen } : h
                          );
                          setLocalHours(updated);
                        }}
                      >
                        <Text style={[styles.toggleText, { color: hour.isOpen ? Colors.success : Colors.textMuted }]}>
                          {hour.isOpen ? 'Abierto' : 'Cerrado'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {hour.isOpen && (
                      <View style={styles.timeRow}>
                        <TextInput
                          style={styles.timeInput}
                          value={hour.openTime}
                          onChangeText={(text) => {
                            const updated = localHours.map(h => 
                              h.dayOfWeek === hour.dayOfWeek ? { ...h, openTime: text } : h
                            );
                            setLocalHours(updated);
                          }}
                          placeholder="09:00"
                          placeholderTextColor={Colors.textMuted}
                        />
                        <Text style={styles.timeSeparator}>-</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={hour.closeTime}
                          onChangeText={(text) => {
                            const updated = localHours.map(h => 
                              h.dayOfWeek === hour.dayOfWeek ? { ...h, closeTime: text } : h
                            );
                            setLocalHours(updated);
                          }}
                          placeholder="21:00"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setHoursModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={async () => {
                  if (editingBranchHours) {
                    try {
                      console.log('💾 [ADMIN BRANCHES] Updating business hours for branch:', editingBranchHours.id);
                      console.log('💾 [ADMIN BRANCHES] New hours:', localHours);
                      await updateBranchBusinessHours(editingBranchHours.id, localHours);
                      console.log('✅ [ADMIN BRANCHES] Hours updated successfully');
                      
                      const updatedBranchOpen = isBranchOpen(editingBranchHours.id);
                      console.log('🔍 [ADMIN BRANCHES] Branch open status after update:', updatedBranchOpen);
                      
                      Alert.alert('Éxito', 'Horarios actualizados correctamente');
                      setHoursModalVisible(false);
                    } catch (error: any) {
                      console.error('❌ [ADMIN BRANCHES] Error updating hours:', error);
                      Alert.alert('Error', error?.message || 'No se pudieron actualizar los horarios');
                    }
                  }
                }}
              >
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
  branchCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  branchActions: {
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
  branchDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  zonesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  zonesTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  hoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  hoursButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  hourCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  hourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '600',
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
    maxHeight: '80%',
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
