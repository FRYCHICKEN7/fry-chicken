import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Linking } from 'react-native';
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  ChevronRight,
  Star,
  X,
  MapPin,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Order, OrderStatus } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onRate?: (orderId: string, rating: number, reason?: string) => void;
  onCancel?: (orderId: string, reason: string) => void;
  branchMapsLink?: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any; bgColor: string }> = {
  pending: { label: 'Orden Recibida', color: '#F59E0B', icon: Clock, bgColor: '#FEF3C7' },
  confirmed: { label: 'Confirmado', color: '#3B82F6', icon: CheckCircle, bgColor: '#DBEAFE' },
  preparing: { label: 'Orden en Cocina', color: '#8B5CF6', icon: Package, bgColor: '#EDE9FE' },
  ready: { label: 'Orden Lista', color: '#10B981', icon: CheckCircle, bgColor: '#D1FAE5' },
  dispatched: { label: 'Asignada a Repartidor', color: '#3B82F6', icon: Truck, bgColor: '#DBEAFE' },
  delivered: { label: 'Entregado', color: '#10B981', icon: CheckCircle, bgColor: '#D1FAE5' },
  rejected: { label: 'Rechazado', color: '#EF4444', icon: XCircle, bgColor: '#FEE2E2' },
};

export default function OrderCard({ order, onPress, onRate, onCancel, branchMapsLink }: OrderCardProps) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingReason, setRatingReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const date = new Date(order.createdAt);

  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    if ((rating === 1 || rating === 2) && !ratingReason.trim()) {
      Alert.alert('Explicación Requerida', 'Por favor explica el motivo de tu calificación baja');
      return;
    }

    if (onRate) {
      onRate(order.id, rating, ratingReason);
    }
    setShowRatingModal(false);
    setRating(0);
    setRatingReason('');
    Alert.alert('¡Gracias!', 'Tu calificación ha sido registrada');
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Por favor indica el motivo de la cancelación');
      return;
    }

    if (onCancel) {
      onCancel(order.id, cancelReason);
    }
    setShowCancelModal(false);
    setCancelReason('');
  };

  const canCancelOrder = () => {
    if (!['pending', 'confirmed'].includes(order.status)) return false;
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
    return diffMinutes <= 5;
  };

  useEffect(() => {
    if (!['pending', 'confirmed'].includes(order.status)) return;

    const getRemainingSeconds = () => {
      const orderTime = new Date(order.createdAt);
      const now = new Date();
      const elapsedMs = now.getTime() - orderTime.getTime();
      const remainingMs = (5 * 60 * 1000) - elapsedMs;
      return Math.max(0, Math.floor(remainingMs / 1000));
    };

    const updateTimer = () => {
      const seconds = getRemainingSeconds();
      setRemainingTime(seconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt, order.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={[
      styles.container,
      { backgroundColor: order.isPrizeOrder ? '#6B21A8' : status.bgColor },
      order.isPrizeOrder && styles.prizeOrderContainer
    ]} onPress={onPress} activeOpacity={0.8}>
      {order.isPrizeOrder && (
        <View style={styles.prizeBanner}>
          <Text style={styles.prizeBannerText}>🏆 PREMIO</Text>
        </View>
      )}
      <View style={styles.header}>
        <View>
          <Text style={[styles.orderNumber, order.isPrizeOrder && styles.prizeText]}>{order.orderNumber}</Text>
          <Text style={[styles.date, order.isPrizeOrder && styles.prizeSecondaryText]}>
            {date.toLocaleDateString('es-HN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <StatusIcon size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, order.isPrizeOrder && styles.prizeDivider]} />

      <View style={styles.footer}>
        <View>
          <Text style={[styles.totalLabel, order.isPrizeOrder && styles.prizeSecondaryText]}>Total</Text>
          <Text style={[styles.total, order.isPrizeOrder && styles.prizePrimaryText]}>L. {formatPrice(order.total)}</Text>
        </View>
        <View style={styles.deliveryInfo}>
          <Text style={[styles.deliveryType, order.isPrizeOrder && styles.prizeSecondaryText]}>
            {order.deliveryType === 'pickup' ? 'Recoger en tienda' : 'Delivery'}
          </Text>
          <ChevronRight size={20} color={order.isPrizeOrder ? '#E9D5FF' : Colors.textSecondary} />
        </View>
      </View>

      {order.status === 'delivered' && order.deliveryType === 'delivery' && order.deliveryId && (
        <TouchableOpacity
          style={styles.rateButton}
          onPress={(e) => {
            e.stopPropagation();
            setShowRatingModal(true);
          }}
        >
          <Star size={16} color={Colors.primary} />
          <Text style={styles.rateButtonText}>Calificar Repartidor</Text>
        </TouchableOpacity>
      )}

      {canCancelOrder() && remainingTime > 0 && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={(e) => {
            e.stopPropagation();
            setShowCancelModal(true);
          }}
        >
          <XCircle size={16} color={Colors.accent} />
          <Text style={styles.cancelButtonText}>
            Cancelar Pedido ({formatTime(remainingTime)})
          </Text>
        </TouchableOpacity>
      )}

      {branchMapsLink && (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={(e) => {
            e.stopPropagation();
            Linking.openURL(branchMapsLink).catch(() => {
              Alert.alert('Error', 'No se pudo abrir el enlace de ubicación');
            });
          }}
        >
          <MapPin size={16} color="#FFFFFF" />
          <Text style={styles.locationButtonText}>
            Ver Ubicación de Sucursal
          </Text>
        </TouchableOpacity>
      )}

      <Modal visible={showRatingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calificar Repartidor</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingLabel}>¿Cómo fue tu experiencia con el repartidor?</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={40}
                    color={star <= rating ? Colors.primary : Colors.border}
                    fill={star <= rating ? Colors.primary : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingDescription}>
                {rating === 1 ? 'Muy malo' : rating === 2 ? 'Malo' : rating === 3 ? 'Regular' : rating === 4 ? 'Bueno' : 'Excelente'}
              </Text>
            )}

            {(rating === 1 || rating === 2) && (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Por favor explica el motivo:</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="¿Qué salió mal?"
                  placeholderTextColor={Colors.textMuted}
                  value={ratingReason}
                  onChangeText={setRatingReason}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || ((rating === 1 || rating === 2) && !ratingReason.trim())) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitRating}
              disabled={rating === 0 || ((rating === 1 || rating === 2) && !ratingReason.trim())}
            >
              <Text style={styles.submitButtonText}>Enviar Calificación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar Pedido</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningContainer}>
              <XCircle size={24} color={Colors.accent} />
              <Text style={styles.warningText}>
                Solo puedes cancelar dentro de los primeros 5 minutos de realizado el pedido.
              </Text>
            </View>

            <Text style={styles.cancelLabel}>Por favor indica el motivo de la cancelación:</Text>
            
            <View style={styles.cancelReasons}>
              {['Pedí por error', 'Demora en confirmación', 'Cambié de opinión', 'Otro motivo'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.cancelReasonButton,
                    cancelReason === reason && styles.cancelReasonButtonSelected,
                  ]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text
                    style={[
                      styles.cancelReasonText,
                      cancelReason === reason && styles.cancelReasonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {cancelReason === 'Otro motivo' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe el motivo..."
                placeholderTextColor={Colors.textMuted}
                value={cancelReason === 'Otro motivo' ? '' : cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
              />
            )}

            <TouchableOpacity
              style={[
                styles.submitCancelButton,
                !cancelReason.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleCancelOrder}
              disabled={!cancelReason.trim()}
            >
              <Text style={styles.submitCancelButtonText}>Confirmar Cancelación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prizeOrderContainer: {
    borderWidth: 2,
    borderColor: '#A855F7',
    backgroundColor: '#6B21A8',
  },
  prizeBanner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#A855F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 12,
    zIndex: 10,
  },
  prizeBannerText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  prizeText: {
    color: '#FFFFFF',
  },
  prizeSecondaryText: {
    color: '#E9D5FF',
  },
  prizePrimaryText: {
    color: '#FFD700',
  },
  prizeDivider: {
    backgroundColor: '#A855F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  total: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryType: {
    color: '#6B7280',
    fontSize: 13,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  rateButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ratingLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonContainer: {
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent + '15',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  cancelButtonText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '10',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.accent,
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  cancelReasons: {
    gap: 10,
    marginBottom: 16,
  },
  cancelReasonButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cancelReasonButtonSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '10',
  },
  cancelReasonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cancelReasonTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
  submitCancelButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitCancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
