import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  Package,
  ChefHat,
  CheckCircle,
  Truck,
  X,
  Search,
  User,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  AlertCircle,
  HandIcon,
  XCircle,
  Camera,
  AlertTriangle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import OrderCard from "@/components/OrderCard";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import { Order, OrderStatus, DeliveryUser } from "@/types";
import OrdersManagementScreen from "@/app/admin/orders";
import { sortOrdersByPriorityAndTime } from "@/lib/orderSorting";
import { formatPhoneNumberForWhatsApp } from "@/lib/formatPhoneNumber";

type OrderFilter = "all" | "active" | "completed";
type BranchFilterStatus = "all" | "pending" | "preparing" | "ready" | "dispatched" | "delivered";
type DeliveryFilterStatus = "all" | "ready" | "dispatched" | "delivered" | "rejected";

export default function OrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const {
    orders,
    addDeliveryRating,
    addOrderCancellation,
    branches,
  } = useData();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={createStyles(colors).container} edges={["top"]}>
        <View style={createStyles(colors).header}>
          <Text style={createStyles(colors).headerTitle}>Mis Pedidos</Text>
        </View>
        <View style={createStyles(colors).emptyContainer}>
          <View style={createStyles(colors).emptyIconContainer}>
            <ClipboardList size={64} color={colors.primary} />
          </View>
          <Text style={createStyles(colors).emptyTitle}>Inicia sesión para ver tus pedidos</Text>
          <Text style={createStyles(colors).emptySubtitle}>
            Accede a tu historial de pedidos y realiza seguimiento en tiempo real
          </Text>
          <TouchableOpacity
            style={createStyles(colors).loginButton}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={createStyles(colors).loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (user?.role === "admin") {
    return <OrdersManagementScreen />;
  }

  if (user?.role === "branch") {
    return <BranchOrdersView user={user} colors={colors} />;
  }

  if (user?.role === "delivery") {
    return <DeliveryOrdersView user={user} colors={colors} />;
  }

  const userOrders = user?.id ? orders.filter(o => o.customerId === user.id) : [];

  const filteredOrders = userOrders.filter((order) => {
    if (filter === "active") {
      return ["pending", "confirmed", "preparing", "dispatched"].includes(order.status);
    }
    if (filter === "completed") {
      return ["delivered", "rejected"].includes(order.status);
    }
    return true;
  });

  const handleRateDelivery = async (orderId: string, rating: number, reason?: string) => {
    if (!user?.id) return;
    
    const order = orders.find(o => o.id === orderId);
    if (!order?.deliveryId) return;

    try {
      await addDeliveryRating({
        orderId,
        deliveryId: order.deliveryId,
        customerId: user.id,
        rating,
        reason,
      });
    } catch (error) {
      console.log('Error saving rating:', error);
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    if (!user?.id) return;

    try {
      await addOrderCancellation({
        orderId,
        customerId: user.id,
        reason,
      });
    } catch (error) {
      console.log('Error cancelling order:', error);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
      </View>

      <View style={styles.filterContainer}>
        {(["all", "active", "completed"] as OrderFilter[]).map((f) => (
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
              {f === "all" ? "Todos" : f === "active" ? "Activos" : "Completados"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Package size={64} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No hay pedidos</Text>
          <Text style={styles.emptySubtitle}>
            {filter === "active"
              ? "No tienes pedidos activos en este momento"
              : filter === "completed"
              ? "Aún no has completado ningún pedido"
              : "¡Haz tu primer pedido ahora!"}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredOrders}
            renderItem={({ item }) => {
              const branch = branches.find(b => b.id === item.branchId);
              return (
                <OrderCard 
                  order={item} 
                  onPress={() => setSelectedOrderDetails(item)}
                  onRate={handleRateDelivery}
                  onCancel={handleCancelOrder}
                  branchMapsLink={branch?.mapsLink}
                />
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <Modal visible={!!selectedOrderDetails} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalles del Pedido</Text>
                  <TouchableOpacity onPress={() => setSelectedOrderDetails(null)}>
                    <X size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedOrderDetails && (
                    <>
                      <View style={styles.orderDetailSection}>
                        <View style={styles.orderDetailRow}>
                          <Text style={styles.orderDetailLabel}>Número de Orden:</Text>
                          <Text style={styles.orderDetailValue}>{selectedOrderDetails.orderNumber}</Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Text style={styles.orderDetailLabel}>Fecha:</Text>
                          <Text style={styles.orderDetailValue}>
                            {new Date(selectedOrderDetails.createdAt).toLocaleDateString("es-HN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Text style={styles.orderDetailLabel}>Estado:</Text>
                          <View style={[styles.statusBadgeInline, { backgroundColor: getStatusColor(selectedOrderDetails.status, colors) }]}>
                            <Text style={styles.statusTextInline}>{getStatusLabel(selectedOrderDetails.status)}</Text>
                          </View>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Text style={styles.orderDetailLabel}>Tipo de Entrega:</Text>
                          <Text style={styles.orderDetailValue}>
                            {selectedOrderDetails.deliveryType === "pickup" ? "Recoger en tienda" : "Delivery"}
                          </Text>
                        </View>
                        {selectedOrderDetails.deliveryAddress && (
                          <View style={styles.orderDetailRow}>
                            <Text style={styles.orderDetailLabel}>Dirección:</Text>
                            <Text style={[styles.orderDetailValue, { flex: 1, textAlign: "right" }]}>
                              {selectedOrderDetails.deliveryAddress}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.productsSection}>
                        <Text style={styles.sectionTitle}>Productos</Text>
                        {selectedOrderDetails.items.map((item, idx) => (
                          <View key={idx} style={styles.productItem}>
                            <View style={styles.productInfo}>
                              <Text style={styles.productQuantity}>{item.quantity}x</Text>
                              <View style={styles.productDetails}>
                                <Text style={styles.productName}>{item.productName}</Text>
                              </View>
                            </View>
                            <Text style={styles.productPrice}>L. {item.price.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.summarySection}>
                        <Text style={styles.sectionTitle}>Resumen</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Subtotal:</Text>
                          <Text style={styles.summaryValue}>L. {selectedOrderDetails.subtotal.toFixed(2)}</Text>
                        </View>
                        {selectedOrderDetails.deliveryFee > 0 && (
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Envío:</Text>
                            <Text style={styles.summaryValue}>L. {selectedOrderDetails.deliveryFee.toFixed(2)}</Text>
                          </View>
                        )}
                        {selectedOrderDetails.discount > 0 && (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.success }]}>Descuento:</Text>
                            <Text style={[styles.summaryValue, { color: colors.success }]}>-L. {selectedOrderDetails.discount.toFixed(2)}</Text>
                          </View>
                        )}
                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                          <Text style={styles.totalLabel}>Total:</Text>
                          <Text style={styles.totalValue}>L. {selectedOrderDetails.total.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Método de Pago:</Text>
                          <Text style={styles.summaryValue}>
                            {selectedOrderDetails.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

function BranchOrdersView({ user, colors }: { user: any; colors: any }) {
  const { updateOrderStatus, getOrdersByBranch, getDeliveryUsersByBranch, deliveryUsers } = useData();
  const [filter, setFilter] = useState<BranchFilterStatus>("pending");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const branchId = user?.branchId || "";
  const branchOrders = getOrdersByBranch(branchId);
  const branchDeliveryUsers = getDeliveryUsersByBranch(branchId).filter(d => d.status === 'approved');

  const filteredOrders = sortOrdersByPriorityAndTime(
    branchOrders.filter((order) => {
      if (filter === "all") return true;
      return order.status === filter;
    })
  );

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
      await updateOrderStatus(orderId, newStatus);
      Alert.alert("Éxito", `Estado actualizado a: ${getStatusLabel(newStatus)}`);
    } catch {
      Alert.alert("Error", "No se pudo actualizar el estado");
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

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pedidos</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(["pending", "preparing", "ready", "dispatched", "delivered", "all"] as BranchFilterStatus[]).map((f) => {
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
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status, colors) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.customerName}>
                    Cliente: {order.customerName || "Sin nombre"}
                  </Text>
                  {order.customerPhone && (
                    <Text style={styles.customerPhone}>Tel: {order.customerPhone}</Text>
                  )}
                  <View style={styles.itemsList}>
                    {order.items.map((item, idx) => (
                      <Text key={idx} style={styles.itemText}>
                        • {item.quantity}x {item.productName}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>L. {order.total.toFixed(2)}</Text>
                </View>

                {order.status === "pending" && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
                    onPress={() => handleStatusChange(order.id, "preparing")}
                  >
                    <ChefHat size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Orden en Cocina</Text>
                  </TouchableOpacity>
                )}

                {order.status === "preparing" && !order.deliveryId && (
                  <View style={styles.preparingBanner}>
                    <ChefHat size={16} color="#8B5CF6" />
                    <Text style={styles.preparingText}>Esperando a que un repartidor reclame el pedido...</Text>
                  </View>
                )}

                {order.status === "preparing" && order.deliveryId && (
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

                {order.status === "ready" && (
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

function DeliveryOrdersView({ user, colors }: { user: any; colors: any }) {
  const {
    orders,
    updateOrderStatus,
    addOrderDelay,
    addBranchNotification,
    earnPointsFromOrder,
    requestOrderClaim,
  } = useData();
  const [filter, setFilter] = useState<DeliveryFilterStatus>("ready");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showNoResponseModal, setShowNoResponseModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [waitTime, setWaitTime] = useState<number>(5);
  const [callScreenshot, setCallScreenshot] = useState<string>("");
  const [whatsappScreenshot, setWhatsappScreenshot] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState<number>(5);
  const [delayReason, setDelayReason] = useState<string>("");

  const myOrders = orders.filter((o) => {
    const isMyBranch = o.branchId === user?.branchId;
    
    if (filter === "ready") {
      return isMyBranch && (o.status === "pending" || o.status === "preparing") && o.deliveryType === "delivery" && !o.deliveryId;
    }
    if (o.deliveryId === user?.id) return true;
    if (o.deliveryRequestedBy === user?.id && !o.requestApproved) return true;
    if (o.status === "dispatched" && o.deliveryId === user?.id && o.assignedByBranch) return true;
    return false;
  });

  const filteredOrders = sortOrdersByPriorityAndTime(
    myOrders.filter((order) => {
      if (filter === "all") return true;
      return order.status === filter;
    })
  );

  const myActiveOrders = orders.filter(
    (o) => o.deliveryId === user?.id && o.status === "dispatched"
  ).length;

  const handleClaimOrder = async (order: Order) => {
    if (!user?.id) {
      Alert.alert("Error", "No se pudo obtener la información de su usuario.");
      return;
    }

    try {
      const result = await requestOrderClaim(order.id, user.id);
      
      if (result.needsApproval) {
        Alert.alert(
          "Solicitud Enviada",
          `Ya tienes ${myActiveOrders} orden(es) activa(s). Tu solicitud fue enviada a la sucursal para aprobación.`,
          [{ text: "Entendido" }]
        );
      } else {
        Alert.alert("Éxito", `Pedido ${order.orderNumber} asignado a ti.`);
      }
    } catch {
      Alert.alert("Error", "No se pudo reclamar el pedido");
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara para tomar foto de entrega");
        return;
      }
    }

    Alert.alert(
      "Confirmar Entrega",
      "¿Deseas tomar una foto como comprobante de entrega?",
      [
        {
          text: "Entregar sin foto",
          onPress: async () => {
            await updateOrderStatus(order.id, "delivered");
            await earnPointsFromOrder(order);
            Alert.alert("Éxito", "Pedido marcado como entregado");
          },
        },
        {
          text: "Tomar foto",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await updateOrderStatus(order.id, "delivered");
              await earnPointsFromOrder(order);
              Alert.alert("Éxito", "Pedido entregado con comprobante fotográfico");
            }
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleOpenRejectModal = (order: Order) => {
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;

    if (!rejectReason.trim()) {
      Alert.alert("Error", "Por favor indica el motivo del rechazo");
      return;
    }

    Alert.alert(
      "Confirmar Rechazo",
      "¿Estás seguro de rechazar este pedido?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            await updateOrderStatus(selectedOrder.id, "rejected");
            
            if (selectedOrder.branchId) {
              await addBranchNotification({
                branchId: selectedOrder.branchId,
                type: "order_rejected",
                orderId: selectedOrder.id,
                title: "Pedido Rechazado",
                message: `El repartidor rechazó el pedido ${selectedOrder.orderNumber}. Motivo: ${rejectReason}`,
              });
            }
            
            setShowRejectModal(false);
            setSelectedOrder(null);
            Alert.alert("Pedido Rechazado", "El pedido ha sido marcado como rechazado y la sucursal ha sido notificada");
          },
        },
      ]
    );
  };

  const handleOpenDelayModal = (order: Order) => {
    setSelectedOrder(order);
    setDelayMinutes(5);
    setDelayReason("");
    setShowDelayModal(true);
  };

  const handleReportDelay = async () => {
    if (!selectedOrder || !user?.id) return;

    if (!delayReason.trim()) {
      Alert.alert("Error", "Por favor indica el motivo del retraso");
      return;
    }

    Alert.alert(
      "Confirmar Retraso",
      `¿Reportar un retraso de ${delayMinutes} minutos en este pedido?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              await addOrderDelay({
                orderId: selectedOrder.id,
                deliveryId: user.id,
                delayMinutes,
                reason: delayReason,
              });
              setShowDelayModal(false);
              setSelectedOrder(null);
              Alert.alert(
                "Retraso Reportado",
                "La sucursal ha sido notificada del retraso y podrá tomar acciones como ofrecer un reembolso o cupón de descuento al cliente."
              );
            } catch {
              Alert.alert("Error", "No se pudo reportar el retraso");
            }
          },
        },
      ]
    );
  };

  const handleOpenNoResponseModal = (order: Order) => {
    setSelectedOrder(order);
    setWaitTime(5);
    setCallScreenshot("");
    setWhatsappScreenshot("");
    setShowNoResponseModal(true);
  };

  const handleNoResponse = async () => {
    if (!selectedOrder) return;

    if (!callScreenshot || !whatsappScreenshot) {
      Alert.alert("Error", "Debes subir las 2 capturas requeridas");
      return;
    }

    Alert.alert(
      "Confirmar Cliente No Responde",
      `Tiempo de espera: ${waitTime} minutos\n\nEsta información será enviada a la sucursal para validación.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            console.log("Cliente no responde:", {
              orderId: selectedOrder.id,
              waitTime,
              callScreenshot,
              whatsappScreenshot,
            });
            setShowNoResponseModal(false);
            setSelectedOrder(null);
            Alert.alert(
              "Registrado",
              "La sucursal ha sido notificada y validará la situación."
            );
          },
        },
      ]
    );
  };

  const takePicture = async (type: "call" | "whatsapp") => {
    if (Platform.OS === "web") {
      Alert.alert("No disponible", "La cámara no está disponible en web");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === "call") {
        setCallScreenshot(result.assets[0].uri);
      } else {
        setWhatsappScreenshot(result.assets[0].uri);
      }
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pedidos</Text>
      </View>

      <View style={styles.filterContainer}>
        {(["ready", "dispatched", "delivered", "rejected", "all"] as DeliveryFilterStatus[]).map((f) => (
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
              {f === "all" ? "Todos" : f === "ready" ? "Disponibles" : f === "dispatched" ? "En Curso" : f === "delivered" ? "Entregados" : "Rechazados"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Truck size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin entregas</Text>
            <Text style={styles.emptySubtitle}>
              No hay entregas en esta categoría
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status, colors) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  {order.deliveryAddress && (
                    <View style={styles.detailRow}>
                      <MapPin size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{order.deliveryAddress}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Package size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Pago: {order.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                    </Text>
                  </View>
                </View>

                {order.customerPhone && order.deliveryId === user?.id && (
                  <View style={styles.contactContainer}>
                    <Text style={styles.contactTitle}>Contacto del Cliente:</Text>
                    <View style={styles.contactButtons}>
                      <TouchableOpacity
                        style={[styles.contactButton, { backgroundColor: colors.primary }]}
                        onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                      >
                        <Phone size={18} color={colors.white} />
                        <Text style={styles.contactButtonText}>{order.customerPhone}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.contactButton, { backgroundColor: colors.whatsapp }]}
                        onPress={() => {
                          const message = encodeURIComponent(
                            `Hola! Soy el repartidor de tu pedido ${order.orderNumber}. Estoy en camino.`
                          );
                          Linking.openURL(`https://wa.me/${formatPhoneNumberForWhatsApp(order.customerPhone)}?text=${message}`);
                        }}
                      >
                        <MessageCircle size={18} color={colors.white} />
                        <Text style={styles.contactButtonText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total a cobrar:</Text>
                  <Text style={styles.totalValue}>L. {order.total.toFixed(2)}</Text>
                </View>

                {order.status === "preparing" && !order.deliveryId && !order.deliveryRequestedBy && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleClaimOrder(order)}
                    >
                      <HandIcon size={18} color={colors.white} />
                      <Text style={[styles.actionButtonText, { color: colors.white }]}>
                        RECLAMAR PEDIDO
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.status === "dispatched" && order.deliveryId === user?.id && order.assignedByBranch && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "#10B981" }]}
                      onPress={() => {
                        Alert.alert(
                          "Confirmar Recepción",
                          `¿Confirmar que recibiste físicamente el pedido ${order.orderNumber}?`,
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Confirmar",
                              onPress: async () => {
                                await updateOrderStatus(order.id, "dispatched", undefined, false);
                                Alert.alert("Éxito", "Pedido confirmado. Ahora puedes proceder con la entrega.");
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <CheckCircle size={18} color={colors.white} />
                      <Text style={[styles.actionButtonText, { color: colors.white }]}>
                        Confirmar Pedido Recibido
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.deliveryRequestedBy === user?.id && !order.requestApproved && (
                  <View style={[styles.pendingApprovalBanner, { backgroundColor: "#F59E0B15" }]}>
                    <Clock size={16} color="#F59E0B" />
                    <Text style={[styles.pendingApprovalText, { color: "#F59E0B" }]}>
                      Esperando aprobación de la sucursal...
                    </Text>
                  </View>
                )}

                {order.status === "dispatched" && order.deliveryId === user?.id && !order.assignedByBranch && (
                  <>
                    <View style={styles.actionsContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.success }]}
                        onPress={() => handleMarkDelivered(order)}
                      >
                        <CheckCircle size={18} color={colors.white} />
                        <Text style={[styles.actionButtonText, { color: colors.white }]}>
                          Entregado
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.accent }]}
                        onPress={() => handleOpenRejectModal(order)}
                      >
                        <XCircle size={18} color={colors.white} />
                        <Text style={[styles.actionButtonText, { color: colors.white }]}>
                          Pedido Rechazado
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.secondaryActions}>
                      <TouchableOpacity
                        style={[styles.secondaryButton, { backgroundColor: "#F97316" }]}
                        onPress={() => handleOpenDelayModal(order)}
                      >
                        <AlertCircle size={16} color={colors.white} />
                        <Text style={styles.secondaryButtonText}>Reportar Retraso</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryButton, { backgroundColor: colors.textMuted }]}
                        onPress={() => handleOpenNoResponseModal(order)}
                      >
                        <Clock size={16} color={colors.white} />
                        <Text style={styles.secondaryButtonText}>No Responde</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showRejectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rechazar Pedido</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={24} color={colors.accent} />
              <Text style={styles.warningText}>
                Por favor indica el motivo del rechazo. Esta información será enviada a la sucursal.
              </Text>
            </View>

            <View style={styles.rejectReasons}>
              {["Cliente no responde", "Dirección incorrecta", "Cliente canceló", "Otro motivo"].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    rejectReason === reason && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setRejectReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonButtonText,
                      rejectReason === reason && styles.reasonButtonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {rejectReason === "Otro motivo" && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe el motivo..."
                placeholderTextColor={colors.textMuted}
                value={rejectReason === "Otro motivo" ? "" : rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
            )}

            <TouchableOpacity
              style={[styles.confirmRejectButton, !rejectReason.trim() && styles.buttonDisabled]}
              onPress={handleRejectOrder}
              disabled={!rejectReason.trim()}
            >
              <Text style={styles.confirmRejectButtonText}>Confirmar Rechazo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDelayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Retraso</Text>
              <TouchableOpacity onPress={() => setShowDelayModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.warningBox, { backgroundColor: "#F9731615" }]}>
              <AlertCircle size={24} color="#F97316" />
              <Text style={[styles.warningText, { color: "#F97316" }]}>
                Indica el tiempo estimado de retraso. La sucursal puede ofrecer compensación al cliente.
              </Text>
            </View>

            <View style={styles.delayTimeContainer}>
              <Text style={styles.delayTimeLabel}>Tiempo de retraso estimado:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.delayTimeButtons}>
                  {[5, 10, 15, 20, 30, 45, 60].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.delayTimeButton,
                        delayMinutes === time && { backgroundColor: "#F97316", borderColor: "#F97316" },
                      ]}
                      onPress={() => setDelayMinutes(time)}
                    >
                      <Text
                        style={[
                          styles.delayTimeButtonText,
                          delayMinutes === time && { color: colors.white, fontWeight: "700" as const },
                        ]}
                      >
                        {time} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.delayReasons}>
              <Text style={styles.delayReasonsLabel}>Motivo del retraso:</Text>
              {["Tráfico pesado", "Mal clima", "Dirección difícil de encontrar", "Problema con el vehículo", "Otro motivo"].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    delayReason === reason && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setDelayReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonButtonText,
                      delayReason === reason && styles.reasonButtonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {delayReason === "Otro motivo" && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe el motivo del retraso..."
                placeholderTextColor={colors.textMuted}
                value={delayReason === "Otro motivo" ? "" : delayReason}
                onChangeText={setDelayReason}
                multiline
              />
            )}

            <TouchableOpacity
              style={[
                styles.confirmDelayButton,
                { backgroundColor: "#F97316" },
                !delayReason.trim() && styles.buttonDisabled,
              ]}
              onPress={handleReportDelay}
              disabled={!delayReason.trim()}
            >
              <Text style={styles.confirmDelayButtonText}>Reportar Retraso</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showNoResponseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cliente No Responde</Text>
              <TouchableOpacity onPress={() => setShowNoResponseModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={24} color={colors.primary} />
              <Text style={styles.warningText}>
                Sube 2 capturas (llamada + WhatsApp) y selecciona el tiempo de espera
              </Text>
            </View>

            <View style={styles.waitTimeContainer}>
              <Text style={styles.waitTimeLabel}>Tiempo de espera:</Text>
              <View style={styles.waitTimeButtons}>
                {[5, 10, 15, 20].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.waitTimeButton,
                      waitTime === time && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setWaitTime(time)}
                  >
                    <Text
                      style={[
                        styles.waitTimeButtonText,
                        waitTime === time && { color: colors.white },
                      ]}
                    >
                      {time} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.screenshotsContainer}>
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={() => takePicture("call")}
              >
                <Camera size={24} color={callScreenshot ? colors.success : colors.textSecondary} />
                <Text style={styles.screenshotButtonText}>
                  {callScreenshot ? "Captura de llamada ✓" : "Captura de llamada"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={() => takePicture("whatsapp")}
              >
                <Camera size={24} color={whatsappScreenshot ? colors.success : colors.textSecondary} />
                <Text style={styles.screenshotButtonText}>
                  {whatsappScreenshot ? "Captura de WhatsApp ✓" : "Captura de WhatsApp"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: colors.primary },
                (!callScreenshot || !whatsappScreenshot) && styles.buttonDisabled,
              ]}
              onPress={handleNoResponse}
              disabled={!callScreenshot || !whatsappScreenshot}
            >
              <Text style={styles.confirmButtonText}>Enviar a Sucursal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusColor(status: OrderStatus, colors: any) {
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
    case "rejected":
      return colors.accent;
    default:
      return colors.textMuted;
  }
}

function getStatusLabel(status: OrderStatus) {
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
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "800" as const,
    },
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 16,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
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
    listContent: {
      padding: 16,
      paddingTop: 0,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700" as const,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 24,
    },
    loginButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
    loginButtonText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: "700" as const,
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
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
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
    customerName: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    customerPhone: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    itemsList: {
      gap: 4,
    },
    itemText: {
      fontSize: 13,
      color: colors.textSecondary,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 24,
      padding: 20,
      width: "90%",
      maxHeight: "85%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    orderDetailSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    orderDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    orderDetailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500" as const,
    },
    orderDetailValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "600" as const,
    },
    statusBadgeInline: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusTextInline: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.white,
    },
    productsSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    productItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    productInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
      gap: 8,
    },
    productQuantity: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.primary,
      minWidth: 30,
    },
    productDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    productNotes: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: "italic" as const,
    },
    productPrice: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginLeft: 12,
    },
    summarySection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    summaryTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 12,
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
    bottomPadding: {
      height: 20,
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
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
    },
    contactContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
    },
    contactTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    contactButtons: {
      flexDirection: "row",
      gap: 8,
    },
    contactButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
    },
    contactButtonText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    actionsContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    secondaryActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    secondaryButtonText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    pendingApprovalBanner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 10,
      marginTop: 12,
      gap: 8,
    },
    pendingApprovalText: {
      fontSize: 13,
      fontWeight: "600" as const,
      flex: 1,
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.accent + "15",
      padding: 12,
      borderRadius: 12,
      gap: 12,
      marginBottom: 20,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: colors.accent,
    },
    rejectReasons: {
      gap: 10,
      marginBottom: 16,
    },
    reasonButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    reasonButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    reasonButtonText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    reasonButtonTextSelected: {
      color: colors.primary,
      fontWeight: "600" as const,
    },
    reasonInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: 16,
    },
    confirmRejectButton: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 20,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    confirmRejectButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.white,
    },
    delayTimeContainer: {
      marginBottom: 20,
    },
    delayTimeLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    delayTimeButtons: {
      flexDirection: "row",
      gap: 8,
    },
    delayTimeButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    delayTimeButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    delayReasons: {
      marginBottom: 16,
    },
    delayReasonsLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 10,
    },
    confirmDelayButton: {
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 20,
    },
    confirmDelayButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.white,
    },
    waitTimeContainer: {
      marginBottom: 20,
    },
    waitTimeLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    waitTimeButtons: {
      flexDirection: "row",
      gap: 8,
    },
    waitTimeButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    waitTimeButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    screenshotsContainer: {
      gap: 12,
      marginBottom: 20,
    },
    screenshotButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    screenshotButtonText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "500" as const,
    },
    confirmButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.white,
    },
  });
