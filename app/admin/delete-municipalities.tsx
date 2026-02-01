import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Trash2, AlertTriangle, Database } from 'lucide-react-native';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { firebaseService } from '@/services/firebase-service';

export default function DeleteOrdersScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');

  const addStatus = (message: string) => {
    setStatusMessages(prev => [...prev, message]);
  };

  const handleDeleteOrders = () => {
    setShowPasswordPrompt(true);
  };

  const proceedWithDeletion = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'No se pudo verificar tu sesión');
      return;
    }

    const firebaseUser = auth.currentUser;
    console.log('🔍 Firebase user:', firebaseUser?.email);
    console.log('🔍 Firebase user ID:', firebaseUser?.uid);
    console.log('🔍 Current user:', currentUser.email);
    console.log('🔍 Current user ID:', currentUser.id);
    console.log('🔍 Password length:', password.trim().length);
    
    if (!firebaseUser) {
      Alert.alert('Error', 'No se pudo verificar tu sesión en Firebase. Por favor cierra sesión y vuelve a iniciar sesión.');
      return;
    }

    if (firebaseUser.email !== currentUser.email) {
      Alert.alert('Error', `La sesión de Firebase (${firebaseUser.email}) no coincide con tu usuario (${currentUser.email}). Por favor cierra sesión y vuelve a iniciar sesión.`);
      return;
    }

    try {
      console.log('🔐 Attempting to reauthenticate with email:', currentUser.email);
      const credential = EmailAuthProvider.credential(currentUser.email, password.trim());
      await reauthenticateWithCredential(firebaseUser, credential);
      console.log('✅ Password verified with Firebase Auth');
    } catch (error: any) {
      console.error('❌ Password verification failed:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Email used:', currentUser.email);
      console.error('❌ Password length:', password.trim().length);
      
      let errorMessage = 'Contraseña incorrecta.';
      let debugInfo = `\n\nDebug Info:\n• Email: ${currentUser.email}\n• Código de error: ${error.code}\n• Intentando con contraseña de ${password.trim().length} caracteres`;
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'La contraseña no coincide con la cuenta de Firebase. \n\nAsegúrate de usar la contraseña ACTUAL con la que iniciaste sesión (no la contraseña anterior si la cambiaste recientemente).\n\nSi no recuerdas la contraseña, cierra sesión y usa la opción de recuperar contraseña.' + debugInfo;
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Por favor espera unos minutos e intenta de nuevo.' + debugInfo;
      } else if (error.code === 'auth/user-token-expired') {
        errorMessage = 'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar sesión.' + debugInfo;
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por seguridad, necesitas cerrar sesión y volver a iniciar sesión antes de realizar esta acción.' + debugInfo;
      } else {
        errorMessage = error.message + debugInfo;
      }
      
      Alert.alert('Error de Autenticación', errorMessage);
      return;
    }

    setShowPasswordPrompt(false);
    setPassword('');
    setIsDeleting(true);
    setStatusMessages([]);
    setDeletionComplete(false);

    try {
      addStatus('🔥 Conectando a Firebase...');
      
      const orders = await new Promise<any[]>((resolve) => {
        const unsubscribe = firebaseService.orders.getAll((data) => {
          unsubscribe();
          resolve(data);
        });
      });

      addStatus(`📊 Se encontraron ${orders.length} pedidos`);
      
      if (orders.length === 0) {
        addStatus('✅ No hay pedidos para eliminar');
        setDeletionComplete(true);
        Alert.alert('Información', 'No hay pedidos en la base de datos');
        return;
      }

      addStatus('');
      addStatus('🗑️ Eliminando pedidos...');

      let deletedCount = 0;
      for (const order of orders) {
        try {
          await firebaseService.orders.delete(order.id);
          deletedCount++;
          addStatus(`✓ Eliminado: Pedido #${order.orderNumber || order.id.substring(0, 8)} (${deletedCount}/${orders.length})`);
        } catch (error: any) {
          addStatus(`✗ Error al eliminar pedido #${order.orderNumber || order.id.substring(0, 8)}: ${error.message}`);
        }
      }

      addStatus('');
      addStatus('🎉 ¡Eliminación completada!');
      addStatus(`📊 Resumen: ${deletedCount} pedidos eliminados`);
      
      setDeletionComplete(true);
      
      setTimeout(() => {
        Alert.alert(
          'Éxito',
          `Se eliminaron ${deletedCount} pedidos correctamente.`,
          [{ text: 'OK' }]
        );
      }, 500);

    } catch (error: any) {
      console.error('❌ Error durante la eliminación:', error);
      addStatus('');
      addStatus('❌ ERROR: ' + (error.message || 'Error desconocido'));
      Alert.alert('Error', error.message || 'No se pudo completar la eliminación');
    } finally {
      setIsDeleting(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Resetear Pedidos' }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Trash2 size={64} color={colors.error} />
          </View>
          <Text style={styles.title}>Resetear Todos los Pedidos</Text>
          <Text style={styles.description}>
            Esta herramienta eliminará todos los pedidos almacenados en Firebase Firestore.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <AlertTriangle size={32} color={colors.error} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>¡Advertencia!</Text>
            <Text style={styles.warningText}>
              • Esta acción eliminará TODOS los pedidos de la base de datos{'\n'}
              • Esta acción NO se puede deshacer{'\n'}
              • Los usuarios NO se verán afectados{'\n'}
              • Las sucursales NO se verán afectadas
            </Text>
          </View>
        </View>

        {statusMessages.length > 0 && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Database size={20} color={colors.primary} />
              <Text style={styles.statusTitle}>Estado de la Eliminación</Text>
            </View>
            <ScrollView style={styles.statusScroll} nestedScrollEnabled>
              {statusMessages.map((message, index) => (
                <Text key={index} style={styles.statusMessage}>
                  {message}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            (isDeleting || deletionComplete) && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeleteOrders}
          disabled={isDeleting || deletionComplete}
          activeOpacity={0.7}
        >
          {isDeleting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Trash2 size={20} color={colors.white} />
              <Text style={styles.deleteButtonText}>
                {deletionComplete ? 'Eliminación Completada' : 'Resetear Todos los Pedidos'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>¿Por qué resetear los pedidos?</Text>
          <Text style={styles.infoText}>
            • Útil para limpiar pedidos de prueba{'\n'}
            • Útil para reiniciar el sistema en nuevas etapas{'\n'}
            • Los usuarios y sucursales no se afectan{'\n'}
            • Mantiene la base de datos limpia y organizada
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showPasswordPrompt && (
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.modalDescription}>
              ⚠️ Esta acción eliminará TODOS los pedidos de Firebase.
              {currentUser?.email && `\n\nCuenta: ${currentUser.email}`}
              {auth.currentUser?.email && auth.currentUser.email !== currentUser?.email && `\nFirebase: ${auth.currentUser.email}`}
              \n\nPara continuar, ingresa la contraseña ACTUAL de tu cuenta Firebase (la misma con la que iniciaste sesión):
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordPrompt(false);
                  setPassword('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={proceedWithDeletion}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
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
      padding: 24,
      alignItems: 'center',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.error + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    warningCard: {
      flexDirection: 'row',
      backgroundColor: colors.error + '10',
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 20,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.error + '30',
    },
    warningContent: {
      flex: 1,
      marginLeft: 16,
    },
    warningTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.error,
      marginBottom: 8,
    },
    warningText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    statusCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 24,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.textPrimary,
    },
    statusScroll: {
      maxHeight: 300,
    },
    statusMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      lineHeight: 20,
      marginBottom: 4,
    },
    deleteButton: {
      backgroundColor: colors.error,
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 18,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    deleteButtonDisabled: {
      opacity: 0.5,
    },
    deleteButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.white,
    },
    infoSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    bottomPadding: {
      height: 32,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    passwordModal: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
      textAlign: 'center',
    },
    passwordInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: colors.error,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.white,
    },
  });
