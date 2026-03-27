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
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { 
  Truck,
  User,
  Phone,
  MapPin,
  CreditCard,
  MessageCircle,
  ChevronDown,
  X,
  Bike,
  CheckCircle,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useData } from '@/providers/DataProvider';
import { Branch } from '@/types';

type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'other';

export default function DeliveryRegisterScreen() {
  const router = useRouter();
  const { branches, registerDelivery } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [branchSelectorVisible, setBranchSelectorVisible] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<Branch[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dni: '',
    address: '',
    vehicleType: 'motorcycle' as VehicleType,
    vehicleDescription: '',
    plateNumber: '',
    password: '',
    confirmPassword: '',
  });

  const vehicleOptions: { type: VehicleType; label: string; icon: any }[] = [
    { type: 'motorcycle', label: 'Moto', icon: Bike },
    { type: 'other', label: 'Otro', icon: Truck },
  ];

  const handleWhatsAppPress = () => {
    if (selectedBranches.length === 0) {
      Alert.alert(
        'Sucursal no seleccionada',
        'Es necesario seleccionar al menos una sucursal para poder enviar la foto de la identidad vía WhatsApp'
      );
      return;
    }

    const firstBranch = selectedBranches[0];
    const whatsappNumber = firstBranch.whatsapp.replace(/[^0-9]/g, '');
    const branchNames = selectedBranches.map(b => b.name).join(', ');
    const message = encodeURIComponent(
      `Hola, me gustaría enviar mi foto de identidad (DNI) para mi registro como repartidor.\n\nNombre: ${formData.name || '[Pendiente]'}\nDNI: ${formData.dni || '[Pendiente]'}\nTeléfono: ${formData.phone || '[Pendiente]'}\nCorreo: ${formData.email || '[Pendiente]'}\nSucursales: ${branchNames}`
    );
    const url = `https://wa.me/${whatsappNumber}?text=${message}`;
    Linking.openURL(url);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.dni || !formData.address || !formData.plateNumber || !formData.password) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (formData.vehicleType === 'other' && !formData.vehicleDescription.trim()) {
      Alert.alert('Error', 'Por favor describe el tipo de vehículo');
      return;
    }

    if (selectedBranches.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos una sucursal');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      for (const branch of selectedBranches) {
        const deliveryData: any = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          dni: formData.dni,
          dniPhoto: 'pending',
          address: formData.address,
          vehicleType: formData.vehicleType,
          plateNumber: formData.plateNumber.toUpperCase(),
          password: formData.password,
          branchId: branch.id,
        };

        if (formData.vehicleType === 'other' && formData.vehicleDescription.trim()) {
          deliveryData.vehicleDescription = formData.vehicleDescription;
        }

        await registerDelivery(deliveryData);
      }
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo completar el registro');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Registro de Repartidor' }} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={80} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>¡Solicitud Enviada!</Text>
          <Text style={styles.successText}>
            Tu solicitud para unirte como repartidor ha sido enviada a {selectedBranches.length} sucursal{selectedBranches.length > 1 ? 'es' : ''}: {selectedBranches.map(b => b.name).join(', ')}. 
            Te contactaremos pronto para confirmar tu registro.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Registro de Repartidor' }} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Truck size={32} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>¡Únete a nuestro equipo!</Text>
          <Text style={styles.headerSubtitle}>
            Completa el formulario para registrarte como repartidor de Fry Chicken
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Tu nombre completo"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de DNI *</Text>
            <View style={styles.inputWrapper}>
              <CreditCard size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={formData.dni}
                onChangeText={(text) => setFormData({ ...formData, dni: text })}
                placeholder="0801-1990-12345"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+504 9999-9999"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección *</Text>
            <View style={styles.inputWrapper}>
              <MapPin size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Tu dirección completa"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sucursales a las que deseas unirte *</Text>
            <TouchableOpacity 
              style={styles.branchSelector}
              onPress={() => setBranchSelectorVisible(true)}
            >
              <MapPin size={20} color={selectedBranches.length > 0 ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.branchSelectorText, selectedBranches.length === 0 && styles.placeholderText]}>
                {selectedBranches.length > 0 
                  ? `${selectedBranches.length} sucursal${selectedBranches.length > 1 ? 'es' : ''} seleccionada${selectedBranches.length > 1 ? 's' : ''}` 
                  : 'Seleccionar sucursales'}
              </Text>
              <ChevronDown size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            {selectedBranches.length > 0 && (
              <View style={styles.selectedBranchesList}>
                {selectedBranches.map(branch => (
                  <View key={branch.id} style={styles.selectedBranchChip}>
                    <Text style={styles.selectedBranchText}>{branch.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tipo de Vehículo *</Text>
            <View style={styles.vehicleSelector}>
              {vehicleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.vehicleType === option.type;
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[styles.vehicleOption, isSelected && styles.vehicleOptionActive]}
                    onPress={() => setFormData({ ...formData, vehicleType: option.type })}
                  >
                    <Icon size={24} color={isSelected ? '#FFD700' : Colors.textMuted} />
                    <Text style={[styles.vehicleOptionText, isSelected && styles.vehicleOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {formData.vehicleType === 'other' && (
              <View style={styles.otherVehicleContainer}>
                <TextInput
                  style={styles.inputSimple}
                  value={formData.vehicleDescription}
                  onChangeText={(text) => setFormData({ ...formData, vehicleDescription: text })}
                  placeholder="Describe tu vehículo (ej: bicicleta, patineta, etc.)"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de Placa *</Text>
            <TextInput
              style={styles.inputSimple}
              value={formData.plateNumber}
              onChangeText={(text) => setFormData({ ...formData, plateNumber: text.toUpperCase() })}
              placeholder="ABC-1234"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Enviar Foto del DNI vía WhatsApp</Text>
            <TouchableOpacity 
              style={styles.whatsappButton} 
              onPress={handleWhatsAppPress}
            >
              <MessageCircle size={24} color="#25D366" />
              <View style={styles.whatsappButtonContent}>
                <Text style={styles.whatsappButtonTitle}>Enviar foto del DNI por WhatsApp</Text>
                <Text style={styles.whatsappButtonSubtitle}>
                  {selectedBranches.length > 0
                    ? `Contactar con ${selectedBranches[0].name}`
                    : 'Selecciona al menos una sucursal primero'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirmar Contraseña *</Text>
            <TextInput
              style={styles.inputSimple}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              placeholder="Repite tu contraseña"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Truck size={20} color={Colors.secondary} />
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Al enviar tu solicitud, aceptas que tus datos sean revisados por el equipo de Fry Chicken 
            para validar tu registro como repartidor.
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={branchSelectorVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Sucursales</Text>
              <TouchableOpacity onPress={() => setBranchSelectorVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.branchList}>
              {branches.map((branch) => {
                const isSelected = selectedBranches.some(b => b.id === branch.id);
                return (
                  <TouchableOpacity
                    key={branch.id}
                    style={[
                      styles.branchOption,
                      isSelected && styles.branchOptionSelected,
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedBranches(selectedBranches.filter(b => b.id !== branch.id));
                      } else {
                        setSelectedBranches([...selectedBranches, branch]);
                      }
                    }}
                  >
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected
                    ]}>
                      {isSelected && <CheckCircle size={20} color={Colors.primary} />}
                    </View>
                    <View style={styles.branchOptionInfo}>
                      <Text style={[
                        styles.branchOptionName,
                        isSelected && styles.branchOptionNameSelected,
                      ]}>
                        {branch.name}
                      </Text>
                      <Text style={styles.branchOptionAddress}>{branch.address}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setBranchSelectorVisible(false)}
              >
                <Text style={styles.doneButtonText}>Listo ({selectedBranches.length})</Text>
              </TouchableOpacity>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputSimple: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
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
  vehicleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicleOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 6,
  },
  vehicleOptionActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  vehicleOptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  vehicleOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#25D366',
    gap: 12,
  },
  whatsappButtonContent: {
    flex: 1,
  },
  whatsappButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  whatsappButtonSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
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
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    borderColor: Colors.primary,
  },
  branchOptionInfo: {
    flex: 1,
  },
  branchOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  branchOptionNameSelected: {
    color: Colors.primary,
  },
  branchOptionAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  selectedBranchesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectedBranchChip: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedBranchText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  otherVehicleContainer: {
    marginTop: 12,
  },
});
