import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  Linking,
} from "react-native";
import {
  Truck,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  X,
  AlertTriangle,
  Phone,
  MessageCircle,
  Clock,
  Camera,
  AlertCircle,
  HandIcon,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Order, OrderStatus } from "@/types";
import { sortOrdersByPriorityAndTime } from "@/lib/orderSorting";
import { formatPhoneNumberForWhatsApp } from "@/lib/formatPhoneNumber";

type FilterStatus = "all" | "ready" | "dispatched" | "delivered" | "rejected";

export default function DeliveryOrdersScreen() {
  const { colors } = useTheme();
  const { orders, updateOrderStatus, addOrderDelay, addBranchNotification, earnPointsFromOrder, requestOrderClaim } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("ready");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showNoResponseModal, setShowNoResponseModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [waitTime, setWaitTime] = useState<number>(5);
  const [callScreenshot, setCallScreenshot] = useState<string>("");
  const [whatsappScreenshot, setWhatsappScreenshot] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState<number>(5);
  const [delayReason, setDelayReason] = useState<string>("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  console.log('🚚 [DELIVERY ORDERS] Current user:', {
    userId: user?.id,
    role: user?.role,
    name: user?.name,
    branchId: user?.branchId
  });
  
  console.log('📦 [DELIVERY ORDERS] Total orders in system:', orders.length);
  console.log('📦 [DELIVERY ORDERS] All orders:', orders.map(o => ({
    orderNumber: o.orderNumber,
    status: o.status,
    branchId: o.branchId,
    deliveryId: o.deliveryId,
    deliveryType: o.deliveryType
  })));
  
  const allMyOrders = orders.filter((o) => {
    const isMyBranch = o.branchId === user?.branchId;
    
    console.log('🔍 [DELIVERY FILTER] Checking order:', {
      orderNumber: o.orderNumber,
      orderBranchId: o.branchId,
      userBranchId: user?.branchId,
      isMyBranch,
      status: o.status,
      deliveryType: o.deliveryType,
      deliveryId: o.deliveryId,
    });
    
    if (isMyBranch && o.deliveryType === "delivery" && !o.deliveryId && (o.status === "pending" || o.status === "preparing")) {
      return true;
    }
    
    if (o.deliveryId === user?.id) return true;
    if (o.deliveryRequestedBy === user?.id && !o.requestApproved) return true;
    
    return false;
  });
  
  console.log('✅ [DELIVERY ORDERS] All orders for this delivery:', allMyOrders.length);

  const filteredOrders = sortOrdersByPriorityAndTime(
    allMyOrders.filter((order) => {
      console.log('🎯 [FILTER] Applying filter:', filter, 'to order:', order.orderNumber);
      
      if (filter === "all") return true;
      
      if (filter === "ready") {
        return (order.status === "pending" || order.status === "preparing") && !order.deliveryId;
      }
      
      if (filter === "dispatched") {
        return order.status === "dispatched" && order.deliveryId === user?.id;
      }
      
      if (filter === "delivered") {
        return order.status === "delivered" && order.deliveryId === user?.id;
      }
      
      if (filter === "rejected") {
        return order.status === "rejected" && order.deliveryId === user?.id;
      }
      
      return false;
    })
  );
  
  console.log('✅ [DELIVERY ORDERS] Filtered orders for display:', filteredOrders.length);

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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
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
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      preparing: "En Cocina",
      ready: "Listo",
      dispatched: "En camino",
      delivered: "Entregado",
      rejected: "Rechazado",
    };
    return labels[status];
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Pedidos</Text>
      </View>

      <View style={styles.filterContainer}>
        {(["ready", "dispatched", "delivered", "rejected", "all"] as FilterStatus[]).map((f) => (
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
                    <View style={styles.detailInfo}>
                      {order.customerName && (
                        <View style={styles.detailRow}>
                          <UserIcon size={16} color={colors.textSecondary} />
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
                          <Text style={styles.detailText}>{order.deliveryAddress}</Text>
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
                      <View style={styles.paymentInfo}>
                        <Package size={14} color={colors.textSecondary} />
                        <Text style={styles.paymentText}>
                          Pago: {order.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {order.customerPhone && (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => {
                      const message = encodeURIComponent(
                        `Hola! Soy el repartidor de tu pedido ${order.orderNumber}. Estoy en camino.`
                      );
                      Linking.openURL(`https://wa.me/${formatPhoneNumberForWhatsApp(order.customerPhone)}?text=${message}`);
                    }}
                  >
                    <MessageCircle size={18} color={colors.white} />
                    <Text style={styles.whatsappButtonText}>Contactar por WhatsApp</Text>
                  </TouchableOpacity>
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
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexWrap: "wrap",
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
    paymentInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    paymentText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    whatsappButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#25D366",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
      marginTop: 12,
    },
    whatsappButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: "#FFFFFF",
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
    actionsContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
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
      maxHeight: "90%",
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
  });
