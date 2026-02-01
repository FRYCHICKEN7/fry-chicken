import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Order } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface InvoiceViewProps {
  order: Order;
  customerName: string;
  branchName: string;
  branchPhone: string;
}

export default function InvoiceView({ order, customerName, branchName, branchPhone }: InvoiceViewProps) {
  const date = new Date(order.createdAt).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusText = () => {
    switch (order.status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'En Preparación';
      case 'ready': return 'Listo';
      case 'dispatched': return 'En Camino';
      case 'delivered': return 'Entregado';
      case 'rejected': return 'Rechazado';
      default: return order.status;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image
          source={{ uri: "https://frychickenhn.com/wp-content/uploads/2025/12/Encabezado.jpg" }}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay}>
          <Text style={styles.headerSubtitle}>Tu factura está lista</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>¡Gracias por tu pedido!</Text>
        <Text style={styles.greeting}>Hola <Text style={styles.bold}>{customerName}</Text>,</Text>
        <Text style={styles.paragraph}>
          Hemos recibido tu pedido exitosamente. A continuación encontrarás los detalles de tu compra.
        </Text>

        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Pedido #{order.orderNumber}</Text>
          <View style={styles.orderDetails}>
            <Text style={styles.orderDetailText}>
              <Text style={styles.bold}>Fecha:</Text> {date}
            </Text>
            <Text style={styles.orderDetailText}>
              <Text style={styles.bold}>Estado:</Text> <Text style={styles.badge}>{getStatusText()}</Text>
            </Text>
            <Text style={styles.orderDetailText}>
              <Text style={styles.bold}>Tipo:</Text> {order.deliveryType === 'delivery' ? 'Envío a Domicilio' : 'Recoger en Sucursal'}
            </Text>
            {order.deliveryAddress && (
              <Text style={styles.orderDetailText}>
                <Text style={styles.bold}>Dirección:</Text> {order.deliveryAddress}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle del Pedido</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Producto</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Precio</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Subtotal</Text>
          </View>

          {order.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.col1}>
                <Text style={styles.tableText}>{item.productName}</Text>
                {item.selectedDrink && (
                  <Text style={styles.drinkText}>+ {item.selectedDrink.name}</Text>
                )}
              </View>
              <Text style={[styles.tableText, styles.col2]}>{item.quantity}</Text>
              <Text style={[styles.tableText, styles.col3]}>L. {formatPrice(item.price)}</Text>
              <Text style={[styles.tableText, styles.col4]}>L. {formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}

          <View style={styles.tableFooter}>
            <View style={styles.footerRow}>
              <Text style={styles.footerLabel}>Subtotal:</Text>
              <Text style={styles.footerValue}>L. {formatPrice(order.subtotal)}</Text>
            </View>
            {order.deliveryFee > 0 && (
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Envío:</Text>
                <Text style={styles.footerValue}>L. {formatPrice(order.deliveryFee)}</Text>
              </View>
            )}
            {order.discount > 0 && (
              <View style={styles.footerRow}>
                <Text style={[styles.footerLabel, styles.discountText]}>Descuento:</Text>
                <Text style={[styles.footerValue, styles.discountText]}>-L. {formatPrice(order.discount)}</Text>
              </View>
            )}
            <View style={[styles.footerRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>L. {formatPrice(order.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.paymentText}>
            💳 <Text style={styles.bold}>Método de Pago:</Text> {order.paymentMethod === 'cash' ? 'Efectivo contra entrega' : 'Transferencia bancaria'}
          </Text>
        </View>

        {order.notes && (
          <View style={styles.notesInfo}>
            <Text style={styles.notesText}>
              📝 <Text style={styles.bold}>Notas:</Text> {order.notes}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Información de Contacto</Text>
        <View style={styles.contactInfo}>
          <Text style={styles.contactText}>
            <Text style={styles.bold}>Sucursal:</Text> {branchName}
          </Text>
          <Text style={styles.contactText}>
            <Text style={styles.bold}>Teléfono:</Text> {branchPhone}
          </Text>
        </View>

        <View style={styles.refundPolicy}>
          <Text style={styles.refundTitle}>Política de Reembolso</Text>
          <Text style={styles.refundText}>
            Si tienes algún problema con tu pedido, contáctanos dentro de las primeras 24 horas 
            a través de nuestro WhatsApp o en la app. Conserva esta factura como comprobante de compra.
          </Text>
          <View style={styles.refundDetails}>
            <Text style={styles.refundDetailText}>
              <Text style={styles.bold}>Número de orden:</Text> {order.orderNumber}
            </Text>
            <Text style={styles.refundDetailText}>
              <Text style={styles.bold}>Fecha de pedido:</Text> {date}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>🍗 Fry Chicken - ¡Delicioso en cada bocado!</Text>
        <Text style={styles.footerSubtitle}>
          Gracias por tu preferencia
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'relative',
    width: '100%',
    height: 120,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333333',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 20,
  },
  bold: {
    fontWeight: '700' as const,
  },
  orderInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#E63946',
    marginBottom: 10,
  },
  orderDetails: {
    gap: 5,
  },
  orderDetailText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#FFC107',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333333',
    marginTop: 10,
    marginBottom: 15,
  },
  table: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#DDDDDD',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tableText: {
    fontSize: 12,
    color: '#333333',
  },
  drinkText: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  col1: {
    flex: 2,
  },
  col2: {
    flex: 0.5,
    textAlign: 'center',
  },
  col3: {
    flex: 1,
    textAlign: 'right',
  },
  col4: {
    flex: 1,
    textAlign: 'right',
  },
  tableFooter: {
    backgroundColor: '#FAFAFA',
    padding: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footerLabel: {
    fontSize: 13,
    color: '#666666',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#333333',
  },
  discountText: {
    color: '#28A745',
  },
  totalRow: {
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#E63946',
  },
  paymentInfo: {
    backgroundColor: '#E7F3FF',
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 4,
    marginBottom: 15,
  },
  paymentText: {
    fontSize: 13,
    color: '#333333',
  },
  notesInfo: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    borderRadius: 4,
    marginBottom: 15,
  },
  notesText: {
    fontSize: 13,
    color: '#333333',
  },
  contactInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    gap: 5,
  },
  contactText: {
    fontSize: 13,
    color: '#333333',
  },
  refundPolicy: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  refundTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#333333',
    marginBottom: 10,
  },
  refundText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 10,
  },
  refundDetails: {
    gap: 5,
  },
  refundDetailText: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#333333',
  },
  footerSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 10,
  },
});
