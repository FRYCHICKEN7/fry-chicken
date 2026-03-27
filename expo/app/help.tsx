import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import { 
  HelpCircle, 
  MessageSquare, 
  ChevronRight,
  ShoppingBag,
  Truck,
  CreditCard,
  Clock,
  MapPin,
  AlertCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { formatPhoneNumberForWhatsApp } from '@/lib/formatPhoneNumber';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: '¿Cómo hago un pedido?',
    answer: 'Navega por nuestro catálogo, selecciona los productos que deseas, personaliza tu combo si es necesario, añade al carrito y finaliza tu pedido seleccionando método de entrega y pago.',
  },
  {
    question: '¿Cuánto tiempo tarda la entrega?',
    answer: 'El tiempo de entrega varía según la zona. Generalmente entre 30-45 minutos desde que tu pedido es confirmado. En horas pico puede extenderse un poco más.',
  },
  {
    question: '¿Cuáles son los métodos de pago?',
    answer: 'Aceptamos pago en efectivo contra entrega y transferencias bancarias. Los datos de la cuenta para transferencia se muestran al finalizar el pedido.',
  },
  {
    question: '¿Puedo cancelar mi pedido?',
    answer: 'Puedes cancelar tu pedido mientras esté en estado "Pendiente". Una vez que entre en preparación, no es posible cancelarlo.',
  },
  {
    question: '¿Qué zonas cubren para delivery?',
    answer: 'Cada sucursal tiene sus propias zonas de cobertura. Puedes ver las zonas disponibles y el costo de envío al momento de hacer tu pedido.',
  },
  {
    question: '¿Cómo uso un cupón de descuento?',
    answer: 'Ingresa el código de tu cupón en la sección correspondiente durante el checkout. El descuento se aplicará automáticamente si el cupón es válido.',
  },
];

const helpOptions = [
  { icon: ShoppingBag, title: 'Pedidos', description: 'Ayuda con tus pedidos' },
  { icon: Truck, title: 'Entregas', description: 'Información sobre envíos' },
  { icon: CreditCard, title: 'Pagos', description: 'Métodos y problemas de pago' },
  { icon: Clock, title: 'Horarios', description: 'Horarios de atención' },
  { icon: MapPin, title: 'Sucursales', description: 'Ubicaciones y contacto' },
  { icon: AlertCircle, title: 'Reportar Problema', description: 'Problemas con tu pedido' },
];

