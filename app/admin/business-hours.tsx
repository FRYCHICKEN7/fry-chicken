import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Clock, Check, AlertCircle } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { BusinessHours } from "@/types";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// Función existente para convertir a 12 horas
const convertTo12Hour = (time24: string): { hour: string; minute: string; period: "AM" | "PM" } => {
  const [hours, minutes] = time24.split(":");
  let hour = parseInt(hours, 10);
  const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour = hour - 12;
  }
  
  return {
    hour: hour.toString(),
    minute: minutes || "00",
    period,
  };
};

const convertTo24Hour = (hour: string, minute: string, period: "AM" | "PM"): string => {
  let h = parseInt(hour, 10);
  
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h = h + 12;
  }
  
  return `${h.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

export default function BusinessHoursScreen() {
  const { colors } = useTheme();
  const { businessHours, updateAllBusinessHours, isStoreOpen, getNextOpenTime } = useData();
  const [localHours, setLocalHours] = useState<BusinessHours[]>(businessHours);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  useEffect(() => {
    setLocalHours(businessHours);
  }, [businessHours]);

  // --- NUEVA FUNCIÓN DE FORMATEO PARA LA ETIQUETA ---
  const formatNextOpen = (nextOpenStr: string) => {
    if (!nextOpenStr) return "";
    
    // Si la cadena contiene una hora (ej: "Lunes a las 10:00")
    if (nextOpenStr.includes("las ")) {
      const parts = nextOpenStr.split("las ");
      const timePart = parts[1]; // "10:00"
      const { hour, minute, period } = convertTo12Hour(timePart);
      return `${parts[0]}las ${hour}:${minute} ${period}`;
    }
    return nextOpenStr;
  };

  const handleToggleDay = (dayOfWeek: number) => {
    const updated = localHours.map((h) =>
      h.dayOfWeek === dayOfWeek ? { ...h, isOpen: !h.isOpen } : h
    );
    setLocalHours(updated);
    setHasChanges(true);
  };

  const handleFocus = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    component: "hour" | "minute"
  ) => {
    const currentHours = localHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!currentHours) return;
    const currentTime = convertTo12Hour(currentHours[field]);
    const fieldKey = `${dayOfWeek}-${field}-${component}`;
    setEditingField(fieldKey);
    setEditingValue(component === "hour" ? currentTime.hour : currentTime.minute);
  };

  const handleBlur = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    component: "hour" | "minute"
  ) => {
    const currentHours = localHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!currentHours) return;

    const currentTime = convertTo12Hour(currentHours[field]);
    let newHour = currentTime.hour;
    let newMinute = currentTime.minute;
    const newPeriod = currentTime.period;

    if (component === "hour") {
      let h = parseInt(editingValue, 10) || 12;
      if (h < 1) h = 1;
      if (h > 12) h = 12;
      newHour = h.toString();
    } else if (component === "minute") {
      let m = parseInt(editingValue, 10) || 0;
      if (m < 0) m = 0;
      if (m > 59) m = 59;
      newMinute = m.toString().padStart(2, "0");
    }

    const time24 = convertTo24Hour(newHour, newMinute, newPeriod);

    const updated = localHours.map((h) =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: time24 } : h
    );
    setLocalHours(updated);
    setHasChanges(true);
    setEditingField(null);
    setEditingValue("");
  };

  const handleEditingChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, "");
    setEditingValue(numValue.slice(0, 2));
  };

  const handlePeriodChange = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    period: "AM" | "PM"
  ) => {
    const currentHours = localHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!currentHours) return;

    const currentTime = convertTo12Hour(currentHours[field]);
    const time24 = convertTo24Hour(currentTime.hour, currentTime.minute, period);

    const updated = localHours.map((h) =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: time24 } : h
    );
    setLocalHours(updated);
    setHasChanges(true);
  };

  const getDisplayValue = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    component: "hour" | "minute"
  ): string => {
    const fieldKey = `${dayOfWeek}-${field}-${component}`;
    if (editingField === fieldKey) {
      return editingValue;
    }
    const currentHours = localHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!currentHours) return component === "hour" ? "12" : "00";
    const currentTime = convertTo12Hour(currentHours[field]);
    if (component === "minute") {
      return currentTime.minute.padStart(2, "0");
    }
    return currentTime[component];
  };

  const handleSave = async () => {
    try {
      await updateAllBusinessHours(localHours);
      setHasChanges(false);
      Alert.alert("Éxito", "Horarios guardados correctamente");
    } catch {
      Alert.alert("Error", "No se pudieron guardar los horarios");
    }
  };

  const applyToAll = (sourceDay: number) => {
    const source = localHours.find((h) => h.dayOfWeek === sourceDay);
    if (!source) return;

    Alert.alert(
      "Aplicar a todos los días",
      `¿Deseas aplicar el horario de ${DAY_NAMES[sourceDay]} a todos los días?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aplicar",
          onPress: () => {
            const updated = localHours.map((h) => ({
              ...h,
              openTime: source.openTime,
              closeTime: source.closeTime,
              isOpen: source.isOpen,
            }));
            setLocalHours(updated);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const storeOpen = isStoreOpen();
  const nextOpen = getNextOpenTime();

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Horarios de Atención" }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Clock size={24} color={colors.primary} />
          <Text style={styles.title}>Horarios de Atención</Text>
        </View>
        <Text style={styles.subtitle}>
          Configura los horarios de apertura y cierre de tu negocio
        </Text>

        <View style={[styles.statusCard, { backgroundColor: storeOpen ? colors.success + "20" : colors.accent + "20" }]}>
          <View style={[styles.statusIndicator, { backgroundColor: storeOpen ? colors.success : colors.accent }]} />
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: storeOpen ? colors.success : colors.accent }]}>
              {storeOpen ? "Abierto Ahora" : "Cerrado"}
            </Text>
            {!storeOpen && (
              <Text style={styles.statusSubtitle}>
                {/* MODIFICADO AQUÍ PARA MOSTRAR AM/PM */}
                Próxima apertura: {formatNextOpen(nextOpen)}
              </Text>
            )}
          </View>
        </View>

        {/* El resto del código permanece igual... */}
        <View style={styles.infoCard}>
          <AlertCircle size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Cuando el local esté cerrado, los clientes verán una notificación indicando el próximo horario de atención.
          </Text>
        </View>

        <View style={styles.hoursContainer}>
          {localHours.map((hours) => (
            <View key={hours.dayOfWeek} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{DAY_NAMES[hours.dayOfWeek]}</Text>
                <View style={styles.dayActions}>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => applyToAll(hours.dayOfWeek)}
                  >
                    <Text style={styles.applyButtonText}>Aplicar a todos</Text>
                  </TouchableOpacity>
                  <Switch
                    value={hours.isOpen}
                    onValueChange={() => handleToggleDay(hours.dayOfWeek)}
                    trackColor={{ false: colors.surfaceLight, true: colors.success + "50" }}
                    thumbColor={hours.isOpen ? colors.success : colors.textMuted}
                  />
                </View>
              </View>
              
              {hours.isOpen ? (
                <View style={styles.timeRow}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Apertura</Text>
                    <View style={styles.timeFieldRow}>
                      <TextInput
                        style={styles.timeFieldSmall}
                        value={getDisplayValue(hours.dayOfWeek, "openTime", "hour")}
                        onChangeText={handleEditingChange}
                        onFocus={() => handleFocus(hours.dayOfWeek, "openTime", "hour")}
                        onBlur={() => handleBlur(hours.dayOfWeek, "openTime", "hour")}
                        placeholder="10"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <Text style={styles.timeColon}>:</Text>
                      <TextInput
                        style={styles.timeFieldSmall}
                        value={getDisplayValue(hours.dayOfWeek, "openTime", "minute")}
                        onChangeText={handleEditingChange}
                        onFocus={() => handleFocus(hours.dayOfWeek, "openTime", "minute")}
                        onBlur={() => handleBlur(hours.dayOfWeek, "openTime", "minute")}
                        placeholder="00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <View style={styles.periodContainer}>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            convertTo12Hour(hours.openTime).period === "AM" && styles.periodButtonActive,
                          ]}
                          onPress={() => handlePeriodChange(hours.dayOfWeek, "openTime", "AM")}
                        >
                          <Text style={[
                            styles.periodText,
                            convertTo12Hour(hours.openTime).period === "AM" && styles.periodTextActive,
                          ]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            convertTo12Hour(hours.openTime).period === "PM" && styles.periodButtonActive,
                          ]}
                          onPress={() => handlePeriodChange(hours.dayOfWeek, "openTime", "PM")}
                        >
                          <Text style={[
                            styles.periodText,
                            convertTo12Hour(hours.openTime).period === "PM" && styles.periodTextActive,
                          ]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.timeSeparator}>—</Text>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Cierre</Text>
                    <View style={styles.timeFieldRow}>
                      <TextInput
                        style={styles.timeFieldSmall}
                        value={getDisplayValue(hours.dayOfWeek, "closeTime", "hour")}
                        onChangeText={handleEditingChange}
                        onFocus={() => handleFocus(hours.dayOfWeek, "closeTime", "hour")}
                        onBlur={() => handleBlur(hours.dayOfWeek, "closeTime", "hour")}
                        placeholder="9"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <Text style={styles.timeColon}>:</Text>
                      <TextInput
                        style={styles.timeFieldSmall}
                        value={getDisplayValue(hours.dayOfWeek, "closeTime", "minute")}
                        onChangeText={handleEditingChange}
                        onFocus={() => handleFocus(hours.dayOfWeek, "closeTime", "minute")}
                        onBlur={() => handleBlur(hours.dayOfWeek, "closeTime", "minute")}
                        placeholder="00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <View style={styles.periodContainer}>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            convertTo12Hour(hours.closeTime).period === "AM" && styles.periodButtonActive,
                          ]}
                          onPress={() => handlePeriodChange(hours.dayOfWeek, "closeTime", "AM")}
                        >
                          <Text style={[
                            styles.periodText,
                            convertTo12Hour(hours.closeTime).period === "AM" && styles.periodTextActive,
                          ]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.periodButton,
                            convertTo12Hour(hours.closeTime).period === "PM" && styles.periodButtonActive,
                          ]}
                          onPress={() => handlePeriodChange(hours.dayOfWeek, "closeTime", "PM")}
                        >
                          <Text style={[
                            styles.periodText,
                            convertTo12Hour(hours.closeTime).period === "PM" && styles.periodTextActive,
                          ]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedText}>Cerrado este día</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Check size={20} color={colors.secondary} />
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 20,
    },
    statusCard: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    statusContent: {
      flex: 1,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
    },
    statusSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.primary + "15",
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 14,
      borderRadius: 12,
      gap: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    hoursContainer: {
      paddingHorizontal: 16,
      gap: 12,
    },
    dayCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    dayName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    dayActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    applyButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.surfaceLight,
    },
    applyButtonText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    timeInput: {
      flex: 1,
    },
    timeLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    timeFieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    timeFieldSmall: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 8,
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      textAlign: "center",
      width: 40,
    },
    timeColon: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    periodContainer: {
      flexDirection: "row",
      marginLeft: 4,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.surfaceLight,
    },
    periodButton: {
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    periodButtonActive: {
      backgroundColor: colors.primary,
    },
    periodText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    periodTextActive: {
      color: colors.secondary,
    },
    timeSeparator: {
      fontSize: 18,
      color: colors.textMuted,
      marginTop: 20,
    },
    closedBadge: {
      backgroundColor: colors.accent + "15",
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
    },
    closedText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      marginTop: 24,
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.secondary,
    },
    bottomPadding: {
      height: 40,
    },
  });
