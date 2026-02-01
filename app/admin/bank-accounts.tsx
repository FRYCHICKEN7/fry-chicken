import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import {
  Plus,
  Building2,
  Edit2,
  Trash2,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { BankAccount } from "@/types";

export default function BankAccountsScreen() {
  const { colors } = useTheme();
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountType: "savings" as "savings" | "checking",
    holderName: "",
    rtn: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      bankName: "",
      accountNumber: "",
      accountType: "savings",
      holderName: "",
      rtn: "",
      isActive: true,
    });
    setEditingAccount(null);
  };

  const handleOpenModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        holderName: account.holderName,
        rtn: account.rtn,
        isActive: account.isActive,
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.bankName.trim() || !formData.accountNumber.trim() || !formData.rtn.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
      return;
    }

    try {
      if (editingAccount) {
        await updateBankAccount(editingAccount.id, formData);
        Alert.alert("Éxito", "Cuenta bancaria actualizada correctamente");
      } else {
        await addBankAccount(formData);
        Alert.alert("Éxito", "Cuenta bancaria agregada correctamente");
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.log("Error saving bank account:", error);
      Alert.alert("Error", "No se pudo guardar la cuenta bancaria");
    }
  };

  const handleDelete = (account: BankAccount) => {
    Alert.alert(
      "Eliminar Cuenta",
      `¿Estás seguro de eliminar la cuenta de ${account.bankName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteBankAccount(account.id);
          },
        },
      ]
    );
  };

  const handleToggleActive = async (account: BankAccount) => {
    await updateBankAccount(account.id, { isActive: !account.isActive });
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Cuentas Bancarias</Text>
          <Text style={styles.subtitle}>
            Configura las cuentas para recibir transferencias
          </Text>
        </View>

        {bankAccounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin cuentas bancarias</Text>
            <Text style={styles.emptySubtitle}>
              Agrega una cuenta bancaria para recibir pagos por transferencia
            </Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {bankAccounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.bankIconContainer}>
                    <Building2 size={24} color={colors.primary} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.bankName}>{account.bankName}</Text>
                    <Text style={styles.accountNumber}>
                      {account.accountNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => handleToggleActive(account)}
                  >
                    {account.isActive ? (
                      <ToggleRight size={28} color={colors.success} />
                    ) : (
                      <ToggleLeft size={28} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.accountDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tipo:</Text>
                    <Text style={styles.detailValue}>
                      {account.accountType === "savings" ? "Ahorro" : "Cheque"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Titular:</Text>
                    <Text style={styles.detailValue}>{account.holderName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>RTN/DNI:</Text>
                    <Text style={styles.detailValue}>{account.rtn}</Text>
                  </View>
                </View>

                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleOpenModal(account)}
                  >
                    <Edit2 size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      Editar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(account)}
                  >
                    <Trash2 size={16} color={colors.accent} />
                    <Text style={[styles.actionText, { color: colors.accent }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>

                {!account.isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactiva</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleOpenModal()}
      >
        <Plus size={24} color={colors.secondary} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAccount ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del Banco *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bankName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bankName: text })
                  }
                  placeholder="Ej: BAC Honduras"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Número de Cuenta *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.accountNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, accountNumber: text })
                  }
                  placeholder="Ej: 123-456-789"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Cuenta *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      formData.accountType === "savings" && styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, accountType: "savings" })
                    }
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.accountType === "savings" &&
                          styles.typeOptionTextSelected,
                      ]}
                    >
                      Ahorro
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      formData.accountType === "checking" && styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, accountType: "checking" })
                    }
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.accountType === "checking" &&
                          styles.typeOptionTextSelected,
                      ]}
                    >
                      Cheque
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del Titular</Text>
                <TextInput
                  style={styles.input}
                  value={formData.holderName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, holderName: text })
                  }
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RTN / DNI *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.rtn}
                  onChangeText={(text) =>
                    setFormData({ ...formData, rtn: text })
                  }
                  placeholder="Ej: 0801-1990-12345"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={styles.activeToggle}
                onPress={() =>
                  setFormData({ ...formData, isActive: !formData.isActive })
                }
              >
                {formData.isActive ? (
                  <ToggleRight size={28} color={colors.success} />
                ) : (
                  <ToggleLeft size={28} color={colors.textMuted} />
                )}
                <Text style={styles.activeToggleText}>
                  {formData.isActive ? "Cuenta Activa" : "Cuenta Inactiva"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Check size={20} color={colors.secondary} />
                <Text style={styles.saveButtonText}>
                  {editingAccount ? "Guardar Cambios" : "Agregar Cuenta"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    },
    title: {
      fontSize: 24,
      fontWeight: "800" as const,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyState: {
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
    accountsList: {
      padding: 16,
      gap: 16,
    },
    accountCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      position: "relative",
    },
    accountHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    bankIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    accountInfo: {
      flex: 1,
    },
    bankName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    accountNumber: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    toggleButton: {
      padding: 4,
    },
    accountDetails: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    accountActions: {
      flexDirection: "row",
      marginTop: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    editButton: {
      backgroundColor: colors.primary + "15",
    },
    deleteButton: {
      backgroundColor: colors.accent + "15",
    },
    actionText: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    inactiveBadge: {
      position: "absolute",
      top: 16,
      right: 16,
      backgroundColor: colors.textMuted + "30",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    inactiveBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    bottomPadding: {
      height: 100,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
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
      maxHeight: "90%",
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
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeSelector: {
      flexDirection: "row",
      gap: 12,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
    },
    typeOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: colors.primary,
    },
    activeToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 16,
      marginBottom: 16,
    },
    activeToggleText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
      marginBottom: 32,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.secondary,
    },
  });
