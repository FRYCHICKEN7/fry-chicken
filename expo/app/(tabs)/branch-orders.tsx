import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Package,
  ChefHat,
  CheckCircle,
  Truck,
  X,
  Search,
  User,
  ChevronRight,
  AlertCircle,
  XCircle,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Order, OrderStatus, DeliveryUser } from "@/types";
import { sortOrdersByPriorityAndTime } from "@/lib/orderSorting";
import { formatPhoneNumberForWhatsApp } from "@/lib/formatPhoneNumber";

type FilterStatus = "all" | "pending" | "preparing" | "ready" | "dispatched" | "delivered";

export default function BranchOrdersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { updateOrderStatus, getOrdersByBranch, getDeliveryUsersByBranch, deliveryUsers, approveOrderClaim } = useData();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const branchId = user?.branchId || "";
  
  console.log('🏢 [BRANCH ORDERS TAB] Current user:', {
    userId: user?.id,
    role: user?.role,
    branchId: branchId,
    name: user?.name
  });
  
  const branchOrders = getOrdersByBranch(branchId);
  const branchDeliveryUsers = getDeliveryUsersByBranch(branchId).filter(d => d.status === 'approved');
  
  console.log('📦 [BRANCH ORDERS TAB] Orders for this branch:', {
    branchId: branchId,
    totalOrders: branchOrders.length,
    orders: branchOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      branchId: o.branchId
    }))
  });

  const filteredOrders = sortOrdersByPriorityAndTime(
    branchOrders.filter((order) => {
      if (filter === "all") return true;
      return order.status === filter;
    })
  );
  
  console.log('📋 [BRANCH ORDERS TAB] Filtered orders:', filteredOrders.length);

  const filteredDeliveryUsers = branchDeliveryUsers.filter((delivery) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      delivery.name.toLowerCase().includes(query) ||
      delivery.deliveryCode.includes(query)
    );
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      console.log('🔄 [STATUS CHANGE] Updating order:', orderId, 'to:', newStatus);
      await updateOrderStatus(orderId, newStatus);
      console.log('✅ [STATUS CHANGE] Order updated successfully');
      Alert.alert("Éxito", `Estado actualizado a: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('❌ [STATUS CHANGE] Error updating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar el estado';
      Alert.alert("Error", errorMessage);
    }
  };

  const handleAssignDelivery = (order: Order) => {
    setSelectedOrder(order);
    setSearchQuery("");
    setShowDeliverySelector(true);
  };

  const confirmAssignDelivery = async (delivery: DeliveryUser) => {
    if (!selectedOrder) return;

    Alert.alert(
      "Confirmar Asignación",
      `¿Asignar pedido ${selectedOrder.orderNumber} a ${delivery.name} (Código: ${delivery.deliveryCode})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Asignar",
          onPress: async () => {
            await updateOrderStatus(selectedOrder.id, "dispatched", delivery.id, true);
            setShowDeliverySelector(false);
            setSelectedOrder(null);
            Alert.alert("Éxito", `Pedido asignado a ${delivery.name}`);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "#F59E0B";
      case "preparing":
        return "#8B5CF6";
      case "ready":
        return "#10B981";
      case "dispatched":
        return "#3B82F6";
      case "delivered":
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: "Orden Recibida",
      confirmed: "Confirmado",
      preparing: "Orden en Cocina",
      ready: "Orden Lista",
      dispatched: "Asignada a Repartidor",
      delivered: "Entregado",
      rejected: "Rechazado",
    };
    return labels[status];
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Pedidos</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(["all", "pending", "preparing", "ready", "dispatched", "delivered"] as FilterStatus[]).map((f) => {
              const count = f === "all" ? branchOrders.length : branchOrders.filter(o => o.status === f).length;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filter === f && styles.filterButtonTextActive,
                    ]}
                  >
                    {f === "all" ? "Todos" : getStatusLabel(f)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin pedidos</Text>
            <Text style={styles.emptySubtitle}>
              No hay pedidos en esta categoría
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <View 
                key={order.id} 
                style={[
                  styles.orderCard,
                  order.paymentMethod === "transfer" && !order.adminApproved && styles.transferOrderCard
                ]}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString("es-HN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>

                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.orderDetails}
                  onPress={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderDetailsHeader}>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {order.customerName || "Cliente"}
                      </Text>
                      {order.customerPhone && (
                        <View style={styles.phoneRow}>
                          <Phone size={14} color={colors.textSecondary} />
                          <Text style={styles.customerPhone}>{order.customerPhone}</Text>
                        </View>
                      )}
                    </View>
                    {expandedOrderId === order.id ? (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    )}
                  </View>
                  {expandedOrderId === order.id && (
                    <View style={styles.itemsList}>
                      <Text style={styles.itemsTitle}>Productos:</Text>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemText}>
                            {item.quantity}x {item.productName}
                          </Text>
                          <Text style={styles.itemPrice}>L. {(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>L. {order.total.toFixed(2)}</Text>
                </View>

                {order.paymentMethod === "transfer" && !order.adminApproved && (
                  <View style={styles.transferAlertBanner}>
                    <View style={styles.transferAlertIcon}>
                      <CreditCard size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.transferAlertContent}>
                      <Text style={styles.transferAlertTitle}>💳 PAGO POR TRANSFERENCIA</Text>
                      <Text style={styles.transferAlertSubtitle}>
                        ⚠️ Pendiente de aprobación del administrador
                      </Text>
                    </View>
                  </View>
                )}

                {order.customerPhone && (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => {
                      const productsList = order.items.map(item => 
                        `${item.quantity}x ${item.productName} - L. ${(item.price * item.quantity).toFixed(2)}`
                      ).join('\n');
                      
                      const message = encodeURIComponent(
                        `Hola 👋 le saludo de parte de FRY CHICKEN. Tu pedido ${order.orderNumber} con los siguiente orden:\n\n${productsList}\n\nTotal: L. ${order.total.toFixed(2)}\n\nestá siendo procesado 😊 GRACIAS POR SU PREFERENCIA.`
                      );
                      Linking.openURL(`https://wa.me/${formatPhoneNumberForWhatsApp(order.customerPhone)}?text=${message}`);
                    }}
                  >
                    <MessageCircle size={18} color={colors.white} />
                    <Text style={styles.whatsappButtonText}>Contactar por WhatsApp</Text>
                  </TouchableOpacity>
                )}

                {order.status === "pending" && (order.adminApproved || order.paymentMethod === "cash") && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
                    onPress={() => handleStatusChange(order.id, "preparing")}
                  >
                    <ChefHat size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Orden en Cocina</Text>
                  </TouchableOpacity>
                )}

                {order.status === "preparing" && !order.deliveryId && (order.adminApproved || order.paymentMethod === "cash") && (
                  <>
                    <View style={styles.preparingBanner}>
                      <ChefHat size={16} color="#8B5CF6" />
                      <Text style={styles.preparingText}>Esperando a que un repartidor reclame el pedido...</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "#3B82F6", marginTop: 8 }]}
                      onPress={() => handleAssignDelivery(order)}
                    >
                      <Truck size={18} color={colors.white} />
                      <Text style={styles.actionButtonText}>Asignar Repartidor Manualmente</Text>
                    </TouchableOpacity>
                  </>
                )}

                {order.status === "preparing" && order.deliveryId && !order.deliveryRequestedBy && (order.adminApproved || order.paymentMethod === "cash") && (
                  <>
                    <View style={styles.deliveryClaimedInfo}>
                      <Truck size={16} color={colors.success} />
                      <Text style={styles.deliveryClaimedText}>
                        Reclamado por: {deliveryUsers.find(d => d.id === order.deliveryId)?.name || "Repartidor"}
                        {" "}(Código: {deliveryUsers.find(d => d.id === order.deliveryId)?.deliveryCode})
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "#10B981" }]}
                      onPress={() => handleStatusChange(order.id, "ready")}
                    >
                      <CheckCircle size={18} color={colors.white} />
                      <Text style={styles.actionButtonText}>Orden Lista</Text>
                    </TouchableOpacity>
                  </>
                )}

                {order.deliveryRequestedBy && !order.requestApproved && (order.adminApproved || order.paymentMethod === "cash") && (
                  <View style={styles.requestContainer}>
                    <View style={styles.requestHeader}>
                      <AlertCircle size={20} color="#F59E0B" />
                      <Text style={styles.requestTitle}>Solicitud de Pedido Adicional</Text>
                    </View>
                    <Text style={styles.requestMessage}>
                      {deliveryUsers.find(d => d.id === order.deliveryRequestedBy)?.name || "Repartidor"}
                      {" "}solicita tomar este pedido. Ya tiene pedido(s) en curso.
                    </Text>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestButton, { backgroundColor: colors.success }]}
                        onPress={async () => {
                          Alert.alert(
                            "Aprobar Solicitud",
                            "¿Permitir que el repartidor tome este pedido adicional?",
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Aprobar",
                                onPress: async () => {
                                  await approveOrderClaim(order.id, true);
                                  Alert.alert("Aprobado", "El pedido ha sido asignado al repartidor.");
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <CheckCircle size={16} color={colors.white} />
                        <Text style={styles.requestButtonText}>Aprobar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, { backgroundColor: colors.accent }]}
                        onPress={async () => {
                          Alert.alert(
                            "Rechazar Solicitud",
                            "¿Rechazar la solicitud del repartidor?",
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Rechazar",
                                style: "destructive",
                                onPress: async () => {
                                  await approveOrderClaim(order.id, false);
                                  Alert.alert("Rechazado", "La solicitud ha sido rechazada.");
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <XCircle size={16} color={colors.white} />
                        <Text style={styles.requestButtonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {order.status === "ready" && (order.adminApproved || order.paymentMethod === "cash") && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleAssignDelivery(order)}
                  >
                    <Truck size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Entregar al Repartidor</Text>
                  </TouchableOpacity>
                )}

                {order.status === "dispatched" && order.deliveryId && (
                  <View style={styles.deliveryInfo}>
                    <Truck size={16} color={colors.primary} />
                    <Text style={styles.deliveryInfoText}>
                      Asignado a: {deliveryUsers.find(d => d.id === order.deliveryId)?.name || "Repartidor"}
                      {" "}(Código: {deliveryUsers.find(d => d.id === order.deliveryId)?.deliveryCode})
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showDeliverySelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Repartidor</Text>
              <TouchableOpacity onPress={() => setShowDeliverySelector(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o código..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.deliveryList}>
              {filteredDeliveryUsers.length === 0 ? (
                <View style={styles.emptyDeliveryContainer}>
                  <User size={48} color={colors.textMuted} />
                  <Text style={styles.emptyDeliveryText}>
                    {searchQuery ? "No se encontraron repartidores" : "No hay repartidores disponibles"}
                  </Text>
                </View>
              ) : (
                filteredDeliveryUsers.map((delivery) => (
                  <TouchableOpacity
                    key={delivery.id}
                    style={styles.deliveryOption}
                    onPress={() => confirmAssignDelivery(delivery)}
                  >
                    <View style={styles.deliveryOptionIcon}>
                      <User size={24} color={colors.primary} />
                    </View>
                    <View style={styles.deliveryOptionInfo}>
                      <Text style={styles.deliveryOptionName}>{delivery.name}</Text>
                      <Text style={styles.deliveryOptionCode}>
                        Código: {delivery.deliveryCode} • {delivery.phone}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800" as const,
      color: colors.textPrimary,
    },
    filterContainer: {
      paddingVertical: 12,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600" as const,
    },
    filterButtonTextActive: {
      color: colors.secondary,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    ordersList: {
      padding: 16,
      gap: 16,
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transferOrderCard: {
      borderLeftWidth: 8,
      borderLeftColor: "#F59E0B",
      backgroundColor: "#FEF3C7",
      borderColor: "#F59E0B",
      borderWidth: 2,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    orderHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    orderNumber: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    orderDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.white,
    },
    orderDetails: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    orderDetailsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    customerInfo: {
      flex: 1,
    },
    customerName: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    customerPhone: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    itemsList: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    itemsTitle: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    itemText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    itemPrice: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    orderTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginBottom: 12,
    },
    totalLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    whatsappButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#25D366",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
      marginTop: 8,
    },
    whatsappButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    deliveryInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    deliveryInfoText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    preparingBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#8B5CF615",
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    preparingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#8B5CF6",
    },
    deliveryClaimedInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#10B98115",
      padding: 12,
      borderRadius: 10,
      gap: 8,
      marginBottom: 12,
    },
    deliveryClaimedText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#10B981",
    },
    bottomPadding: {
      height: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      margin: 16,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    deliveryList: {
      padding: 16,
      paddingTop: 0,
    },
    emptyDeliveryContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyDeliveryText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: "center",
    },
    deliveryOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryOptionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryOptionInfo: {
      flex: 1,
    },
    deliveryOptionName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    deliveryOptionCode: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    requestContainer: {
      backgroundColor: "#F59E0B15",
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      borderWidth: 1,
      borderColor: "#F59E0B",
    },
    requestHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    requestTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#F59E0B",
    },
    requestMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    requestActions: {
      flexDirection: "row",
      gap: 10,
    },
    requestButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    requestButtonText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    transferAlertBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F59E0B",
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 12,
      marginBottom: 12,
      shadowColor: "#F59E0B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    transferAlertIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    transferAlertContent: {
      flex: 1,
    },
    transferAlertTitle: {
      fontSize: 15,
      fontWeight: "800" as const,
      color: "#FFFFFF",
      marginBottom: 3,
      letterSpacing: 0.3,
    },
    transferAlertSubtitle: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#FFFFFF",
      opacity: 0.95,
    },
  });