export default function HelpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { businessHours, branches, getActiveBankAccounts, orders } = useData();
  const [expandedFAQ, setExpandedFAQ] = React.useState<number | null>(null);
  const [showHoursModal, setShowHoursModal] = React.useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = React.useState(false);
  const [showBranchesModal, setShowBranchesModal] = React.useState(false);

  const handleContact = () => {
    Linking.openURL('https://wa.me/50499889315?text=Hola, necesito ayuda');
  };

  const handleHelpOption = (title: string) => {
    switch (title) {
      case 'Pedidos':
        if (user?.role === 'customer') {
          const customerOrders = orders
            .filter(o => o.customerId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          if (customerOrders.length > 0) {
            const latestOrder = customerOrders[0];
            const branch = branches.find(b => b.id === latestOrder.branchId);
            
            if (branch?.whatsapp) {
              const message = `Hola, tengo una consulta sobre mi pedido ${latestOrder.orderNumber}`;
              Linking.openURL(`https://wa.me/${formatPhoneNumberForWhatsApp(branch.whatsapp)}?text=${encodeURIComponent(message)}`);
              return;
            }
          }
        }
        router.push('/(tabs)/orders' as any);
        break;
      case 'Horarios':
        setShowHoursModal(true);
        break;
      case 'Pagos':
        setShowPaymentsModal(true);
        break;
      case 'Sucursales':
        setShowBranchesModal(true);
        break;
      case 'Entregas':
      case 'Reportar Problema':
        const message = title === 'Entregas' 
          ? 'Hola, necesito información sobre entregas'
          : 'Hola, tengo un problema con mi pedido';
        Linking.openURL(`https://wa.me/50499889315?text=${encodeURIComponent(message)}`);
        break;
    }
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
  };

  const openGoogleMaps = (mapsUrl: string) => {
    Linking.openURL(mapsUrl).catch(() => {
      // Handle error silently
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Centro de Ayuda' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <HelpCircle size={32} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>¿En qué podemos ayudarte?</Text>
          <Text style={styles.headerSubtitle}>
            Encuentra respuestas a tus preguntas o contacta con nuestro equipo de soporte
          </Text>
        </View>

        <View style={styles.contactSection}>
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <MessageSquare size={22} color="#25D366" />
            <Text style={styles.contactButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.complaintsCard}
          onPress={() => router.push('/complaints' as any)}
        >
          <View style={styles.complaintsIcon}>
            <MessageSquare size={24} color={Colors.primary} />
          </View>
          <View style={styles.complaintsInfo}>
            <Text style={styles.complaintsTitle}>Quejas y Sugerencias</Text>
            <Text style={styles.complaintsSubtitle}>¿Tuviste un problema? Cuéntanos</Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temas de Ayuda</Text>
          <View style={styles.helpGrid}>
            {helpOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.helpOption}
                  onPress={() => handleHelpOption(option.title)}
                >
                  <View style={styles.helpOptionIcon}>
                    <Icon size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.helpOptionTitle}>{option.title}</Text>
                  <Text style={styles.helpOptionDesc}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <ChevronRight 
                  size={18} 
                  color={Colors.textMuted} 
                  style={{ transform: [{ rotate: expandedFAQ === index ? '90deg' : '0deg' }] }}
                />
              </View>
              {expandedFAQ === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿No encontraste lo que buscabas? Contáctanos por WhatsApp y te ayudaremos.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showHoursModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHoursModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Horarios de Atención</Text>
              <TouchableOpacity onPress={() => setShowHoursModal(false)}>
                <ChevronRight size={24} color={Colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {branches.map((branch) => {
                const branchHours = branch.businessHours || businessHours;
                return (
                  <View key={branch.id} style={styles.branchHoursCard}>
                    <Text style={styles.branchHoursName}>{branch.name}</Text>
                    <View style={styles.hoursContainer}>
                      {branchHours.map((hour) => (
                        <View key={hour.dayOfWeek} style={styles.hourRow}>
                          <Text style={styles.dayText}>{getDayName(hour.dayOfWeek)}</Text>
                          <Text style={styles.timeText}>
                            {hour.isOpen 
                              ? `${formatTime12Hour(hour.openTime)} - ${formatTime12Hour(hour.closeTime)}`
                              : 'Cerrado'
                            }
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Métodos de Pago</Text>
              <TouchableOpacity onPress={() => setShowPaymentsModal(false)}>
                <ChevronRight size={24} color={Colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentIcon}>
                  <CreditCard size={24} color={Colors.primary} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Efectivo</Text>
                  <Text style={styles.paymentDescription}>Paga en efectivo al recibir tu pedido</Text>
                </View>
              </View>

              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentIcon}>
                  <CreditCard size={24} color={Colors.primary} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Transferencia Bancaria</Text>
                  <Text style={styles.paymentDescription}>Realiza tu pago mediante transferencia</Text>
                </View>
              </View>

              {getActiveBankAccounts().length > 0 && (
                <View style={styles.bankAccountsSection}>
                  <Text style={styles.sectionSubtitle}>Cuentas Bancarias Disponibles:</Text>
                  {getActiveBankAccounts().map((account) => (
                    <View key={account.id} style={styles.bankAccountCard}>
                      <Text style={styles.bankName}>{account.bankName}</Text>
                      <View style={styles.accountRow}>
                        <Text style={styles.accountLabel}>Número de Cuenta:</Text>
                        <Text style={styles.accountValue}>{account.accountNumber}</Text>
                      </View>
                      <View style={styles.accountRow}>
                        <Text style={styles.accountLabel}>Tipo:</Text>
                        <Text style={styles.accountValue}>
                          {account.accountType === 'savings' ? 'Ahorros' : 'Corriente'}
                        </Text>
                      </View>
                      <View style={styles.accountRow}>
                        <Text style={styles.accountLabel}>Titular:</Text>
                        <Text style={styles.accountValue}>{account.holderName}</Text>
                      </View>
                      {account.rtn && (
                        <View style={styles.accountRow}>
                          <Text style={styles.accountLabel}>RTN:</Text>
                          <Text style={styles.accountValue}>{account.rtn}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showBranchesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBranchesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuestras Sucursales</Text>
              <TouchableOpacity onPress={() => setShowBranchesModal(false)}>
                <ChevronRight size={24} color={Colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.branchCard}
                  onPress={() => {
                    if (branch.mapsLink) {
                      openGoogleMaps(branch.mapsLink);
                    }
                  }}
                >
                  <View style={styles.branchIcon}>
                    <MapPin size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.branchInfo}>
                    <Text style={styles.branchName}>{branch.name}</Text>
                    <Text style={styles.branchAddress}>{branch.address}</Text>
                    <Text style={styles.branchPhone}>Tel: {branch.phone}</Text>
                    {branch.mapsLink && (
                      <Text style={styles.branchMapLink}>Toca para abrir en Google Maps</Text>
                    )}
                  </View>
                  <ChevronRight size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  complaintsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  complaintsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintsInfo: {
    flex: 1,
  },
  complaintsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  complaintsSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  helpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  helpOption: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  helpOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  helpOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  helpOptionDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  faqItem: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 10,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  branchHoursCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  branchHoursName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  hoursContainer: {
    gap: 8,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bankAccountsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  bankAccountCard: {
    backgroundColor: Colors.primary + '10',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  accountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  branchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  branchAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  branchPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  branchMapLink: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
});
