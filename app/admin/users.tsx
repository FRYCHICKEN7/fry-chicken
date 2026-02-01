import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Edit2, Trash2, X, UserCircle2, RefreshCw, Coins, Key, Mail } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { firebaseService } from '@/services/firebase-service';
import { User } from '@/types';
import { trpc } from '@/lib/trpc';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function UsersManagementScreen() {
  const { colors } = useTheme();
  const { user: currentUser, createAdminUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userPointsMap, setUserPointsMap] = useState<Record<string, { points: number; totalEarned: number }>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    identityNumber: '',
    role: '' as 'admin' | 'branch' | 'delivery' | 'customer',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState<User | null>(null);
  const [pointsToAssign, setPointsToAssign] = useState('');
  const [isAssigningPoints, setIsAssigningPoints] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [createAdminModalVisible, setCreateAdminModalVisible] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const deleteUserMutation = trpc.users.deleteUser.useMutation();
  const syncDeletedUsersMutation = trpc.users.syncDeletedUsers.useMutation();
  const updatePasswordMutation = trpc.users.updatePassword.useMutation();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.replace('/');
      return;
    }

    const unsubscribe = firebaseService.users.getAll((fetchedUsers) => {
      console.log('👥 Users loaded:', fetchedUsers.length);
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
      setIsLoading(false);

      const customerUsers = fetchedUsers.filter(u => u.role === 'customer');
      console.log('💎 Loading points for', customerUsers.length, 'customers');
      
      customerUsers.forEach(async (user) => {
        try {
          const points = await firebaseService.userPoints.getById(user.id);
          if (points) {
            setUserPointsMap(prev => ({
              ...prev,
              [user.id]: {
                points: points.availablePoints || 0,
                totalEarned: points.totalPoints || 0,
              }
            }));
          }
        } catch {
          console.log('⚠️ No points found for user:', user.id);
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.identityNumber?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      identityNumber: user.identityNumber || '',
      role: user.role,
    });
    setEditModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    if (!editForm.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      setIsSaving(true);
      console.log('💾 Updating user:', selectedUser.id);

      const updates: Partial<User> = {
        name: editForm.name.trim(),
      };

      if (editForm.email && editForm.email.trim()) {
        updates.email = editForm.email.trim();
      }

      if (editForm.phone && editForm.phone.trim()) {
        updates.phone = editForm.phone.trim();
      }

      if (editForm.identityNumber && editForm.identityNumber.trim()) {
        updates.identityNumber = editForm.identityNumber.trim();
      }

      await firebaseService.users.update(selectedUser.id, updates);

      Alert.alert('Éxito', 'Usuario actualizado correctamente');
      setEditModalVisible(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      Alert.alert('Error', error.message || 'Error al actualizar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncWithFirebase = async () => {
    Alert.alert(
      'Sincronizar con Firebase',
      'Esta acción verificará y eliminará de Firebase Authentication y Firestore los usuarios que ya no existen en el sistema local.\n\nEsto es útil si algunos usuarios se eliminaron incorrectamente y siguen apareciendo como registrados.\n\n¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            try {
              setIsSyncing(true);
              console.log('🔄 Starting Firebase sync...');

              const firebaseUsersSnapshot = await firebaseService.users.getAllSnapshot();
              const localUserIds = users.map(u => u.id);

              const usersToDelete = firebaseUsersSnapshot.filter(
                fbUser => !localUserIds.includes(fbUser.id)
              );

              if (usersToDelete.length === 0) {
                Alert.alert('Sincronización completa', 'No se encontraron usuarios para eliminar. Todo está sincronizado.');
                return;
              }

              console.log(`🗑️ Found ${usersToDelete.length} users to delete from Firebase`);

              const currentUserAuth = auth.currentUser;
              const adminToken = currentUserAuth ? await currentUserAuth.getIdToken() : '';

              const userIdsToDelete = usersToDelete.map(u => u.id);
              try {
                const result = await syncDeletedUsersMutation.mutateAsync({
                  userIds: userIdsToDelete,
                  adminToken,
                });
                console.log('✅ Users deleted from Firebase Auth:', result.results);
              } catch (error: any) {
                console.log('⚠️ Error syncing Auth (continuing with Firestore):', error.message);
              }

              for (const user of usersToDelete) {
                console.log(`🗑️ Deleting user from Firestore: ${user.name} (${user.id})`);
                await firebaseService.users.delete(user.id);

                if (user.role === 'customer') {
                  try {
                    const userPoints = await firebaseService.userPoints.getById(user.id);
                    if (userPoints) {
                      await firebaseService.userPoints.delete(user.id);
                      console.log('✅ User points deleted for:', user.id);
                    }
                  } catch (error) {
                    console.log('⚠️ No user points to delete or error:', error);
                  }
                }
              }

              Alert.alert(
                'Sincronización exitosa',
                `Se eliminaron ${usersToDelete.length} usuario${usersToDelete.length !== 1 ? 's' : ''} de Firebase Authentication y Firestore.`
              );
              console.log('✅ Firebase sync completed');
            } catch (error: any) {
              console.error('❌ Error syncing with Firebase:', error);
              Alert.alert('Error', error.message || 'Error al sincronizar con Firebase');
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleAssignPoints = (user: User) => {
    setSelectedUserForPoints(user);
    setPointsToAssign('');
    setPointsModalVisible(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const handleSendPasswordReset = async (user: User) => {
    if (!user.email) {
      Alert.alert('Error', 'Este usuario no tiene correo electrónico registrado');
      return;
    }

    Alert.alert(
      'Enviar Correo de Recuperación',
      `¿Deseas enviar un correo de recuperación de contraseña a ${user.name}?\n\nSe enviará un correo a: ${user.email}\n\nEl usuario recibirá un enlace seguro de Firebase para restablecer su contraseña.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              console.log('📧 Enviando correo de recuperación a:', user.email);
              await sendPasswordResetEmail(auth, user.email!);
              Alert.alert(
                'Correo Enviado',
                `Se ha enviado un correo de recuperación de contraseña a ${user.email}\n\nEl usuario debe revisar su bandeja de entrada y spam.`
              );
            } catch (error: any) {
              console.error('❌ Error enviando correo:', error);
              let errorMessage = 'No se pudo enviar el correo de recuperación';
              
              if (error.code === 'auth/user-not-found') {
                errorMessage = 'El usuario no está registrado en Firebase Authentication';
              } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El correo electrónico no es válido';
              } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos. Por favor intenta más tarde';
              }
              
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleSavePassword = async () => {
    if (!selectedUserForPassword) return;

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      setIsChangingPassword(true);
      console.log('🔐 Changing password for user:', selectedUserForPassword.id);

      const currentUserAuth = auth.currentUser;
      const adminToken = currentUserAuth ? await currentUserAuth.getIdToken() : '';

      await updatePasswordMutation.mutateAsync({
        userId: selectedUserForPassword.id,
        newPassword: newPassword.trim(),
        adminToken,
      });

      Alert.alert(
        'Éxito',
        `La contraseña de ${selectedUserForPassword.name} se actualizó correctamente en Firebase Authentication`
      );
      setPasswordModalVisible(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      Alert.alert('Error', error.message || 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePoints = async () => {
    if (!selectedUserForPoints) return;

    const points = parseInt(pointsToAssign, 10);
    if (isNaN(points) || points <= 0) {
      Alert.alert('Error', 'Por favor ingresa una cantidad válida de puntos mayor a 0');
      return;
    }

    try {
      setIsAssigningPoints(true);
      console.log('💎 Assigning points to user:', selectedUserForPoints.id, 'Points:', points);

      const existingPoints = await firebaseService.userPoints.getById(selectedUserForPoints.id);

      if (existingPoints) {
        const newTotal = (existingPoints.totalPoints || 0) + points;
        const newAvailable = (existingPoints.availablePoints || 0) + points;
        await firebaseService.userPoints.update(selectedUserForPoints.id, {
          totalPoints: newTotal,
          availablePoints: newAvailable,
        });
        console.log('✅ Points updated. New total:', newTotal, 'Available:', newAvailable);
      } else {
        await firebaseService.userPoints.create({
          userId: selectedUserForPoints.id,
          totalPoints: points,
          availablePoints: points,
        });
        console.log('✅ Points created for user:', points);
      }

      Alert.alert(
        'Éxito',
        `Se asignaron ${points} punto${points !== 1 ? 's' : ''} a ${selectedUserForPoints.name}`
      );
      setPointsModalVisible(false);
      setSelectedUserForPoints(null);
    } catch (error: any) {
      console.error('❌ Error assigning points:', error);
      Alert.alert('Error', error.message || 'Error al asignar puntos');
    } finally {
      setIsAssigningPoints(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'No puedes eliminar tu propia cuenta desde aquí');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar al usuario "${user.name}"?\n\nEsta acción eliminará:\n- La cuenta del usuario de Firebase Authentication\n- Sus datos de Firestore\n- Sus puntos acumulados\n- Su información personal\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting user:', user.id);

              const currentUserAuth = auth.currentUser;
              const adminToken = currentUserAuth ? await currentUserAuth.getIdToken() : '';

              try {
                await deleteUserMutation.mutateAsync({
                  userId: user.id,
                  adminToken,
                });
                console.log('✅ User deleted from Firebase Auth');
              } catch (error: any) {
                console.log('⚠️ Error deleting from Auth (continuing):', error.message);
              }

              await firebaseService.users.delete(user.id);

              if (user.role === 'customer') {
                try {
                  const userPoints = await firebaseService.userPoints.getById(user.id);
                  if (userPoints) {
                    await firebaseService.userPoints.delete(user.id);
                    console.log('✅ User points deleted');
                  }
                } catch (error) {
                  console.log('⚠️ No user points to delete or error:', error);
                }
              }

              Alert.alert('Éxito', 'Usuario eliminado correctamente de todos los sistemas');
            } catch (error: any) {
              console.error('❌ Error deleting user:', error);
              Alert.alert('Error', error.message || 'Error al eliminar usuario');
            }
          },
        },
      ]
    );
  };

  const handleCreateAdmin = async () => {
    if (!newAdminForm.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!newAdminForm.email.trim() || !newAdminForm.email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un correo electrónico válido');
      return;
    }

    if (!newAdminForm.password.trim() || newAdminForm.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setIsCreatingAdmin(true);
      console.log('👤 Creating admin user:', newAdminForm.email);

      await createAdminUser(
        newAdminForm.name.trim(),
        newAdminForm.email.trim(),
        newAdminForm.password.trim()
      );

      Alert.alert(
        'Éxito',
        `El administrador ${newAdminForm.name} ha sido creado correctamente.\n\nCredenciales:\nEmail: ${newAdminForm.email}\nContraseña: ${newAdminForm.password}\n\nEl nuevo administrador puede iniciar sesión con estas credenciales.`
      );
      setCreateAdminModalVisible(false);
      setNewAdminForm({ name: '', email: '', password: '' });
    } catch (error: any) {
      console.error('❌ Error creating admin:', error);
      Alert.alert('Error', error.message || 'Error al crear administrador');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'branch':
        return 'Sucursal';
      case 'delivery':
        return 'Delivery';
      case 'customer':
        return 'Cliente';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#e74c3c';
      case 'branch':
        return '#3498db';
      case 'delivery':
        return '#f39c12';
      case 'customer':
        return '#27ae60';
      default:
        return colors.textMuted;
    }
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gestión de Usuarios',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              {currentUser?.email === 'frychickenhn@gmail.com' && (
                <TouchableOpacity
                  onPress={() => setCreateAdminModalVisible(true)}
                  style={styles.createAdminButton}
                >
                  <Text style={[styles.createAdminButtonText, { color: colors.primary }]}>+ Admin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSyncWithFirebase}
                style={[styles.syncButton, isSyncing && styles.disabledButton]}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por nombre, email, teléfono o DNI..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Cargando usuarios...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado
              {filteredUsers.length !== 1 ? 's' : ''}
            </Text>

            {filteredUsers.map((user) => (
              <View
                key={user.id}
                style={[styles.userCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <UserCircle2 size={40} color={colors.primary} />
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>
                        {user.name}
                      </Text>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleColor(user.role) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            { color: getRoleColor(user.role) },
                          ]}
                        >
                          {getRoleLabel(user.role)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {currentUser?.email === 'frychickenhn@gmail.com' && user.role === 'customer' && (
                      <TouchableOpacity
                        onPress={() => handleAssignPoints(user)}
                        style={[styles.actionButton, { backgroundColor: '#f39c12' + '20' }]}
                      >
                        <Coins size={18} color="#f39c12" />
                      </TouchableOpacity>
                    )}

                    {user.email && (
                      <TouchableOpacity
                        onPress={() => handleSendPasswordReset(user)}
                        style={[styles.actionButton, { backgroundColor: '#3498db' + '20' }]}
                      >
                        <Mail size={18} color="#3498db" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleChangePassword(user)}
                      style={[styles.actionButton, { backgroundColor: '#9b59b6' + '20' }]}
                    >
                      <Key size={18} color="#9b59b6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleEditUser(user)}
                      style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                    >
                      <Edit2 size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteUser(user)}
                      style={[styles.actionButton, { backgroundColor: '#e74c3c20' }]}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2
                        size={18}
                        color={user.id === currentUser?.id ? colors.textMuted : '#e74c3c'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.userDataContainer, { borderTopColor: colors.border }]}>
                  {user.email && (
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textMuted }]}>
                        Email:
                      </Text>
                      <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                        {user.email}
                      </Text>
                    </View>
                  )}

                  {user.phone && (
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textMuted }]}>
                        Teléfono:
                      </Text>
                      <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                        {user.phone}
                      </Text>
                    </View>
                  )}

                  {user.identityNumber && (
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textMuted }]}>DNI:</Text>
                      <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                        {user.identityNumber}
                      </Text>
                    </View>
                  )}

                  {user.branchId && (
                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textMuted }]}>
                        Sucursal ID:
                      </Text>
                      <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                        {user.branchId}
                      </Text>
                    </View>
                  )}

                  {user.role === 'customer' && userPointsMap[user.id] && (
                    <View style={[styles.pointsRow, { backgroundColor: '#f39c12' + '10', borderColor: '#f39c12' + '40' }]}>
                      <Coins size={18} color="#f39c12" />
                      <View style={styles.pointsInfo}>
                        <Text style={[styles.dataLabel, { color: '#f39c12' }]}>
                          Puntos:
                        </Text>
                        <Text style={[styles.pointsValue, { color: '#f39c12' }]}>
                          {userPointsMap[user.id].points.toLocaleString()} disponibles / {userPointsMap[user.id].totalEarned.toLocaleString()} totales
                        </Text>
                      </View>
                    </View>
                  )}

                  {user.role === 'customer' && !userPointsMap[user.id] && (
                    <View style={[styles.pointsRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                      <Coins size={18} color={colors.textMuted} />
                      <View style={styles.pointsInfo}>
                        <Text style={[styles.dataLabel, { color: colors.textMuted }]}>
                          Puntos:
                        </Text>
                        <Text style={[styles.dataValue, { color: colors.textMuted }]}>
                          Sin puntos registrados
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {filteredUsers.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No se encontraron usuarios
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSaving && setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Editar Usuario
              </Text>
              <TouchableOpacity
                onPress={() => !isSaving && setEditModalVisible(false)}
                disabled={isSaving}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.infoBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  ℹ️ Como administrador puedes editar los datos del usuario
                </Text>
              </View>

              {selectedUser && (
                <View style={[styles.roleInfoBox, { backgroundColor: getRoleColor(selectedUser.role) + '15' }]}>
                  <Text style={[styles.roleInfoText, { color: getRoleColor(selectedUser.role) }]}>
                    Rol actual: {getRoleLabel(selectedUser.role)}
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Nombre completo"
                placeholderTextColor={colors.textMuted}
                editable={!isSaving}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSaving}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Teléfono</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="12345678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                editable={!isSaving}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>DNI</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={editForm.identityNumber}
                onChangeText={(text) => setEditForm({ ...editForm, identityNumber: text })}
                placeholder="0801199012345"
                placeholderTextColor={colors.textMuted}
                editable={!isSaving}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                  isSaving && styles.disabledButton,
                ]}
                onPress={handleSaveUser}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pointsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isAssigningPoints && setPointsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Asignar Puntos
              </Text>
              <TouchableOpacity
                onPress={() => !isAssigningPoints && setPointsModalVisible(false)}
                disabled={isAssigningPoints}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.pointsInfoBox, { backgroundColor: '#f39c12' + '15', borderColor: '#f39c12' + '40' }]}>
                <Coins size={20} color="#f39c12" />
                <Text style={[styles.pointsInfoText, { color: '#f39c12' }]}>
                  Solo el administrador principal puede asignar puntos manualmente
                </Text>
              </View>

              {selectedUserForPoints && (
                <View style={styles.userInfoSection}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Usuario</Text>
                  <View style={[styles.userInfoCard, { backgroundColor: colors.background }]}>
                    <UserCircle2 size={32} color={colors.primary} />
                    <View style={styles.userInfoDetails}>
                      <Text style={[styles.userInfoName, { color: colors.textPrimary }]}>
                        {selectedUserForPoints.name}
                      </Text>
                      {selectedUserForPoints.email && (
                        <Text style={[styles.userInfoEmail, { color: colors.textMuted }]}>
                          {selectedUserForPoints.email}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              <Text style={[styles.label, { color: colors.textPrimary }]}>Cantidad de Puntos *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={pointsToAssign}
                onChangeText={setPointsToAssign}
                placeholder="Ejemplo: 100"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                editable={!isAssigningPoints}
              />

              <View style={[styles.pointsHelpBox, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.pointsHelpText, { color: colors.primary }]}>
                  💡 Los puntos se sumarán al saldo actual del usuario y estarán disponibles de inmediato en Firebase
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setPointsModalVisible(false)}
                disabled={isAssigningPoints}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: '#f39c12' },
                  isAssigningPoints && styles.disabledButton,
                ]}
                onPress={handleSavePoints}
                disabled={isAssigningPoints}
              >
                {isAssigningPoints ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    Asignar Puntos
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isChangingPassword && setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Cambiar Contraseña
              </Text>
              <TouchableOpacity
                onPress={() => !isChangingPassword && setPasswordModalVisible(false)}
                disabled={isChangingPassword}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.passwordInfoBox, { backgroundColor: '#9b59b6' + '15', borderColor: '#9b59b6' + '40' }]}>
                <Key size={20} color="#9b59b6" />
                <Text style={[styles.passwordInfoText, { color: '#9b59b6' }]}>
                  La contraseña puede contener letras, números y símbolos. Se actualizará en Firebase Authentication.
                </Text>
              </View>

              {selectedUserForPassword && (
                <View style={styles.userInfoSection}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Usuario</Text>
                  <View style={[styles.userInfoCard, { backgroundColor: colors.background }]}>
                    <UserCircle2 size={32} color={colors.primary} />
                    <View style={styles.userInfoDetails}>
                      <Text style={[styles.userInfoName, { color: colors.textPrimary }]}>
                        {selectedUserForPassword.name}
                      </Text>
                      {selectedUserForPassword.email && (
                        <Text style={[styles.userInfoEmail, { color: colors.textMuted }]}>
                          {selectedUserForPassword.email}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleColor(selectedUserForPassword.role) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            { color: getRoleColor(selectedUserForPassword.role) },
                          ]}
                        >
                          {getRoleLabel(selectedUserForPassword.role)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Text style={[styles.label, { color: colors.textPrimary }]}>Nueva Contraseña *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo 6 caracteres (letras, números, símbolos)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                editable={!isChangingPassword}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Confirmar Contraseña *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Vuelve a escribir la contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                editable={!isChangingPassword}
              />

              <View style={[styles.passwordHelpBox, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.passwordHelpText, { color: colors.primary }]}>
                  💡 Puede usar cualquier combinación de letras, números y símbolos especiales (@, #, $, %, etc.). El cambio se aplicará inmediatamente.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setPasswordModalVisible(false)}
                disabled={isChangingPassword}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: '#9b59b6' },
                  isChangingPassword && styles.disabledButton,
                ]}
                onPress={handleSavePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    Cambiar Contraseña
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={createAdminModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isCreatingAdmin && setCreateAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Crear Administrador
              </Text>
              <TouchableOpacity
                onPress={() => !isCreatingAdmin && setCreateAdminModalVisible(false)}
                disabled={isCreatingAdmin}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.infoBox, { backgroundColor: '#e74c3c' + '15', borderColor: '#e74c3c' + '40' }]}>
                <Text style={[styles.infoText, { color: '#e74c3c' }]}>
                  ⚠️ Solo el administrador principal (frychickenhn@gmail.com) puede crear otros administradores
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre Completo *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={newAdminForm.name}
                onChangeText={(text) => setNewAdminForm({ ...newAdminForm, name: text })}
                placeholder="Nombre del administrador"
                placeholderTextColor={colors.textMuted}
                editable={!isCreatingAdmin}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={newAdminForm.email}
                onChangeText={(text) => setNewAdminForm({ ...newAdminForm, email: text })}
                placeholder="admin@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isCreatingAdmin}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Contraseña *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.textPrimary },
                ]}
                value={newAdminForm.password}
                onChangeText={(text) => setNewAdminForm({ ...newAdminForm, password: text })}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                editable={!isCreatingAdmin}
              />

              <View style={[styles.passwordHelpBox, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.passwordHelpText, { color: colors.primary }]}>
                  💡 El nuevo administrador se creará en Firebase Authentication y Firestore con rol &quot;admin&quot;
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setCreateAdminModalVisible(false)}
                disabled={isCreatingAdmin}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: '#e74c3c' },
                  isCreatingAdmin && styles.disabledButton,
                ]}
                onPress={handleCreateAdmin}
                disabled={isCreatingAdmin}
              >
                {isCreatingAdmin ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    Crear Administrador
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  syncButton: {
    padding: 8,
  },
  createAdminButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAdminButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  countText: {
    fontSize: 14,
    marginBottom: 12,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  userDetails: {
    flex: 1,
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
  },
  userDataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 90,
  },
  dataValue: {
    fontSize: 14,
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  roleInfoBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  roleInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  pointsInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  pointsInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  userInfoSection: {
    marginBottom: 16,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  userInfoDetails: {
    flex: 1,
  },
  userInfoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userInfoEmail: {
    fontSize: 13,
  },
  pointsHelpBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  pointsHelpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  pointsInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  passwordInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  passwordInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  passwordHelpBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  passwordHelpText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
