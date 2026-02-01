import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { auth } from "@/lib/firebase";
import {
  MapPin,
  Store,
  Truck,
  Banknote,
  CreditCard,
  Tag,
  CheckCircle,
  MessageCircle,
  Building2,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";

import { Branch, DeliveryZone, User as UserType, Order } from "@/types";
import { formatPrice } from "@/lib/formatPrice";
import InvoiceView from "@/components/InvoiceView";

type DeliveryType = "pickup" | "delivery";
type PaymentMethod = "cash" | "transfer";

export default function CheckoutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, getSubtotal, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { branches, getActiveBankAccounts, getUserPoints, redeemPoints, addOrder } = useData();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [couponCode, setCouponCode] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);
  const [sentReceiptToWhatsApp, setSentReceiptToWhatsApp] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
    }
  }, [branches, selectedBranch]);

  React.useEffect(() => {
    if (deliveryType === 'pickup') {
      setSelectedZone(null);
    }
  }, [deliveryType]);

  const subtotal = getSubtotal();
  const deliveryFee = deliveryType === "delivery" && selectedZone ? selectedZone.price : 0;
  
  const prizeItems = items.filter(item => item.isPrizeRedemption);
  const totalPointsRequired = prizeItems.reduce((sum, item) => {
    return sum + (item.product.pointsRequired || 0) * item.quantity;
  }, 0);

  const discount = 0;
  const total = subtotal + deliveryFee - discount;

  const activeBankAccounts = getActiveBankAccounts();

  const handleGetLocation = async () => {
    console.log('📍 [LOCATION] Getting GPS location...');
    setIsGettingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Se necesita acceso a la ubicación para obtener tu dirección automáticamente.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      setGpsCoordinates(coords);

      console.log('📍 [LOCATION] Got coordinates:', {
        lat: coords.latitude,
        lng: coords.longitude
      });

      try {
        const [addressData] = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        console.log('📍 [LOCATION] Reverse geocoded address:', addressData);

        let fullAddress = '';
        if (addressData) {
          const parts = [
            addressData.street,
            addressData.streetNumber,
            addressData.district,
            addressData.city,
            addressData.region,
          ].filter(Boolean);
          
          fullAddress = parts.join(', ');
        }

        const coordsText = `📍 GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
        
        if (fullAddress) {
          setAddress(`${fullAddress}\n${coordsText}`);
        } else {
          setAddress(coordsText);
        }

        Alert.alert('Ubicación GPS Obtenida', `Latitud: ${coords.latitude.toFixed(6)}\nLongitud: ${coords.longitude.toFixed(6)}\n\nPuedes agregar más detalles o abrir en Google Maps.`);
      } catch (geocodeError) {
        console.error('📍 [LOCATION] Geocoding error:', geocodeError);
        const coordsText = `📍 GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
        setAddress(coordsText);
        Alert.alert('Ubicación GPS Obtenida', `Latitud: ${coords.latitude.toFixed(6)}\nLongitud: ${coords.longitude.toFixed(6)}\n\nPuedes agregar más detalles o abrir en Google Maps.`);
      }
    } catch (error) {
      console.error('📍 [LOCATION] Error getting location:', error);
      Alert.alert(
        'Error',
        'No se pudo obtener tu ubicación. Por favor verifica que el GPS esté activado.'
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const proceedWithOrder = async (orderUser?: UserType) => {
    const currentUser = orderUser || user;

    console.log('🚀 [CHECKOUT] ========== PROCEED WITH ORDER STARTED ==========');
    console.log('🚀 [CHECKOUT] Current User:', {
      id: currentUser?.id,
      name: currentUser?.name,
      role: currentUser?.role
    });

    if (currentUser?.role === 'branch' || currentUser?.role === 'delivery') {
      console.log('❌ [CHECKOUT] Role restriction - user cannot order');
      throw new Error(`${currentUser.role === 'branch' ? 'Las sucursales' : 'Los repartidores'} no pueden realizar pedidos.`);
    }

    console.log('🔍 [CHECKOUT] Validating order data:', {
      deliveryType,
      selectedBranch: selectedBranch?.name,
      selectedZone: selectedZone?.name,
      address: address?.trim() || 'empty',
      paymentMethod,
      sentReceiptToWhatsApp,
      itemsCount: items.length,
      firebaseAuthUser: auth.currentUser?.uid
    });

    if (deliveryType === "delivery" && !selectedZone) {
      throw new Error('Por favor seleccione una zona de entrega para continuar.');
    }

    if (deliveryType === "delivery" && !address.trim()) {
      throw new Error('Por favor ingrese su dirección de entrega completa.');
    }

    if (paymentMethod === "transfer" && !sentReceiptToWhatsApp) {
      throw new Error('Por favor envíe el comprobante por WhatsApp y marque la casilla de confirmación para continuar.');
    }

    if (!selectedBranch) {
      throw new Error('Por favor seleccione una sucursal para procesar su pedido.');
    }

    if (deliveryType === "delivery" && selectedBranch.deliveryZones.length === 0) {
      throw new Error('La sucursal seleccionada no tiene zonas de entrega. Por favor seleccione otra sucursal o elija recoger en sucursal.');
    }

    if (!currentUser || !currentUser.id) {
      console.error('❌ [CHECKOUT] Invalid user data:', currentUser);
      throw new Error('Ocurrió un error al procesar su cuenta. Por favor cierre sesión e intente nuevamente.');
    }

    if (totalPointsRequired > 0 && currentUser) {
      const currentPoints = getUserPoints(currentUser.id);
      if (currentPoints.availablePoints < totalPointsRequired) {
        throw new Error(`Necesitas ${totalPointsRequired} puntos pero solo tienes ${currentPoints.availablePoints} disponibles.`);
      }
      await redeemPoints(currentUser.id, totalPointsRequired);
      console.log(`✅ [CHECKOUT] Redeemed ${totalPointsRequired} points for prize items`);
    }

    const isPrizeOrder = prizeItems.length > 0;

    console.log('🛒 [CHECKOUT] Creating order with data:', {
      customerId: currentUser.id,
      customerName: currentUser.name,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      itemsCount: items.length,
      total: total
    });

    const orderData: any = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      branchId: selectedBranch.id,
      items: items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        quantity: item.quantity,
        price: item.isPrizeRedemption ? 0 : item.product.price,
        selectedDrink: item.selectedDrink || null,
        isPrizeRedemption: item.isPrizeRedemption || false,
        pointsUsed: item.isPrizeRedemption ? ((item.product.pointsRequired || 0) * item.quantity) : 0,
      })),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      discount: discount,
      total: total,
      deliveryType: deliveryType,
      paymentMethod: paymentMethod,
      status: 'pending',
      notes: notes || '',
      totalPointsRedeemed: totalPointsRequired || 0,
      isPrizeOrder: isPrizeOrder,
      transferAuthorized: paymentMethod === 'transfer' ? false : undefined,
    };

    if (deliveryType === "delivery") {
      orderData.deliveryAddress = address;
      if (selectedZone) {
        orderData.deliveryZone = selectedZone.name;
      }
      if (gpsCoordinates) {
        orderData.gpsCoordinates = gpsCoordinates;
        orderData.googleMapsLink = `https://www.google.com/maps?q=${gpsCoordinates.latitude},${gpsCoordinates.longitude}`;
      }
    }

    if (currentUser.email) {
      orderData.customerEmail = currentUser.email;
    }

    if (currentUser.phone) {
      orderData.customerPhone = currentUser.phone;
    }

    console.log('🚀 [CHECKOUT] Calling addOrder...');
    const newOrder = await addOrder(orderData);
    console.log('✅ [CHECKOUT] Order created successfully:', newOrder.orderNumber);

    setCreatedOrder(newOrder);
    setShowInvoiceModal(true);
  };

  const handlePlaceOrder = async () => {
    console.log('🔘 [CHECKOUT] Confirm button pressed');

    if (isProcessing) {
      console.log('⏳ [CHECKOUT] Already processing order');
      return;
    }

    if (user?.role === 'branch' || user?.role === 'delivery') {
      Alert.alert(
        "Acceso Restringido",
        `${user.role === 'branch' ? 'Las sucursales' : 'Los repartidores'} no pueden realizar pedidos.`
      );
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        "Registro Requerido",
        "Para realizar pedidos necesitas registrarte o iniciar sesión",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ir a Registro", onPress: () => router.push("/login" as any) }
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert("Carrito Vacío", "No hay productos en tu carrito.");
      return;
    }

    setIsProcessing(true);
    
    try {
      await proceedWithOrder();
    } catch (error: any) {
      console.error('❌ [CHECKOUT] Error:', error);
      
      let errorTitle = "Error al Procesar Pedido";
      let errorMessage = "Ocurrió un error al procesar tu pedido. Por favor intenta nuevamente.";
      
      if (error?.message && typeof error.message === 'string' && error.message.length < 200) {
        errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendReceipt = () => {
    if (!selectedBranch) {
      Alert.alert("Error", "Por favor seleccione una sucursal primero");
      return;
    }

    const whatsappNumber = selectedBranch.whatsapp;
    
    let message = `🍗 *COMPROBANTE DE TRANSFERENCIA*\n\n`;
    
    if (user) {
      message += `👤 *Cliente:* ${user.name}\n`;
      if (user.phone) message += `📱 *Teléfono:* ${user.phone}\n`;
    }
    
    message += `\n🏪 *Sucursal:* ${selectedBranch.name}\n`;
    
    message += `\n📦 *Productos:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name} x${item.quantity} - L. ${formatPrice(item.product.price * item.quantity)}\n`;
    });
    
    message += `\n💰 *Total: L. ${formatPrice(total)}*\n`;
    message += `\n🚚 *Tipo:* ${deliveryType === 'pickup' ? 'Recoger en sucursal' : 'Envío a domicilio'}\n`;
    
    if (deliveryType === 'delivery' && address.trim()) {
      message += `📍 *Dirección:* ${address}\n`;
      if (selectedZone) message += `📍 *Zona:* ${selectedZone.name}\n`;
    }
    
    message += `\n¡Hola! Adjunto mi comprobante de transferencia para el pedido por L. ${formatPrice(total)}`;
    
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de Entrega</Text>
        <View style={styles.deliveryOptions}>
          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryType === "pickup" && styles.deliveryOptionSelected,
            ]}
            onPress={() => setDeliveryType("pickup")}
          >
            <Store
              size={24}
              color={deliveryType === "pickup" ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.deliveryOptionText,
                deliveryType === "pickup" && styles.deliveryOptionTextSelected,
              ]}
            >
              Recoger en Sucursal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryType === "delivery" && styles.deliveryOptionSelected,
            ]}
            onPress={() => setDeliveryType("delivery")}
          >
            <Truck
              size={24}
              color={deliveryType === "delivery" ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.deliveryOptionText,
                deliveryType === "delivery" && styles.deliveryOptionTextSelected,
              ]}
            >
              Envío a Domicilio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sucursal</Text>
        {branches.map((branch) => (
          <TouchableOpacity
            key={branch.id}
            style={[
              styles.branchCard,
              selectedBranch?.id === branch.id && styles.branchCardSelected,
            ]}
            onPress={() => {
              setSelectedBranch(branch);
              setSelectedZone(null);
            }}
          >
            <View style={styles.branchInfo}>
              <Text style={styles.branchName}>{branch.name}</Text>
              <Text style={styles.branchAddress}>{branch.address}</Text>
            </View>
            {selectedBranch?.id === branch.id && (
              <CheckCircle size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {deliveryType === "delivery" && selectedBranch && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zona de Entrega</Text>
          <View style={styles.zonesGrid}>
            {selectedBranch.deliveryZones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneChip,
                  selectedZone?.id === zone.id && styles.zoneChipSelected,
                ]}
                onPress={() => setSelectedZone(zone)}
              >
                <Text
                  style={[
                    styles.zoneChipText,
                    selectedZone?.id === zone.id && styles.zoneChipTextSelected,
                  ]}
                >
                  {zone.name}
                </Text>
                <Text
                  style={[
                    styles.zonePrice,
                    selectedZone?.id === zone.id && styles.zonePriceSelected,
                  ]}
                >
                  L. {zone.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {deliveryType === "delivery" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dirección de Entrega</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              onPress={handleGetLocation}
              disabled={isGettingLocation}
              style={styles.locationIconButton}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MapPin size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.addressInput}
              placeholder="Colonia, calle, número de casa, referencias..."
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>
          {gpsCoordinates && (
            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinatesInfo}>
                <Text style={styles.coordinatesLabel}>📍 Coordenadas GPS:</Text>
                <Text style={styles.coordinatesValue}>
                  Lat: {gpsCoordinates.latitude.toFixed(6)}
                </Text>
                <Text style={styles.coordinatesValue}>
                  Lng: {gpsCoordinates.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => {
                  const url = `https://www.google.com/maps?q=${gpsCoordinates.latitude},${gpsCoordinates.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <ExternalLink size={18} color={colors.white} />
                <Text style={styles.mapsButtonText}>Abrir en Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === "cash" && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod("cash")}
        >
          <Banknote
            size={24}
            color={paymentMethod === "cash" ? colors.primary : colors.textMuted}
          />
          <View style={styles.paymentInfo}>
            <Text
              style={[
                styles.paymentTitle,
                paymentMethod === "cash" && styles.paymentTitleSelected,
              ]}
            >
              Contra Entrega (Efectivo)
            </Text>
            <Text style={styles.paymentSubtitle}>Paga cuando recibas tu pedido</Text>
          </View>
          {paymentMethod === "cash" && <CheckCircle size={20} color={colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === "transfer" && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod("transfer")}
        >
          <CreditCard
            size={24}
            color={paymentMethod === "transfer" ? colors.primary : colors.textMuted}
          />
          <View style={styles.paymentInfo}>
            <Text
              style={[
                styles.paymentTitle,
                paymentMethod === "transfer" && styles.paymentTitleSelected,
              ]}
            >
              Transferencia Bancaria
            </Text>
            <Text style={styles.paymentSubtitle}>
              {activeBankAccounts.length > 0 ? `${activeBankAccounts.length} cuenta(s) disponible(s)` : "Sin cuentas configuradas"}
            </Text>
          </View>
          {paymentMethod === "transfer" && (
            <CheckCircle size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        {paymentMethod === "transfer" && (
          <View style={styles.bankSection}>
            <TouchableOpacity
              style={styles.viewBanksButton}
              onPress={() => setShowBankModal(true)}
            >
              <Building2 size={20} color={colors.primary} />
              <Text style={styles.viewBanksText}>Ver Cuentas Bancarias</Text>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendReceiptButton} onPress={handleSendReceipt}>
              <MessageCircle size={18} color={colors.white} />
              <Text style={styles.sendReceiptText}>Enviar por WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSentReceiptToWhatsApp(!sentReceiptToWhatsApp)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                sentReceiptToWhatsApp && styles.checkboxChecked
              ]}>
                {sentReceiptToWhatsApp && (
                  <CheckCircle size={20} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Ya envié el comprobante al WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {prizeItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Productos Canjeados con Puntos</Text>
          <View style={[styles.prizeItemsCard, { backgroundColor: colors.primary + "10" }]}>
            {prizeItems.map((item, index) => (
              <View key={index} style={styles.prizeItemRow}>
                <Text style={styles.prizeItemName}>{item.product.name} x{item.quantity}</Text>
                <Text style={styles.prizeItemPoints}>
                  {((item.product.pointsRequired || 0) * item.quantity).toLocaleString()} puntos
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cupón de Descuento</Text>
        <View style={styles.couponContainer}>
          <Tag size={20} color={colors.textMuted} />
          <TextInput
            style={styles.couponInput}
            placeholder="Ingresa tu código"
            placeholderTextColor={colors.textMuted}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas Adicionales</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Instrucciones especiales para tu pedido..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
          <Text style={styles.summaryValue}>L. {formatPrice(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={styles.summaryValue}>
            {deliveryFee > 0 ? `L. ${formatPrice(deliveryFee)}` : "Gratis"}
          </Text>
        </View>
        {prizeItems.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Premios ({prizeItems.length} canjeados)</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              GRATIS
            </Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a Pagar</Text>
          <Text style={styles.totalValue}>L. {formatPrice(total)}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.orderButton, isProcessing && styles.orderButtonDisabled]} 
        onPress={handlePlaceOrder}
        activeOpacity={0.7}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={colors.secondary} size="small" />
        ) : (
          <Text style={styles.orderButtonText}>Confirmar Pedido</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />

      <Modal visible={showBankModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cuentas Bancarias</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeBankAccounts.length === 0 ? (
                <View style={styles.noBanksContainer}>
                  <Building2 size={48} color={colors.textMuted} />
                  <Text style={styles.noBanksText}>
                    No hay cuentas bancarias configuradas
                  </Text>
                </View>
              ) : (
                activeBankAccounts.map((account) => (
                  <View key={account.id} style={styles.bankCard}>
                    <View style={styles.bankHeader}>
                      <Building2 size={24} color={colors.primary} />
                      <Text style={styles.bankName}>{account.bankName}</Text>
                    </View>
                    <View style={styles.bankDetails}>
                      <View style={styles.bankDetailRow}>
                        <Text style={styles.bankDetailLabel}>Cuenta:</Text>
                        <Text style={styles.bankDetailValue}>{account.accountNumber}</Text>
                      </View>
                      <View style={styles.bankDetailRow}>
                        <Text style={styles.bankDetailLabel}>Tipo:</Text>
                        <Text style={styles.bankDetailValue}>
                          {account.accountType === "savings" ? "Ahorro" : "Cheque"}
                        </Text>
                      </View>
                      <View style={styles.bankDetailRow}>
                        <Text style={styles.bankDetailLabel}>Titular:</Text>
                        <Text style={styles.bankDetailValue}>{account.holderName}</Text>
                      </View>
                      <View style={styles.bankDetailRow}>
                        <Text style={styles.bankDetailLabel}>RTN/DNI:</Text>
                        <Text style={styles.bankDetailValue}>{account.rtn}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showInvoiceModal} animationType="slide" transparent={false}>
        <View style={styles.invoiceModalContainer}>
          {createdOrder && selectedBranch && (
            <InvoiceView
              order={createdOrder}
              customerName={user?.name || 'Cliente'}
              branchName={selectedBranch.name}
              branchPhone={selectedBranch.phone}
            />
          )}
          <View style={styles.invoiceModalActions}>
            <TouchableOpacity
              style={[styles.invoiceActionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowInvoiceModal(false);
                clearCart();
                router.replace("/(tabs)/orders" as any);
              }}
            >
              <Text style={styles.invoiceActionButtonText}>Ver mis Pedidos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700" as const,
      marginBottom: 12,
    },
    deliveryOptions: {
      flexDirection: "row",
      gap: 12,
    },
    deliveryOption: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    deliveryOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    deliveryOptionText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600" as const,
      textAlign: "center",
    },
    deliveryOptionTextSelected: {
      color: colors.primary,
    },
    branchCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    branchCardSelected: {
      borderColor: colors.primary,
    },
    branchInfo: {
      flex: 1,
    },
    branchName: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600" as const,
    },
    branchAddress: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    zonesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    zoneChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    zoneChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    zoneChipText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "600" as const,
    },
    zoneChipTextSelected: {
      color: colors.secondary,
    },
    zonePrice: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    zonePriceSelected: {
      color: colors.secondary,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    locationIconButton: {
      padding: 4,
    },
    addressInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      minHeight: 60,
    },
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 12,
    },
    paymentOptionSelected: {
      borderColor: colors.primary,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600" as const,
    },
    paymentTitleSelected: {
      color: colors.primary,
    },
    paymentSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    bankSection: {
      marginTop: 12,
    },
    viewBanksButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      padding: 14,
      borderRadius: 12,
      gap: 10,
    },
    viewBanksText: {
      flex: 1,
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    sendReceiptButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.whatsapp,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 12,
      gap: 8,
    },
    sendReceiptText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    couponContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      paddingLeft: 14,
      gap: 12,
    },
    couponInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      paddingVertical: 10,
    },
    applyButton: {
      backgroundColor: colors.surfaceLight,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    applyButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600" as const,
    },
    notesInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      color: colors.textPrimary,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: "top",
    },
    summary: {
      padding: 16,
      backgroundColor: colors.surface,
      margin: 16,
      borderRadius: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    summaryValue: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    totalLabel: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700" as const,
    },
    totalValue: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: "800" as const,
    },
    orderButton: {
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      paddingVertical: 18,
      borderRadius: 14,
      alignItems: "center",
    },
    orderButtonText: {
      color: colors.secondary,
      fontSize: 18,
      fontWeight: "700" as const,
    },
    orderButtonDisabled: {
      opacity: 0.6,
    },
    invoiceModalContainer: {
      flex: 1,
      backgroundColor: colors.white,
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
      maxHeight: "80%",
      padding: 20,
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
    noBanksContainer: {
      alignItems: "center",
      paddingVertical: 40,
    },
    noBanksText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 12,
    },
    bankCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    bankHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    bankName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    bankDetails: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    bankDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    bankDetailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    bankDetailValue: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    prizeItemsCard: {
      borderRadius: 12,
      padding: 16,
    },
    prizeItemRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 8,
    },
    prizeItemName: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "600" as const,
      flex: 1,
    },
    prizeItemPoints: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "700" as const,
    },
    invoiceModalActions: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    invoiceActionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
    },
    invoiceActionButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700" as const,
    },
    checkboxContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginTop: 16,
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    coordinatesContainer: {
      marginTop: 12,
      backgroundColor: colors.primary + "10",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    coordinatesInfo: {
      marginBottom: 10,
    },
    coordinatesLabel: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    coordinatesValue: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      fontFamily: "monospace" as const,
      marginBottom: 2,
    },
    mapsButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      gap: 8,
    },
    mapsButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700" as const,
    },
  });
