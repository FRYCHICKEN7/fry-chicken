import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebase-service';

export default function CheckPermissionsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('No hay usuario autenticado en Firebase Auth');
        return;
      }

      console.log('🔍 Firebase Auth User:', {
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
      });

      const userData = await firebaseService.users.getById(currentUser.uid);
      setFirestoreUser(userData);

      if (!userData) {
        setError('Usuario no encontrado en Firestore');
        return;
      }

      console.log('📋 Firestore User:', userData);

    } catch (err: any) {
      console.error('❌ Error checking permissions:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fixAdminRole = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }

      Alert.alert(
        'Confirmar',
        '¿Actualizar el rol de este usuario a admin?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Actualizar',
            onPress: async () => {
              try {
                setLoading(true);
                await firebaseService.users.update(currentUser.uid, {
                  role: 'admin',
                  name: 'Administrador',
                });
                Alert.alert('Éxito', 'Rol actualizado a admin');
                await checkPermissions();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'No se pudo actualizar el rol');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error desconocido');
    }
  };

  const renderStatus = (condition: boolean, label: string) => (
    <View style={styles.statusRow}>
      {condition ? (
        <CheckCircle size={20} color={Colors.success} />
      ) : (
        <XCircle size={20} color={Colors.error} />
      )}
      <Text style={[styles.statusText, !condition && styles.statusTextError]}>
        {label}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Verificar Permisos' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Verificando permisos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser = auth.currentUser;
  const isAuthenticated = !!currentUser;
  const hasFirestoreUser = !!firestoreUser;
  const isAdmin = firestoreUser?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Verificar Permisos' }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Shield size={64} color={isAdmin ? Colors.success : Colors.error} />
          <Text style={styles.title}>Estado de Permisos</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de Autenticación</Text>
          {renderStatus(isAuthenticated, 'Usuario autenticado en Firebase Auth')}
          {renderStatus(hasFirestoreUser, 'Usuario existe en Firestore')}
          {renderStatus(isAdmin, 'Usuario tiene rol de Admin')}
        </View>

        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Firebase Auth</Text>
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>UID:</Text>
              <Text style={styles.dataValue}>{currentUser.uid}</Text>
              
              <Text style={styles.dataLabel}>Email:</Text>
              <Text style={styles.dataValue}>{currentUser.email || 'N/A'}</Text>
              
              <Text style={styles.dataLabel}>Email Verificado:</Text>
              <Text style={styles.dataValue}>
                {currentUser.emailVerified ? '✅ Sí' : '❌ No'}
              </Text>
            </View>
          </View>
        )}

        {firestoreUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Firestore User</Text>
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>ID:</Text>
              <Text style={styles.dataValue}>{firestoreUser.id}</Text>
              
              <Text style={styles.dataLabel}>Nombre:</Text>
              <Text style={styles.dataValue}>{firestoreUser.name || 'N/A'}</Text>
              
              <Text style={styles.dataLabel}>Email:</Text>
              <Text style={styles.dataValue}>{firestoreUser.email || 'N/A'}</Text>
              
              <Text style={styles.dataLabel}>Rol:</Text>
              <Text style={[
                styles.dataValue,
                { 
                  fontWeight: '700',
                  color: firestoreUser.role === 'admin' ? Colors.success : Colors.error 
                }
              ]}>
                {firestoreUser.role || 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <XCircle size={24} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AuthProvider Context</Text>
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>ID:</Text>
              <Text style={styles.dataValue}>{user.id}</Text>
              
              <Text style={styles.dataLabel}>Nombre:</Text>
              <Text style={styles.dataValue}>{user.name}</Text>
              
              <Text style={styles.dataLabel}>Rol:</Text>
              <Text style={[
                styles.dataValue,
                { 
                  fontWeight: '700',
                  color: user.role === 'admin' ? Colors.success : Colors.error 
                }
              ]}>
                {user.role}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={checkPermissions}>
            <RefreshCw size={20} color={Colors.secondary} />
            <Text style={styles.refreshButtonText}>Actualizar</Text>
          </TouchableOpacity>

          {currentUser && firestoreUser && firestoreUser.role !== 'admin' && (
            <TouchableOpacity style={styles.fixButton} onPress={fixAdminRole}>
              <Shield size={20} color={Colors.secondary} />
              <Text style={styles.fixButtonText}>Corregir a Admin</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity 
              style={styles.initButton}
              onPress={() => router.push('/admin/initialize-data')}
            >
              <Text style={styles.initButtonText}>Ir a Inicializar Datos</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  statusText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  statusTextError: {
    color: Colors.error,
  },
  dataBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dataLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'monospace' as any,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  fixButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  initButton: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  initButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  bottomPadding: {
    height: 32,
  },
});
