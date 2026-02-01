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
import { 
  X, 
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Clock,
  CheckCircle,
  Eye,
  MapPin,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Complaint } from '@/types';

export default function ComplaintsReceivedScreen() {
  const { complaints, branches, updateComplaintStatus } = useData();
  const { user } = useAuth();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewing' | 'resolved'>('all');

  const filteredComplaints = complaints.filter(c => {
    if (user?.role === 'branch' && user.branchId) {
      if (c.branchId !== user.branchId) return false;
    }
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Sin asignar';
  };

  const getTypeInfo = (type: Complaint['type']) => {
    switch (type) {
      case 'complaint':
        return { color: Colors.accent, icon: AlertCircle, label: 'Queja' };
      case 'suggestion':
        return { color: Colors.primary, icon: Lightbulb, label: 'Sugerencia' };
      case 'order_issue':
        return { color: '#3B82F6', icon: MessageSquare, label: 'Problema con Pedido' };
    }
  };

  const getStatusInfo = (status: Complaint['status']) => {
    switch (status) {
      case 'pending':
        return { color: Colors.primary, bg: Colors.primary + '20', label: 'Pendiente', icon: Clock };
      case 'reviewing':
        return { color: '#F59E0B', bg: '#F59E0B20', label: 'En Revisión', icon: Eye };
      case 'resolved':
        return { color: Colors.success, bg: Colors.success + '20', label: 'Resuelto', icon: CheckCircle };
    }
  };

  const handleUpdateStatus = async (complaint: Complaint, newStatus: Complaint['status']) => {
    try {
      await updateComplaintStatus(complaint.id, newStatus, responseText || undefined);
      Alert.alert('Éxito', 'Estado actualizado correctamente');
      setDetailModalVisible(false);
      setResponseText('');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const openDetailModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseText(complaint.response || '');
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
      <Stack.Screen options={{ title: 'Quejas Recibidas' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quejas y Sugerencias ({filteredComplaints.length})</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'pending', 'reviewing', 'resolved'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'reviewing' ? 'En Revisión' : 'Resueltos'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>No hay quejas</Text>
            <Text style={styles.emptyStateSubtext}>
              {filterStatus === 'pending' ? 'No hay quejas pendientes' : 'No hay quejas en esta categoría'}
            </Text>
          </View>
        ) : (
          filteredComplaints.map((complaint) => {
            const typeInfo = getTypeInfo(complaint.type);
            const statusInfo = getStatusInfo(complaint.status);
            const TypeIcon = typeInfo.icon;
            const StatusIcon = statusInfo.icon;
            
            return (
              <TouchableOpacity 
                key={complaint.id} 
                style={styles.complaintCard}
                onPress={() => openDetailModal(complaint)}
                activeOpacity={0.7}
              >
                <View style={styles.complaintHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
                    <TypeIcon size={20} color={typeInfo.color} />
                  </View>
                  <View style={styles.complaintInfo}>
                    <Text style={styles.complaintSubject} numberOfLines={1}>{complaint.subject}</Text>
                    <View style={styles.branchRow}>
                      <MapPin size={12} color={Colors.textMuted} />
                      <Text style={styles.branchText}>{getBranchName(complaint.branchId)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <StatusIcon size={12} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <Text style={styles.complaintDescription} numberOfLines={2}>{complaint.description}</Text>

                <View style={styles.complaintFooter}>
                  <Text style={styles.customerName}>{complaint.customerName}</Text>
                  <Text style={styles.dateText}>{formatDate(complaint.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Queja</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailTypeIcon, { backgroundColor: getTypeInfo(selectedComplaint.type).color + '20' }]}>
                    {(() => {
                      const Icon = getTypeInfo(selectedComplaint.type).icon;
                      return <Icon size={28} color={getTypeInfo(selectedComplaint.type).color} />;
                    })()}
                  </View>
                  <Text style={styles.detailType}>{getTypeInfo(selectedComplaint.type).label}</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusInfo(selectedComplaint.status).bg }]}>
                    <Text style={[styles.detailStatusText, { color: getStatusInfo(selectedComplaint.status).color }]}>
                      {getStatusInfo(selectedComplaint.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Asunto</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Descripción</Text>
                  <Text style={styles.detailDescription}>{selectedComplaint.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Cliente</Text>
                  <Text style={styles.detailValue}>{selectedComplaint.customerName}</Text>
                  <Text style={styles.detailSubvalue}>{selectedComplaint.customerPhone}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Sucursal</Text>
                  <Text style={styles.detailValue}>{getBranchName(selectedComplaint.branchId)}</Text>
                </View>

                {selectedComplaint.orderNumber && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Número de Pedido</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.orderNumber}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Fecha</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedComplaint.createdAt)}</Text>
                </View>

                {selectedComplaint.response && (
                  <View style={styles.responseSection}>
                    <Text style={styles.detailLabel}>Respuesta</Text>
                    <Text style={styles.responseText}>{selectedComplaint.response}</Text>
                  </View>
                )}

                {selectedComplaint.status !== 'resolved' && (
                  <>
                    <View style={styles.responseInputSection}>
                      <Text style={styles.detailLabel}>Agregar Respuesta</Text>
                      <TextInput
                        style={styles.responseInput}
                        value={responseText}
                        onChangeText={setResponseText}
                        placeholder="Escribe una respuesta para el cliente..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <View style={styles.actionButtons}>
                      {selectedComplaint.status === 'pending' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.reviewingBtn]}
                          onPress={() => handleUpdateStatus(selectedComplaint, 'reviewing')}
                        >
                          <Eye size={18} color="#F59E0B" />
                          <Text style={styles.reviewingBtnText}>Marcar En Revisión</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.resolveBtn]}
                        onPress={() => handleUpdateStatus(selectedComplaint, 'resolved')}
                      >
                        <CheckCircle size={18} color="#fff" />
                        <Text style={styles.resolveBtnText}>Marcar Resuelto</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
  complaintCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintInfo: {
    flex: 1,
    marginLeft: 12,
  },
  complaintSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  branchText: {
    fontSize: 12,
    color: Colors.textMuted,
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
    fontSize: 10,
    fontWeight: '600',
  },
  complaintDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
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
  detailHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  detailStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  detailSubvalue: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  responseSection: {
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  responseText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  responseInputSection: {
    marginTop: 20,
  },
  responseInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  reviewingBtn: {
    backgroundColor: '#F59E0B20',
  },
  reviewingBtnText: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 15,
  },
  resolveBtn: {
    backgroundColor: Colors.success,
  },
  resolveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
