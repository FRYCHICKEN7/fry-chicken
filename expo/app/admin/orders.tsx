import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Image,
  Linking,
} from "react-native";
import {
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  User,
  MapPin,
  Trash2,
  UserCheck,
  X,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Image as ImageIcon,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  MoreVertical,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Order, OrderStatus } from "@/types";
import { sortOrdersByPriorityAndTime } from "@/lib/orderSorting";
import { formatPhoneNumberForWhatsApp } from "@/lib/formatPhoneNumber";

type FilterStatus = "all" | "pending" | "preparing" | "ready" | "dispatched";

export default function OrdersManagementScreen() {
  const { colors } = useTheme();
  const { orders, updateOrderStatus, deleteOrder, deliveryUsers, branches, deleteOrdersByBranches, authorizeTransfer, approveOrder } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 [ORDERS SCREEN] Total orders in system:', orders.length);
    console.log('📋 [ORDERS SCREEN] All orders:', orders.map(o => ({
      orderNumber: o.orderNumber,
      branchId: o.branchId,
      status: o.status,
      customerId: o.customerId,
      total: o.total
    })));
    
    if (user?.branchId) {
      const branchOrders = orders.filter(o => o.branchId === user.branchId);
      console.log(`📦 [ORDERS SCREEN] Orders for branch ${user.branchId}:`, branchOrders.length);
      console.log('📦 [ORDERS SCREEN] Branch orders:', branchOrders);
    }
  }, [orders, user, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const branchOrders = user?.role === "branch" && user.branchId
    ? orders.filter(o => o.branchId === user.branchId)
    : orders;

  const filteredOrders = sortOrdersByPriorityAndTime(
    branchOrders.filter(order => {
      if (filter === "all") return true;
      if (filter === "pending") return order.status === "pending" || order.status === "confirmed";
      return order.status === filter;
    })
  );

  const availableDeliveryUsers = deliveryUsers.filter(
    u => u.status === 'approved' && u.branchId === user?.branchId
  );

  const getDeliveryActiveOrders = (deliveryId: string) => {
    return orders.filter(
      o => o.deliveryId === deliveryId && o.status === 'dispatched'
    ).length;
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    const statusLabels: Record<OrderStatus, string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      preparing: "En Preparación",
      ready: "Listo",
      dispatched: "Despachado",
      delivered: "Entregado",
      rejected: "Rechazado",
    };

    Alert.alert(
      "Cambiar Estado",
      `¿Cambiar el estado del pedido ${order.orderNumber} a "${statusLabels[newStatus]}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            await updateOrderStatus(order.id, newStatus);
            Alert.alert("Éxito", "Estado actualizado correctamente");
          },
        },
      ]
    );
  };

  const handleDeleteOrder = async (order: Order) => {
    Alert.alert(
      "Eliminar Pedido",
      `¿Estás seguro de eliminar el pedido ${order.orderNumber}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteOrder(order.id);
            Alert.alert("Éxito", "Pedido eliminado correctamente");
          },
        },
      ]
    );
  };

  const handleAssignDelivery = (order: Order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async (deliveryId: string) => {
    if (!selectedOrder) return;

    await updateOrderStatus(selectedOrder.id, "dispatched", deliveryId);
    setShowAssignModal(false);
    setSelectedOrder(null);
    Alert.alert("Éxito", "Repartidor asignado correctamente");
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return colors.textMuted;
      case "confirmed":
        return "#3B82F6";
      case "preparing":
        return colors.primary;
      case "ready":
        return "#10B981";
      case "dispatched":
        return "#8B5CF6";
      case "delivered":
        return colors.success;
      case "rejected":
        return colors.accent;
      default:
        return colors.textMuted;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return <Clock size={16} color={colors.white} />;
      case "confirmed":
        return <CheckCircle size={16} color={colors.white} />;
      case "preparing":
        return <ChefHat size={16} color={colors.white} />;
      case "ready":
        return <Package size={16} color={colors.white} />;
      case "dispatched":
        return <Truck size={16} color={colors.white} />;
      case "delivered":
        return <CheckCircle size={16} color={colors.white} />;
      case "rejected":
        return <XCircle size={16} color={colors.white} />;
      default:
        return <Package size={16} color={colors.white} />;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      preparing: "Preparando",
      ready: "Listo",
      dispatched: "Despachado",
      delivered: "Entregado",
      rejected: "Rechazado",
    };
    return labels[status];
  };

  const handleManualRefresh = () => {
    console.log('🔄 [MANUAL REFRESH] Triggered');
    setRefreshKey(prev => prev + 1);
    Alert.alert(
      "Pedidos Actualizados", 
      `Total en sistema: ${orders.length}\nEn esta sucursal: ${filteredOrders.length}`
    );
  };

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleAuthorizeTransfer = async (order: Order) => {
    if (!user?.id) return;

    Alert.alert(
      "Autorizar Transferencia",
      `¿Confirmar que la transferencia del pedido ${order.orderNumber} por L. ${order.total.toFixed(2)} es válida?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Autorizar",
          onPress: async () => {
            await authorizeTransfer(order.id, user.id);
            Alert.alert("Éxito", "Transferencia autorizada. La sucursal ya puede procesar el pedido.");
          },
        },
      ]
    );
  };

  const handleApproveOrder = async (order: Order) => {
    if (!user?.id) return;

    Alert.alert(
      "Aprobar Pedido",
      `¿Aprobar el pedido ${order.orderNumber} por L. ${order.total.toFixed(2)} para que pase a la sucursal?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            await approveOrder(order.id, user.id);
            Alert.alert("Éxito", "Pedido aprobado. La sucursal ya puede procesarlo.");
          },
        },
      ]
    );
  };

  const handleViewReceipt = (receiptImage: string) => {
    setSelectedReceipt(receiptImage);
    setShowReceiptModal(true);
  };

  const handleResetOrders = async () => {
    if (selectedBranches.length === 0) {
      Alert.alert("Error", "Selecciona al menos una sucursal");
      return;
    }

    const branchNames = branches
      .filter(b => selectedBranches.includes(b.id))
      .map(b => b.name)
      .join(", ");

    Alert.alert(
      "Confirmar Reseteo",
      `¿Estás seguro de eliminar TODOS los pedidos de las siguientes sucursales?\n\n${branchNames}\n\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteOrdersByBranches(selectedBranches);
            setShowResetModal(false);
            setSelectedBranches([]);
            Alert.alert("Éxito", "Pedidos eliminados correctamente");
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user?.role === "admin" && (
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowResetModal(true)}
          >
            <RefreshCw size={18} color={colors.white} />
            <Text style={styles.resetButtonText}>Resetear Pedidos por Sucursal</Text>
          </TouchableOpacity>
        )}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
            {(["all", "pending", "preparing", "ready", "dispatched"] as FilterStatus[]).map((f) => (
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
                  {f === "all" ? "Todos" : f === "pending" ? "Recibidos" : f === "preparing" ? "En Cocina" : f === "ready" ? "Listos" : "Despachados"}
                </Text>
              </TouchableOpacity>
            ))}
            </View>
          </ScrollView>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleManualRefresh}
        >
          <Package size={18} color={colors.primary} />
          <Text style={styles.refreshButtonText}>
            🔄 Actualizar ({orders.length} total, {filteredOrders.length} filtrados)
          </Text>
        </TouchableOpacity>
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
                  order.paymentMethod === "transfer" && !order.transferAuthorized && styles.transferOrderCard
                ]}
              >
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    {getStatusIcon(order.status)}
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.orderDetails}
                  onPress={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderDetailsHeader}>
                    <View style={styles.detailInfo}>
                      {order.customerName && (
                        <View style={styles.detailRow}>
                          <User size={16} color={colors.textSecondary} />
                          <Text style={styles.detailText}>{order.customerName}</Text>
                        </View>
                      )}
                      {order.customerPhone && (
                        <View style={styles.detailRow}>
                          <Phone size={16} color={colors.textSecondary} />
                          <Text style={styles.detailText}>{order.customerPhone}</Text>
                        </View>
                      )}
                      {order.deliveryAddress && (
                        <View style={styles.detailRow}>
                          <MapPin size={16} color={colors.textSecondary} />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {order.deliveryAddress}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Package size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {order.deliveryType === "pickup" ? "Recoger en sucursal" : "Envío a domicilio"}
                        </Text>
                      </View>
                    </View>
                    {expandedOrderId === order.id ? (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    )}
                  </View>
                  {expandedOrderId === order.id && (
                    <View style={styles.itemsList}>
                      <Text style={styles.itemsTitle}>Productos del pedido:</Text>
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



                {!order.adminApproved && (
                  <View style={styles.compactBanner}>
                    <AlertCircle size={16} color="#F59E0B" />
                    <Text style={styles.compactBannerText}>Pendiente de aprobación</Text>
                  </View>
                )}



                {order.paymentMethod === "transfer" && !order.transferAuthorized && (
                  <View style={styles.transferBanner}>
                    <View style={styles.transferBannerIcon}>
                      <CreditCard size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.transferBannerTextContainer}>
                      <Text style={styles.transferBannerTitle}>⚠️ TRANSFERENCIA PENDIENTE</Text>
                      <Text style={styles.transferBannerSubtitle}>Requiere autorización del administrador</Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  {(order.status === "pending" || order.status === "confirmed") && (
                    <TouchableOpacity
                      style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleStatusChange(order, "preparing")}
                    >
                      <ChefHat size={18} color={colors.secondary} />
                      <Text style={[styles.primaryActionButtonText, { color: colors.secondary }]}>En Cocina</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === "preparing" && (
                    <TouchableOpacity
                      style={[styles.primaryActionButton, { backgroundColor: "#10B981" }]}
                      onPress={() => handleStatusChange(order, "ready")}
                    >
                      <CheckCircle size={18} color={colors.white} />
                      <Text style={[styles.primaryActionButtonText, { color: colors.white }]}>Orden Lista</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === "ready" && (
                    <TouchableOpacity
                      style={[styles.primaryActionButton, { backgroundColor: "#8B5CF6" }]}
                      onPress={() => handleAssignDelivery(order)}
                    >
                      <UserCheck size={18} color={colors.white} />
                      <Text style={[styles.primaryActionButtonText, { color: colors.white }]}>Asignar Repartidor</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => setShowActionsMenu(showActionsMenu === order.id ? null : order.id)}
                  >
                    <MoreVertical size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {showActionsMenu === order.id && (
                  <View style={styles.actionsMenu}>
                    {order.customerPhone && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          const productsList = order.items.map(item => 
                            `${item.quantity}x ${item.productName} - L. ${(item.price * item.quantity).toFixed(2)}`
                          ).join('\n');
                          
                          const message = encodeURIComponent(
                            `Hola 👋 le saludo de parte de FRY CHICKEN. Tu pedido ${order.orderNumber} con los siguiente orden:\n\n${productsList}\n\nTotal: L. ${order.total.toFixed(2)}\n\nestá siendo procesado 😊 GRACIAS POR SU PREFERENCIA.`
                          );
                          Linking.openURL(`https://wa.me/${formatPhoneNumberForWhatsApp(order.customerPhone)}?text=${message}`);
                          setShowActionsMenu(null);
                        }}
                      >
                        <MessageCircle size={18} color="#25D366" />
                        <Text style={styles.menuItemText}>Contactar WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    
                    {!order.adminApproved && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          handleApproveOrder(order);
                          setShowActionsMenu(null);
                        }}
                      >
                        <CheckCircle size={18} color={colors.primary} />
                        <Text style={styles.menuItemText}>Aprobar Pedido</Text>
                      </TouchableOpacity>
                    )}
                    
                    {order.paymentMethod === "transfer" && !order.transferAuthorized && (
                      <>
                        {order.receiptImage && (
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                              handleViewReceipt(order.receiptImage!);
                              setShowActionsMenu(null);
                            }}
                          >
                            <ImageIcon size={18} color={colors.primary} />
                            <Text style={styles.menuItemText}>Ver Comprobante</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => {
                            handleAuthorizeTransfer(order);
                            setShowActionsMenu(null);
                          }}
                        >
                          <CreditCard size={18} color="#10B981" />
                          <Text style={styles.menuItemText}>Autorizar Transferencia</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    
                    {user?.role === "admin" && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          handleDeleteOrder(order);
                          setShowActionsMenu(null);
                        }}
                      >
                        <Trash2 size={18} color={colors.accent} />
                        <Text style={[styles.menuItemText, { color: colors.accent }]}>Eliminar Pedido</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar Repartidor</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {availableDeliveryUsers.length === 0 ? (
              <View style={styles.emptyDeliveryContainer}>
                <Truck size={48} color={colors.textMuted} />
                <Text style={styles.emptyDeliveryText}>
                  No hay repartidores disponibles
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.deliveryList}>
                {availableDeliveryUsers.map((delivery) => {
                  const activeOrders = getDeliveryActiveOrders(delivery.id);
                  return (
                    <TouchableOpacity
                      key={delivery.id}
                      style={styles.deliveryCard}
                      onPress={() => handleConfirmAssignment(delivery.id)}
                    >
                      <View style={styles.deliveryInfo}>
                        <User size={20} color={colors.primary} />
                        <View style={styles.deliveryDetails}>
                          <Text style={styles.deliveryName}>{delivery.name}</Text>
                          <Text style={styles.deliveryPhone}>{delivery.phone}</Text>
                        </View>
                      </View>
                      <View style={styles.deliveryStatus}>
                        {activeOrders > 0 && (
                          <View style={styles.activeOrdersBadge}>
                            <Package size={14} color={colors.white} />
                            <Text style={styles.activeOrdersText}>{activeOrders}</Text>
                          </View>
                        )}
                        {activeOrders === 0 && (
                          <View style={[styles.availableBadge, { backgroundColor: colors.success }]}>
                            <Text style={styles.availableText}>Disponible</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showResetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resetear Pedidos</Text>
              <TouchableOpacity onPress={() => {
                setShowResetModal(false);
                setSelectedBranches([]);
              }}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.resetDescription}>
              Selecciona las sucursales cuyos pedidos deseas eliminar:
            </Text>

            <FlatList
              data={branches}
              keyExtractor={(item) => item.id}
              style={styles.branchList}
              renderItem={({ item }) => {
                const isSelected = selectedBranches.includes(item.id);
                const branchOrderCount = orders.filter(o => o.branchId === item.id).length;
                return (
                  <TouchableOpacity
                    style={[
                      styles.branchItem,
                      isSelected && { backgroundColor: colors.primary + "20", borderColor: colors.primary }
                    ]}
                    onPress={() => toggleBranchSelection(item.id)}
                  >
                    <View style={styles.branchInfo}>
                      <Text style={styles.branchName}>{item.name}</Text>
                      <Text style={styles.branchOrderCount}>
                        {branchOrderCount} pedido{branchOrderCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.resetActions}>
              <TouchableOpacity
                style={[styles.resetCancelButton, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setShowResetModal(false);
                  setSelectedBranches([]);
                }}
              >
                <Text style={[styles.resetCancelButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetConfirmButton, { backgroundColor: colors.accent }]}
                onPress={handleResetOrders}
              >
                <Trash2 size={18} color={colors.white} />
                <Text style={styles.resetConfirmButtonText}>
                  Eliminar ({selectedBranches.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReceiptModal} animationType="fade" transparent>
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalContent}>
            <View style={styles.receiptModalHeader}>
              <Text style={styles.receiptModalTitle}>Comprobante de Transferencia</Text>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedReceipt && (
              <Image
                source={{ uri: selectedReceipt }}
                style={styles.receiptModalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterContainer: {
      paddingTop: 12,
      paddingBottom: 8,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "15",
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      gap: 8,
    },
    refreshButtonText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.white,
    },
    orderDetails: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      padding: 12,
    },
    orderDetailsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    detailInfo: {
      flex: 1,
      gap: 8,
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
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
    actionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    primaryActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    primaryActionButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    moreButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionsMenu: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.textPrimary,
    },
    compactBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F59E0B15",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
      marginTop: 8,
    },
    compactBannerText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#F59E0B",
    },
    transferBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F59E0B",
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 12,
      marginTop: 8,
      shadowColor: "#F59E0B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    transferBannerIcon: {
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
    transferBannerTextContainer: {
      flex: 1,
    },
    transferBannerTitle: {
      fontSize: 15,
      fontWeight: "800" as const,
      color: "#FFFFFF",
      marginBottom: 3,
      letterSpacing: 0.3,
    },
    transferBannerSubtitle: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: "#FFFFFF",
      opacity: 0.95,
    },
    bottomPadding: {
      height: 40,
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
      padding: 20,
      maxHeight: "80%",
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
    emptyDeliveryContainer: {
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyDeliveryText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
    },
    deliveryList: {
      maxHeight: 400,
    },
    deliveryCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    deliveryDetails: {
      flex: 1,
    },
    deliveryName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    deliveryPhone: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    deliveryStatus: {
      marginLeft: 8,
    },
    activeOrdersBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    activeOrdersText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.white,
    },
    availableBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    availableText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.white,
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      gap: 8,
    },
    resetButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    resetDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    branchList: {
      maxHeight: 300,
      marginBottom: 20,
    },
    branchItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    branchInfo: {
      flex: 1,
    },
    branchName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    branchOrderCount: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    resetActions: {
      flexDirection: "row",
      gap: 12,
    },
    resetCancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetCancelButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
    },
    resetConfirmButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 10,
      gap: 8,
    },
    resetConfirmButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    transferSection: {
      marginTop: 12,
    },
    transferAuthorizedBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#10B98115",
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    transferTextContainer: {
      flex: 1,
    },
    transferAuthorizedText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#10B981",
    },
    transferDateText: {
      fontSize: 11,
      color: "#10B981",
      marginTop: 2,
    },
    transferPendingSection: {
      gap: 8,
    },
    transferPendingBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F59E0B15",
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    transferPendingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#F59E0B",
    },
    viewReceiptButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "15",
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    viewReceiptText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    authorizeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    authorizeButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    receiptModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    receiptModalContent: {
      width: "90%",
      maxHeight: "80%",
      backgroundColor: colors.background,
      borderRadius: 16,
      overflow: "hidden",
    },
    receiptModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    receiptModalTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    receiptModalImage: {
      width: "100%",
      height: 400,
    },
    adminApprovalSection: {
      marginTop: 12,
      gap: 8,
    },
    adminPendingBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F59E0B15",
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    adminPendingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#F59E0B",
    },
    approveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    approveButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    adminApprovedBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#10B98115",
      padding: 12,
      borderRadius: 10,
      gap: 8,
      marginTop: 12,
    },
    adminApprovedTextContainer: {
      flex: 1,
    },
    adminApprovedText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#10B981",
    },
    adminApprovedDateText: {
      fontSize: 11,
      color: "#10B981",
      marginTop: 2,
    },
  });
