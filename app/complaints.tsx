import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  MessageSquare, 
  AlertCircle, 
  Lightbulb, 
  ChevronDown, 
  X, 
  MapPin,
  Send,
  CheckCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Branch } from '@/types';

type ComplaintType = 'complaint' | 'suggestion' | 'order_issue';

export default function ComplaintsScreen() {
  const { branches, addComplaint } = useData();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<ComplaintType>('complaint');
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    customerName: user?.name || '',
    customerPhone: user?.phone || '',
    orderNumber: '',
    subject: '',
    description: '',
  });

  const complaintTypes = [
    { id: 'complaint' as ComplaintType, label: 'Queja', icon: AlertCircle, color: Colors.accent },
    { id: 'suggestion' as ComplaintType, label: 'Sugerencia', icon: Lightbulb, color: Colors.primary },
    { id: 'order_issue' as ComplaintType, label: 'Problema con Pedido', icon: MessageSquare, color: '#3B82F6' },
  ];

  const handleSubmit = async () => {
    if (!selectedBranch) {
      Alert.alert('Error', 'Por favor selecciona la sucursal donde ocurrió el incidente');
      return;
    }
    if (!formData.customerName || !formData.customerPhone) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y teléfono');
      return;
    }
    if (!formData.subject || !formData.description) {
      Alert.alert('Error', 'Por favor completa el asunto y descripción');
      return;
    }
    if (selectedType === 'order_issue' && !formData.orderNumber) {
      Alert.alert('Error', 'Por favor ingresa el número de pedido');
      return;
    }

    try {
      await addComplaint({
        branchId: selectedBranch.id,
        customerId: user?.id,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        type: selectedType,
        orderNumber: formData.orderNumber || undefined,
        subject: formData.subject,
        description: formData.description,
      });
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'No se pudo enviar tu mensaje. Intenta de nuevo.');
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Quejas y Sugerencias' }} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>¡Mensaje Enviado!</Text>
          <Text style={styles.successText}>
            Tu {selectedType === 'complaint' ? 'queja' : selectedType === 'suggestion' ? 'sugerencia' : 'reporte'} ha sido 
            recibido. La sucursal {selectedBranch?.name} lo revisará pronto.
          </Text>
          <TouchableOpacity 
            style={styles.newButton}
            onPress={() => {
              setSubmitted(false);
              setFormData({ customerName: user?.name || '', customerPhone: user?.phone || '', orderNumber: '', subject: '', description: '' });
              setSelectedBranch(null);
            }}
          >
            <Text style={styles.newButtonText}>Enviar Otro Mensaje</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Quejas y Sugerencias' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>¿Cómo podemos ayudarte?</Text>
          <Text style={styles.headerSubtitle}>
            Tu opinión es importante. Selecciona la sucursal donde ocurrió el incidente.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sucursal *</Text>
          <TouchableOpacity 
            style={styles.branchSelector}
            onPress={() => setBranchSelectorVisible(true)}
          >
            <MapPin size={18} color={selectedBranch ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.branchSelectorText, !selectedBranch && styles.placeholderText]}>
              {selectedBranch?.name || 'Seleccionar sucursal donde ocurrió el incidente'}
            </Text>
            <ChevronDown size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Mensaje</Text>
          <View style={styles.typeSelector}>
            {complaintTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeOption, isSelected && { borderColor: type.color, backgroundColor: type.color + '15' }]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <Icon size={24} color={isSelected ? type.color : Colors.textMuted} />
                  <Text style={[styles.typeLabel, isSelected && { color: type.color }]}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus Datos</Text>
          <TextInput
            style={styles.input}
            value={formData.customerName}
            onChangeText={(text) => setFormData({ ...formData, customerName: text })}
            placeholder="Tu nombre completo *"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={formData.customerPhone}
            onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
            placeholder="Tu número de teléfono *"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
          {selectedType === 'order_issue' && (
            <TextInput
              style={styles.input}
              value={formData.orderNumber}
              onChangeText={(text) => setFormData({ ...formData, orderNumber: text })}
              placeholder="Número de pedido (Ej: FRY-001234) *"
              placeholderTextColor={Colors.textMuted}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Mensaje</Text>
          <TextInput
            style={styles.input}
            value={formData.subject}
            onChangeText={(text) => setFormData({ ...formData, subject: text })}
            placeholder="Asunto *"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe tu queja, sugerencia o problema con detalle *"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Send size={20} color={Colors.secondary} />
          <Text style={styles.submitButtonText}>Enviar Mensaje</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tu mensaje será revisado por la sucursal seleccionada y recibirás una respuesta pronto.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={branchSelectorVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Sucursal</Text>
              <TouchableOpacity onPress={() => setBranchSelectorVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.branchList}>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.branchOption,
                    selectedBranch?.id === branch.id && styles.branchOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBranch(branch);
                    setBranchSelectorVisible(false);
                  }}
                >
                  <View style={styles.branchOptionIcon}>
                    <MapPin size={20} color={selectedBranch?.id === branch.id ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={styles.branchOptionInfo}>
                    <Text style={[
                      styles.branchOptionText,
                      selectedBranch?.id === branch.id && styles.branchOptionTextSelected,
                    ]}>
                      {branch.name}
                    </Text>
                    <Text style={styles.branchOptionAddress}>{branch.address}</Text>
                  </View>
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
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  branchSelectorText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 6,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  submitButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  newButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  newButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  branchList: {
    padding: 16,
  },
  branchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  branchOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  branchOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchOptionInfo: {
    flex: 1,
  },
  branchOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  branchOptionTextSelected: {
    color: Colors.primary,
  },
  branchOptionAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
