import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Clock, CheckCircle, XCircle, User, Mail, Phone } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { firebaseService } from '@/services/firebase-service';
import { PasswordRecoveryRequest } from '@/types';
import { auth } from '@/lib/firebase';
import { trpc } from '@/lib/trpc';

export default function PasswordRecoveryScreen() {
  const [requests, setRequests] = useState<PasswordRecoveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const updatePasswordMutation = trpc.users.updatePassword.useMutation();

  useEffect(() => {
    const unsubscribe = firebaseService.passwordRecoveryRequests.getAll((data) => {
      setRequests(data);
    });

    return () => unsubscribe();
  }, []);

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleApprove = async (request: PasswordRecoveryRequest) => {
    Alert.alert(
      'Aprobar Solicitud',
      `¿Deseas aprobar la solicitud de recuperación de contraseña de ${request.userName}?\n\nSe generará una contraseña temporal válida por 24 horas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setIsLoading(true);
            try {
              const temporaryPassword = generateTemporaryPassword();
              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 24);

              console.log('🔐 Updating password in Firebase Auth for user:', request.userId);
              await updatePasswordMutation.mutateAsync({
                userId: request.userId,
                newPassword: temporaryPassword,
                adminToken: 'admin-token',
              });
              console.log('✅ Password updated in Firebase Auth');

              await firebaseService.passwordRecoveryRequests.update(request.id, {
                status: 'approved',
                temporaryPassword,
                temporaryPasswordExpiresAt: expiresAt.toISOString(),
                approvedBy: auth.currentUser?.uid || 'admin',
                approvedAt: new Date().toISOString(),
              });

              Alert.alert(
                'Solicitud Aprobada',
                `Contraseña temporal generada:\n\n${temporaryPassword}\n\nEsta contraseña expirará en 24 horas.\n\nPor favor, comunica esta contraseña al usuario ${request.userName} por un medio seguro.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Error approving request:', error);
              Alert.alert('Error', 'No se pudo aprobar la solicitud: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request: PasswordRecoveryRequest) => {
    Alert.alert(
      'Rechazar Solicitud',
      `¿Deseas rechazar la solicitud de recuperación de contraseña de ${request.userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await firebaseService.passwordRecoveryRequests.update(request.id, {
                status: 'rejected',
              });

              Alert.alert('Solicitud Rechazada', 'La solicitud ha sido rechazada.');
            } catch (error: any) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'No se pudo rechazar la solicitud: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (request: PasswordRecoveryRequest) => {
    Alert.alert(
      'Eliminar Solicitud',
      `¿Deseas eliminar esta solicitud de ${request.userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await firebaseService.passwordRecoveryRequests.delete(request.id);
              Alert.alert('Eliminado', 'La solicitud ha sido eliminada.');
            } catch (error: any) {
              console.error('Error deleting request:', error);
              Alert.alert('Error', 'No se pudo eliminar la solicitud: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  const renderRequest = (request: PasswordRecoveryRequest) => {
    const isExpired =
      request.temporaryPasswordExpiresAt &&
      new Date(request.temporaryPasswordExpiresAt) < new Date();

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            <User size={20} color={Colors.primary} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{request.userName}</Text>
              <View style={styles.contactRow}>
                <Mail size={14} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{request.userEmail}</Text>
              </View>
              {request.userPhone && (
                <View style={styles.contactRow}>
                  <Phone size={14} color={Colors.textSecondary} />
                  <Text style={styles.contactText}>{request.userPhone}</Text>
                </View>
              )}
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              request.status === 'pending' && styles.statusPending,
              request.status === 'approved' && styles.statusApproved,
              request.status === 'rejected' && styles.statusRejected,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                request.status === 'pending' && styles.statusTextPending,
                request.status === 'approved' && styles.statusTextApproved,
                request.status === 'rejected' && styles.statusTextRejected,
              ]}
            >
              {request.status === 'pending'
                ? 'Pendiente'
                : request.status === 'approved'
                ? 'Aprobada'
                : 'Rechazada'}
            </Text>
          </View>
        </View>

        <View style={styles.requestInfo}>
          <View style={styles.infoRow}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              Solicitado: {new Date(request.createdAt).toLocaleDateString('es-HN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {request.status === 'approved' && request.temporaryPassword && (
            <>
              <View style={[styles.passwordBox, isExpired && styles.passwordBoxExpired]}>
                <Text style={styles.passwordLabel}>Contraseña Temporal:</Text>
                <Text style={styles.passwordValue}>{request.temporaryPassword}</Text>
                {isExpired && (
                  <Text style={styles.expiredLabel}>⚠️ EXPIRADA</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  {isExpired ? 'Expiró' : 'Expira'}:{' '}
                  {new Date(request.temporaryPasswordExpiresAt!).toLocaleDateString('es-HN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.requestActions}>
          {request.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(request)}
                disabled={isLoading}
              >
                <CheckCircle size={18} color={Colors.white} />
                <Text style={styles.actionButtonText}>Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(request)}
                disabled={isLoading}
              >
                <XCircle size={18} color={Colors.white} />
                <Text style={styles.actionButtonText}>Rechazar</Text>
              </TouchableOpacity>
            </>
          )}
          {request.status !== 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(request)}
              disabled={isLoading}
            >
              <XCircle size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Recuperación de Contraseñas',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pendientes ({pendingRequests.length})
            </Text>
            {pendingRequests.map(renderRequest)}
          </View>
        )}

        {approvedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Aprobadas ({approvedRequests.length})
            </Text>
            {approvedRequests.map(renderRequest)}
          </View>
        )}

        {rejectedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Rechazadas ({rejectedRequests.length})
            </Text>
            {rejectedRequests.map(renderRequest)}
          </View>
        )}

        {requests.length === 0 && (
          <View style={styles.emptyState}>
            <Clock size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No hay solicitudes de recuperación</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row' as const,
    gap: 12,
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: Colors.accent + '20',
  },
  statusApproved: {
    backgroundColor: Colors.success + '20',
  },
  statusRejected: {
    backgroundColor: '#EF4444' + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusTextPending: {
    color: Colors.accent,
  },
  statusTextApproved: {
    color: Colors.success,
  },
  statusTextRejected: {
    color: '#EF4444',
  },
  requestInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  passwordBox: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  passwordBoxExpired: {
    backgroundColor: '#EF4444' + '10',
    borderColor: '#EF4444' + '30',
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  passwordValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 2,
    fontFamily: 'monospace' as const,
  },
  expiredLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#EF4444',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  deleteButton: {
    backgroundColor: Colors.textMuted,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
