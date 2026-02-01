import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  User,
  MapPin,
  CreditCard,
  Bell,
  HelpCircle,
  MessageSquare,
  LogOut,
  ChevronRight,
  Shield,
  Star,
  Trash2,
  Store,
  BarChart3,
  Users,
  Tag,
  Package,
  Building2,
  Moon,
  Sun,
  Image as ImageIcon,
  ClipboardList,
  Smartphone,
  Palette,
  Clock,
  Megaphone,
  Database,
  RefreshCcw,
  Key,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";


interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  rightElement?: React.ReactNode;
}

function MenuItem({ icon, title, subtitle, onPress, showBadge, rightElement }: MenuItemProps) {
  const { colors, isDark } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.menuItemIcon, { backgroundColor: colors.surfaceLight }]}>{icon}</View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemTitle, { color: isDark ? '#FCBA1D' : colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuItemSubtitle, { color: isDark ? '#FFFFFF' : colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <View style={styles.menuItemRight}>
        {showBadge && <View style={[styles.badge, { backgroundColor: colors.accent }]} />}
        {rightElement || <ChevronRight size={20} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, isAutoMode, toggleTheme, enableAutoTheme } = useTheme();
  const { user, isAuthenticated, logout, deleteAccount } = useAuth();
  const { refreshUserPointsFromFirebase, pointsSettings, resetAllSalesAndOrders, clearProductsCache, isSyncing, userPoints: allUserPoints, updateDeliveryUserStatus, deliveryUsers } = useData();


  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isRefreshingPoints, setIsRefreshingPoints] = useState(false);
  const [deliveryIsActive, setDeliveryIsActive] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  React.useEffect(() => {
    if (user?.role === 'delivery') {
      const deliveryUser = deliveryUsers.find(d => d.id === user.id);
      if (deliveryUser) {
        setDeliveryIsActive(deliveryUser.isActive ?? true);
        console.log('🚩 Loaded delivery status:', deliveryUser.isActive ?? true);
      }
    }
  }, [user, deliveryUsers]);

  const userPoints = user ? allUserPoints.find(up => up.userId === user.id) : null;

  const handleRefreshPoints = async () => {
    if (!user) return;
    try {
      setIsRefreshingPoints(true);
      console.log('🔄 Refreshing points for user:', user.id);
      const updated = await refreshUserPointsFromFirebase(user.id);
      Alert.alert(
        "Puntos Actualizados",
        `Tus puntos se han actualizado correctamente. Puntos actuales: ${(updated?.availablePoints ?? 0).toLocaleString()}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error refreshing points:', error);
      Alert.alert(
        "Error",
        "No se pudieron actualizar los puntos. Intenta nuevamente.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRefreshingPoints(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar Cuenta",
      "⚠️ ADVERTENCIA: Esta acción eliminará permanentemente tu cuenta y todos tus datos incluyendo:\n\n• Información personal\n• Historial de pedidos\n• Puntos acumulados\n• Direcciones guardadas\n\n¿Estás seguro de continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert(
                "Cuenta Eliminada",
                "Tu cuenta ha sido eliminada exitosamente. Puedes registrarte nuevamente cuando lo desees.",
                [{ text: "OK" }]
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "No se pudo eliminar la cuenta. Intenta nuevamente.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleResetSalesAndOrders = () => {
    setPasswordInput("");
    setShowPasswordModal(true);
  };

  const handleConfirmPassword = async () => {
    try {
      const storedAdminPassword = await AsyncStorage.getItem('admin_password');
      const actualAdminPassword = storedAdminPassword || 'FRY2027';
      
      if (passwordInput !== actualAdminPassword) {
        Alert.alert(
          "Error",
          "Contraseña incorrecta. No se puede continuar con el reinicio.",
          [{ text: "OK" }]
        );
        return;
      }

      setShowPasswordModal(false);
      setPasswordInput("");

      Alert.alert(
        "Reiniciar Ventas y Pedidos",
        "⚠️ ADVERTENCIA: Esta acción eliminará todos los pedidos y ventas de todas las sucursales. Esta acción no se puede deshacer.\n\n¿Estás seguro de continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Continuar",
            style: "destructive",
            onPress: async () => {
              const success = await resetAllSalesAndOrders();
              if (success) {
                Alert.alert(
                  "Reinicio Exitoso",
                  "Todos los pedidos y ventas han sido eliminados correctamente.",
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert(
                  "Error",
                  "Hubo un error al reiniciar los datos. Intenta nuevamente.",
                  [{ text: "OK" }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error verifying password:', error);
      Alert.alert(
        "Error",
        "Hubo un error al verificar la contraseña. Intenta nuevamente.",
        [{ text: "OK" }]
      );
    }
  };

  const getRoleBadge = () => {
    if (!user) return null;
    const roleLabels: Record<string, { label: string; color: string }> = {
      admin: { label: "Administrador", color: colors.accent },
      branch: { label: "Sucursal", color: "#3B82F6" },
      delivery: { label: "Repartidor", color: colors.success },
      customer: { label: "Cliente", color: colors.primary },
    };
    const role = roleLabels[user.role];
    return (
      <View style={[styles.roleBadge, { backgroundColor: role.color + "20" }]}>
        <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
      </View>
    );
  };

  const ThemeToggle = () => (
    <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
      {isDark ? (
        <Sun size={22} color={colors.primary} />
      ) : (
        <Moon size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mi Cuenta</Text>
          <ThemeToggle />
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.guestAvatarContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Image
              source={{ uri: "https://frychickenhn.com/wp-content/uploads/2022/01/512.png" }}
              style={styles.guestAvatar}
            />
          </View>
          <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>¡Bienvenido a Fry Chicken!</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Inicia sesión para acceder a tu historial, guardar direcciones y más
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={[styles.loginButtonText, { color: colors.secondary }]}>Iniciar Sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.registerButton, { borderColor: colors.primary }]}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={[styles.registerButtonText, { color: colors.primary }]}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon={<HelpCircle size={22} color={colors.textSecondary} />}
            title="Centro de Ayuda"
            onPress={() => router.push("/help" as any)}
          />
          <MenuItem
            icon={<MessageSquare size={22} color={colors.textSecondary} />}
            title="Quejas y Sugerencias"
            subtitle="¿Problemas con tu pedido?"
            onPress={() => router.push("/complaints" as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const renderAdminMenu = () => (
    <>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Administración</Text>
        <MenuItem
          icon={<ClipboardList size={22} color={colors.primary} />}
          title="Gestionar Pedidos"
          subtitle="Ver todos los pedidos del sistema"
          onPress={() => router.push("/admin/orders" as any)}
        />
        <MenuItem
          icon={<Store size={22} color={colors.primary} />}
          title="Gestionar Sucursales"
          subtitle="Crear, editar sucursales"
          onPress={() => router.push("/admin/branches" as any)}
        />
        <MenuItem
          icon={<MapPin size={22} color="#3B82F6" />}
          title="Gestionar Municipios"
          subtitle="Asignar sucursales a municipios"
          onPress={() => router.push("/admin/municipalities" as any)}
        />
        <MenuItem
          icon={<MapPin size={22} color={colors.success} />}
          title="Zonas de Envío"
          subtitle="Configurar zonas por sucursal"
          onPress={() => router.push("/admin/delivery-zones" as any)}
        />
        <MenuItem
          icon={<BarChart3 size={22} color="#3B82F6" />}
          title="Estadísticas"
          subtitle="Ventas, pedidos, reportes"
          onPress={() => router.push("/admin/statistics" as any)}
        />
        <MenuItem
          icon={<Package size={22} color={colors.accent} />}
          title="Gestionar Productos"
          subtitle="Catálogo y categorías"
          onPress={() => router.push("/admin/products" as any)}
        />
        <MenuItem
          icon={<Tag size={22} color="#8B5CF6" />}
          title="Cupones"
          subtitle="Crear descuentos y promociones"
          onPress={() => router.push("/admin/coupons" as any)}
        />
        <MenuItem
          icon={<ImageIcon size={22} color={colors.primary} />}
          title="Promociones"
          subtitle="Banners y promociones"
          onPress={() => router.push("/admin/promotions" as any)}
        />
        <MenuItem
          icon={<Users size={22} color={colors.textSecondary} />}
          title="Repartidores"
          subtitle="Aprobar y gestionar delivery"
          onPress={() => router.push("/admin/delivery" as any)}
        />
        <MenuItem
          icon={<Shield size={22} color="#8B5CF6" />}
          title="Gestionar Usuarios"
          subtitle="Editar y eliminar usuarios"
          onPress={() => router.push("/admin/users" as any)}
        />
        <MenuItem
          icon={<Key size={22} color="#F59E0B" />}
          title="Recuperación de Contraseñas"
          subtitle="Gestionar solicitudes de recuperación"
          onPress={() => router.push("/admin/password-recovery" as any)}
        />
        <MenuItem
          icon={<MessageSquare size={22} color={colors.accent} />}
          title="Quejas Recibidas"
          subtitle="Ver y responder quejas"
          onPress={() => router.push("/admin/complaints-received" as any)}
        />
        <MenuItem
          icon={<Building2 size={22} color={colors.success} />}
          title="Cuentas Bancarias"
          subtitle="Configurar métodos de pago"
          onPress={() => router.push("/admin/bank-accounts" as any)}
        />
      </View>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Configuración Avanzada</Text>
        <MenuItem
          icon={<Palette size={22} color="#8B5CF6" />}
          title="Editor de Tema"
          subtitle="Colores, fuentes y estilos"
          onPress={() => router.push("/admin/theme-editor" as any)}
        />
        <MenuItem
          icon={<Megaphone size={22} color={colors.accent} />}
          title="Marketing Popup"
          subtitle="Imagen promocional de inicio"
          onPress={() => router.push("/admin/marketing-popup" as any)}
        />
        <MenuItem
          icon={<Star size={22} color={colors.primary} />}
          title="Sistema de Puntos"
          subtitle="Configurar programa de fidelidad"
          onPress={() => router.push("/admin/points-settings" as any)}
        />
        <MenuItem
          icon={<Database size={22} color="#3B82F6" />}
          title="Backup"
          subtitle="Guardar y restaurar datos"
          onPress={() => router.push("/admin/backup" as any)}
        />
        <MenuItem
          icon={<Database size={22} color={colors.primary} />}
          title="Inicializar Datos"
          subtitle="Crear municipios y zonas de envío"
          onPress={() => router.push("/admin/initialize-data" as any)}
        />
        <MenuItem
          icon={<RefreshCcw size={22} color="#10B981" />}
          title="Sincronizar con WooCommerce"
          subtitle={isSyncing ? "Sincronizando..." : "Actualizar productos e imágenes"}
          onPress={() => {
            Alert.alert(
              "Sincronizar con WooCommerce",
              "Esto actualizará todos los productos, categorías e imágenes desde WooCommerce. ¿Deseas continuar?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sincronizar",
                  onPress: async () => {
                    try {
                      await clearProductsCache();
                      Alert.alert(
                        "Sincronización Completada",
                        "Los productos y sus imágenes se han actualizado desde WooCommerce.",
                        [{ text: "OK" }]
                      );
                    } catch {
                      Alert.alert(
                        "Error",
                        "No se pudo sincronizar con WooCommerce. Verifica tu conexión a internet.",
                        [{ text: "OK" }]
                      );
                    }
                  },
                },
              ]
            );
          }}
        />
        <MenuItem
          icon={<RefreshCcw size={22} color={colors.accent} />}
          title="Reiniciar Ventas y Pedidos"
          subtitle="⚠️ Eliminar todos los pedidos"
          onPress={handleResetSalesAndOrders}
        />
      </View>
    </>
  );

  const renderBranchMenu = () => (
    <>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Gestión de Sucursal</Text>
        <MenuItem
          icon={<ClipboardList size={22} color={colors.primary} />}
          title="Gestionar Pedidos"
          subtitle="Recibidos, preparando, despachados"
          onPress={() => router.push("/admin/orders" as any)}
        />
        <MenuItem
          icon={<MapPin size={22} color={colors.success} />}
          title="Mis Zonas de Envío"
          subtitle="Configurar zonas de entrega"
          onPress={() => router.push("/admin/zones" as any)}
        />
        <MenuItem
          icon={<BarChart3 size={22} color="#3B82F6" />}
          title="Estadísticas"
          subtitle="Ventas y pedidos"
          onPress={() => router.push("/admin/statistics" as any)}
        />
        <MenuItem
          icon={<Users size={22} color={colors.textSecondary} />}
          title="Repartidores"
          subtitle="Ver repartidores asignados"
          onPress={() => router.push("/admin/delivery" as any)}
        />
        <MenuItem
          icon={<MessageSquare size={22} color={colors.accent} />}
          title="Quejas Recibidas"
          subtitle="Ver y responder quejas"
          onPress={() => router.push("/admin/complaints-received" as any)}
        />
        <MenuItem
          icon={<Clock size={22} color={"#F59E0B"} />}
          title="Horarios de Atención"
          subtitle="Configurar apertura y cierre"
          onPress={() => router.push("/branch/business-hours" as any)}
        />
      </View>
    </>
  );

  const handleToggleDeliveryStatus = async () => {
    if (!user || isUpdatingStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      const newStatus = !deliveryIsActive;
      console.log('🔄 Updating delivery status to:', newStatus);
      
      await updateDeliveryUserStatus(user.id, newStatus);
      setDeliveryIsActive(newStatus);
      
      Alert.alert(
        "Estado Actualizado",
        `Ahora estás ${newStatus ? 'ACTIVO' : 'INACTIVO'}. Las sucursales pueden ver tu estado en tiempo real.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      Alert.alert(
        "Error",
        "No se pudo actualizar el estado. Intenta nuevamente.",
        [{ text: "OK" }]
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderDeliveryMenu = () => (
    <>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Mi Estado</Text>
        <View style={[styles.menuItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.menuItemIcon, { backgroundColor: colors.surfaceLight }]}>
            <User size={22} color={deliveryIsActive ? colors.success : colors.textMuted} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: isDark ? '#FCBA1D' : colors.textPrimary }]}>Estado de Trabajo</Text>
            <Text style={[styles.menuItemSubtitle, { color: isDark ? '#FFFFFF' : colors.textSecondary }]}>
              {deliveryIsActive ? 'Disponible para entregas' : 'No disponible'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.statusToggle, { backgroundColor: deliveryIsActive ? colors.success : colors.textMuted }]}
            onPress={handleToggleDeliveryStatus}
            disabled={isUpdatingStatus}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusToggleText, { color: colors.white }]}>
              {deliveryIsActive ? 'ACTIVO' : 'INACTIVO'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Mi Trabajo</Text>
        <MenuItem
          icon={<BarChart3 size={22} color="#3B82F6" />}
          title="Mi Rendimiento"
          subtitle="Estadísticas personales"
          onPress={() => router.push("/admin/statistics" as any)}
        />
      </View>
    </>
  );

  const renderCustomerMenu = () => (
    <>
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Mi Cuenta</Text>
        <MenuItem
          icon={<User size={22} color={colors.textSecondary} />}
          title="Datos Personales"
          onPress={() => router.push("/edit-profile" as any)}
        />
        <MenuItem
          icon={<Store size={22} color={colors.primary} />}
          title="Cambiar Sucursal"
          subtitle="Seleccionar otra sucursal"
          onPress={() => {
            Alert.alert(
              "Cambiar Sucursal",
              "¿Deseas cambiar tu sucursal? Esto te llevará a la pantalla de selección.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Cambiar",
                  onPress: () => {
                    router.push("/select-branch" as any);
                  },
                },
              ]
            );
          }}
        />
        <MenuItem
          icon={<MapPin size={22} color={colors.textSecondary} />}
          title="Mis Direcciones"
          subtitle="Gestiona tus direcciones de entrega"
          onPress={() => Alert.alert(
            "Mis Direcciones", 
            "Las direcciones se guardan automáticamente cuando realizas un pedido. Podrás seleccionar direcciones guardadas en tu próximo pedido."
          )}
        />
        <MenuItem
          icon={<CreditCard size={22} color={colors.textSecondary} />}
          title="Métodos de Pago"
          subtitle="Efectivo y transferencias"
          onPress={() => Alert.alert(
            "Métodos de Pago Disponibles", 
            "• Contra Entrega (Efectivo)\n• Transferencia Bancaria\n\nPuedes ver las cuentas bancarias disponibles al momento de pagar."
          )}
        />
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Preferencias</Text>
        <MenuItem
          icon={<Bell size={22} color={colors.textSecondary} />}
          title="Notificaciones"
          subtitle="Estado de pedidos y promociones"
          onPress={() => Alert.alert(
            "Notificaciones", 
            "Recibirás notificaciones sobre:\n\n• Estado de tus pedidos\n• Nuevas promociones\n• Cupones de descuento\n\nLas notificaciones están habilitadas."
          )}
        />
        <MenuItem
          icon={<Star size={22} color={colors.textSecondary} />}
          title="Mis Reseñas"
          subtitle="Historial de calificaciones"
          onPress={() => Alert.alert(
            "Mis Reseñas", 
            "Después de cada entrega podrás calificar:\n\n⭐ Calidad de la comida\n⭐ Servicio de la sucursal\n⭐ Servicio del repartidor\n\nTus reseñas nos ayudan a mejorar."
          )}
        />
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Zona de Peligro</Text>
        <MenuItem
          icon={<Trash2 size={22} color={colors.accent} />}
          title="Eliminar Cuenta"
          subtitle="Eliminar permanentemente mi cuenta"
          onPress={handleDeleteAccount}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPasswordInput("");
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowPasswordModal(false);
            setPasswordInput("");
          }}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Confirmar Contraseña</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Por seguridad, ingresa tu contraseña de administrador para continuar:
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.surfaceLight }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.accent }]}
                onPress={handleConfirmPassword}
              >
                <Text style={[styles.modalButtonText, { color: colors.white }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mi Cuenta</Text>
          <ThemeToggle />
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.push("/edit-profile" as any)}>
            <Image source={{ uri: user?.profileImage }} style={styles.avatar} />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name}</Text>
            {user?.phone && <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>{user.phone}</Text>}
            {user?.email && <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>{user.email}</Text>}
            {getRoleBadge()}
          </View>
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: colors.surfaceLight }]}
            onPress={() => router.push("/edit-profile" as any)}
          >
            <Text style={[styles.editButtonText, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {user?.role === 'customer' && pointsSettings.enabled && (
          <View style={[styles.pointsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsHeaderLeft}>
                <Star size={24} color={colors.primary} fill={colors.primary} />
                <Text style={[styles.pointsTitle, { color: colors.textPrimary }]}>PUNTOS FRY CHICKEN</Text>
              </View>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: colors.surfaceLight }]}
                onPress={handleRefreshPoints}
                disabled={isRefreshingPoints}
                activeOpacity={0.7}
              >
                <RefreshCcw 
                  size={20} 
                  color={colors.primary} 
                  style={isRefreshingPoints ? styles.spinning : undefined}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.pointsContent}>
              <Text style={[styles.pointsAmount, { color: colors.primary }]}>{(userPoints?.availablePoints ?? 0).toLocaleString()}</Text>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>puntos disponibles</Text>
            </View>
            <View style={[styles.pointsInfo, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.pointsInfoText, { color: colors.textSecondary }]}>🎁 Canjea tus puntos por productos premium</Text>
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Apariencia</Text>
          <MenuItem
            icon={<Smartphone size={22} color={isAutoMode ? colors.success : colors.textSecondary} />}
            title="Tema Automático"
            subtitle="Usar configuración del sistema"
            onPress={enableAutoTheme}
            rightElement={
              <View style={[styles.themeIndicator, { backgroundColor: isAutoMode ? colors.success : colors.surfaceLight }]}>
                <Text style={[styles.themeIndicatorText, { color: isAutoMode ? colors.white : colors.textPrimary }]}>
                  {isAutoMode ? "ON" : "OFF"}
                </Text>
              </View>
            }
          />
          <MenuItem
            icon={isDark ? <Moon size={22} color={colors.primary} /> : <Sun size={22} color={colors.primary} />}
            title={isDark ? "Modo Oscuro" : "Modo Claro"}
            subtitle={isAutoMode ? "Controlado por el sistema" : "Cambiar manualmente"}
            onPress={toggleTheme}
            rightElement={
              <View style={[styles.themeIndicator, { backgroundColor: isDark ? colors.primary : colors.surfaceLight }]}>
                <Text style={[styles.themeIndicatorText, { color: isDark ? colors.secondary : colors.textPrimary }]}>
                  {isDark ? "Oscuro" : "Claro"}
                </Text>
              </View>
            }
          />
        </View>

        {user?.role === 'admin' && renderAdminMenu()}
        {user?.role === 'branch' && renderBranchMenu()}
        {user?.role === 'delivery' && renderDeliveryMenu()}
        {user?.role === 'customer' && renderCustomerMenu()}

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>Soporte</Text>
          <MenuItem
            icon={<HelpCircle size={22} color={colors.textSecondary} />}
            title="Centro de Ayuda"
            onPress={() => router.push("/help" as any)}
          />
          <MenuItem
            icon={<MessageSquare size={22} color={colors.textSecondary} />}
            title="Quejas y Sugerencias"
            onPress={() => router.push("/complaints" as any)}
          />
          <MenuItem
            icon={<Shield size={22} color={colors.textSecondary} />}
            title="Políticas de Privacidad"
            subtitle="Lee nuestras políticas"
            onPress={() => router.push("/privacy-policy" as any)}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={colors.accent} />
          <Text style={[styles.logoutButtonText, { color: colors.accent }]}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Fry Chicken HN v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
  },
  themeToggle: {
    padding: 8,
  },
  guestContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  guestAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 4,
  },
  guestAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  loginButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  registerButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    width: "100%",
    alignItems: "center",
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#FCBA1D',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  profileDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
    gap: 4,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 20,
  },
  menuItemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themeIndicatorText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  pointsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pointsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointsTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  spinning: {
    transform: [{ rotate: "0deg" }],
  },
  pointsContent: {
    alignItems: "center",
    marginVertical: 8,
  },
  pointsAmount: {
    fontSize: 48,
    fontWeight: "800" as const,
  },
  pointsLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  pointsInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  pointsInfoText: {
    fontSize: 13,
    textAlign: "center",
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {},
  modalButtonConfirm: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  statusToggle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  statusToggleText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
