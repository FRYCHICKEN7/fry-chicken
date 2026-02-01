import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  X, 
  Truck,
  Phone,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Bike,
  Car,
  Trash2,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import { DeliveryUser } from '@/types';

export default function DeliveryManagementScreen() {
  const { deliveryUsers, branches, updateDeliveryStatus, deleteDeliveryUser } = useData();
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<DeliveryUser | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const myDeliveryUsers = deliveryUsers.filter(d => {
    if (user?.role === 'admin') {
      return true;
    }
    if (user?.role === 'branch' && user?.branchId) {
      return d.branchId === user.branchId;
    }
    return false;
  });

  const filteredUsers = filterStatus === 'all' 
    ? myDeliveryUsers 
    : myDeliveryUsers.filter(u => u.status === filterStatus);

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Sin asignar';
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'motorcycle':
        return <Bike size={16} color={Colors.primary} />;
      case 'car':
        return <Car size={16} color={Colors.primary} />;
      case 'bicycle':
        return <Bike size={16} color={Colors.success} />;
      default:
        return <Truck size={16} color={Colors.textMuted} />;
    }
  };

  const getVehicleLabel = (type: string) => {
    switch (type) {
      case 'motorcycle': return 'Motocicleta';
      case 'car': return 'Carro';
      case 'bicycle': return 'Bicicleta';
      default: return 'Otro';
    }
  };

  const getStatusBadge = (status: DeliveryUser['status']) => {
    switch (status) {
      case 'pending':
        return { color: Colors.primary, bg: Colors.primary + '20', label: 'Pendiente', icon: Clock };
      case 'approved':
        return { color: Colors.success, bg: Colors.success + '20', label: 'Aprobado', icon: CheckCircle };
      case 'rejected':
        return { color: Colors.accent, bg: Colors.accent + '20', label: 'Rechazado', icon: XCircle };
    }
  };

  const handleApprove = (user: DeliveryUser) => {
    console.log('🟢 [APPROVE] Button pressed for user:', user.id, user.name);
    console.log('🟢 [APPROVE] Current status:', user.status);
    
    if (isUpdating) {
      console.log('⚠️ [APPROVE] Already updating, ignoring');
      return;
    }
    
    Alert.alert(
      'Aprobar Repartidor',
      `¿Estás seguro de aprobar a "${user.name}" como repartidor?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            try {
              setIsUpdating(true);
              console.log('🔄 [APPROVE] Starting approval for:', user.id);
              await updateDeliveryStatus(user.id, 'approved');
              console.log('✅ [APPROVE] Approval completed for:', user.id);
              Alert.alert('Éxito', 'Repartidor aprobado correctamente');
              setDetailModalVisible(false);
            } catch (error: any) {
              console.error('❌ [APPROVE] Error approving:', error);
              Alert.alert(
                'Error',
                error.message || 'No se pudo aprobar al repartidor. Intenta nuevamente.'
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = (user: DeliveryUser) => {
    console.log('🔴 [REJECT] Button pressed for user:', user.id, user.name);
    
    if (isUpdating) {
      console.log('⚠️ [REJECT] Already updating, ignoring');
      return;
    }
    
    Alert.alert(
      'Rechazar Repartidor',
      `¿Estás seguro de rechazar a "${user.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              console.log('🔄 [REJECT] Starting rejection for:', user.id);
              await updateDeliveryStatus(user.id, 'rejected');
              console.log('✅ [REJECT] Rejection completed for:', user.id);
              Alert.alert('Repartidor rechazado');
              setDetailModalVisible(false);
            } catch (error: any) {
              console.error('❌ [REJECT] Error rejecting:', error);
              Alert.alert(
                'Error',
                error.message || 'No se pudo rechazar al repartidor. Intenta nuevamente.'
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (user: DeliveryUser) => {
    Alert.alert(
      'Eliminar Repartidor',
      `¿Estás seguro de eliminar permanentemente a "${user.name}"?\n\nEsta acción eliminará:\n- El registro del repartidor\n- Su información personal\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting delivery user:', user.id);
              await deleteDeliveryUser(user.id);
              Alert.alert('Éxito', 'Repartidor eliminado correctamente');
              setDetailModalVisible(false);
            } catch (error: any) {
              console.error('❌ Error deleting delivery user:', error);
              Alert.alert('Error', error.message || 'Error al eliminar repartidor');
            }
          },
        },
      ]
    );
  };

  const openDetailModal = (user: DeliveryUser) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Gestionar Repartidores' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Repartidores ({filteredUsers.length})</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Aprobados' : 'Rechazados'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={48} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>No hay repartidores</Text>
            <Text style={styles.emptyStateSubtext}>
              {filterStatus === 'pending' ? 'No hay solicitudes pendientes' : 'No hay repartidores en esta categoría'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const statusInfo = getStatusBadge(user.status);
            const StatusIcon = statusInfo.icon;
            return (
              <TouchableOpacity 
                key={user.id} 
                style={styles.userCard}
                onPress={() => openDetailModal(user)}
                activeOpacity={0.7}
              >
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Truck size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userBranch}>{getBranchName(user.branchId)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <StatusIcon size={12} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.userDetails}>
                  <View style={styles.detailItem}>
                    <Phone size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>{user.phone}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <CreditCard size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>DNI: {user.dni}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    {getVehicleIcon(user.vehicleType)}
                    <Text style={styles.detailText}>{getVehicleLabel(user.vehicleType)} - {user.plateNumber}</Text>
                  </View>
                </View>

                {user.status === 'pending' && (
                  <View style={styles.pendingActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => handleReject(user)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <XCircle size={16} color={Colors.accent} />
                      <Text style={styles.rejectBtnText}>{isUpdating ? 'Procesando...' : 'Rechazar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => handleApprove(user)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>{isUpdating ? 'Procesando...' : 'Aprobar'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles del Repartidor</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <View style={styles.detailAvatar}>
                    <Truck size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.detailName}>{selectedUser.name}</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusBadge(selectedUser.status).bg }]}>
                    <Text style={[styles.statusTextLarge, { color: getStatusBadge(selectedUser.status).color }]}>
                      {getStatusBadge(selectedUser.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Teléfono</Text>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>DNI</Text>
                    <Text style={styles.infoValue}>{selectedUser.dni}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dirección</Text>
                    <Text style={styles.infoValue}>{selectedUser.address}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vehículo</Text>
                    <Text style={styles.infoValue}>{getVehicleLabel(selectedUser.vehicleType)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Placa</Text>
                    <Text style={styles.infoValue}>{selectedUser.plateNumber}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Sucursal</Text>
                    <Text style={styles.infoValue}>{getBranchName(selectedUser.branchId)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fecha de Registro</Text>
                    <Text style={styles.infoValue}>{formatDate(selectedUser.createdAt)}</Text>
                  </View>
                </View>

                {selectedUser.dniPhoto && (
                  <View style={styles.dniPhotoSection}>
                    <Text style={styles.dniPhotoLabel}>Foto del DNI</Text>
                    <Image source={{ uri: selectedUser.dniPhoto }} style={styles.dniPhoto} />
                  </View>
                )}

                {selectedUser.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.modalRejectBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => handleReject(selectedUser)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <XCircle size={20} color={Colors.accent} />
                      <Text style={styles.modalRejectBtnText}>{isUpdating ? 'Procesando...' : 'Rechazar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.modalApproveBtn, isUpdating && styles.disabledBtn]}
                      onPress={() => handleApprove(selectedUser)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <CheckCircle size={20} color="#fff" />
                      <Text style={styles.modalApproveBtnText}>{isUpdating ? 'Procesando...' : 'Aprobar'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.deleteSection}>
                  <Text style={styles.deleteSectionTitle}>Zona de Peligro</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(selectedUser)}
                  >
                    <Trash2 size={20} color="#e74c3c" />
                    <Text style={styles.deleteButtonText}>Eliminar Repartidor</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  userCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userBranch: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: Colors.accent + '15',
  },
  rejectBtnText: {
    color: Colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  approveBtn: {
    backgroundColor: Colors.success,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    maxHeight: '85%',
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
  detailSection: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    paddingVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  dniPhotoSection: {
    marginTop: 16,
  },
  dniPhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dniPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  modalRejectBtn: {
    backgroundColor: Colors.accent + '15',
  },
  modalRejectBtnText: {
    color: Colors.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  modalApproveBtn: {
    backgroundColor: Colors.success,
  },
  modalApproveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#e74c3c20',
    borderWidth: 1,
    borderColor: '#e74c3c40',
    gap: 8,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
