import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import {
  Database,
  Download,
  Upload,
  Cloud,
  Smartphone,
  RefreshCw,
  Check,
  AlertCircle,
  Trash2,
  Clock,
  Link,
  Unlink,
  CloudUpload,
  Timer,
  User,
  Key,
  Save,
  Settings,
  Copy,
} from "lucide-react-native";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DRIVE_KEY = "fry_chicken_google_drive";
const AUTO_BACKUP_KEY = "fry_chicken_auto_backup";
const GOOGLE_CREDENTIALS_KEY = "fry_chicken_google_credentials";

interface GoogleCredentials {
  clientId: string;
  clientSecret?: string;
}

interface GoogleDriveConfig {
  accessToken: string;
  refreshToken?: string;
  email: string;
  expiresAt: number;
}

interface AutoBackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastBackup: string | null;
}

export default function BackupScreen() {
  const { colors } = useTheme();
  const { exportBackup, importBackup, resetAllSalesAndOrders } = useData();
  const { user: currentUser } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [googleConfig, setGoogleConfig] = useState<GoogleDriveConfig | null>(null);
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>({
    enabled: false,
    intervalMinutes: 60,
    lastBackup: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState<GoogleCredentials>({ clientId: "", clientSecret: "" });
  const [savedCredentials, setSavedCredentials] = useState<GoogleCredentials | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const autoBackupInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  };

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "frychicken",
  });

  useEffect(() => {
    loadGoogleConfig();
    loadAutoBackupConfig();
    loadSavedCredentials();
    return () => {
      if (autoBackupInterval.current) {
        clearInterval(autoBackupInterval.current);
      }
    };
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const stored = await AsyncStorage.getItem(GOOGLE_CREDENTIALS_KEY);
      if (stored) {
        const creds = JSON.parse(stored) as GoogleCredentials;
        setSavedCredentials(creds);
        setCredentials(creds);
        console.log("Google credentials loaded");
      }
    } catch (error) {
      console.log("Error loading credentials:", error);
    }
  };

  const saveCredentials = async () => {
    if (!credentials.clientId.trim()) {
      Alert.alert("Error", "Por favor ingresa el Client ID");
      return;
    }
    try {
      await AsyncStorage.setItem(GOOGLE_CREDENTIALS_KEY, JSON.stringify(credentials));
      setSavedCredentials(credentials);
      setShowCredentialsForm(false);
      Alert.alert("Éxito", "Credenciales guardadas correctamente. Ahora puedes conectar tu cuenta de Google Drive.");
      console.log("Google credentials saved");
    } catch (error) {
      console.log("Error saving credentials:", error);
      Alert.alert("Error", "No se pudieron guardar las credenciales");
    }
  };

  const clearCredentials = async () => {
    Alert.alert(
      "Eliminar Credenciales",
      "¿Estás seguro de eliminar las credenciales guardadas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(GOOGLE_CREDENTIALS_KEY);
            setSavedCredentials(null);
            setCredentials({ clientId: "", clientSecret: "" });
            if (googleConfig) {
              await disconnectGoogleDrive();
            }
            Alert.alert("Eliminado", "Las credenciales han sido eliminadas.");
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(text);
    }
    Alert.alert("Copiado", "Texto copiado al portapapeles");
  };

  const loadGoogleConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(GOOGLE_DRIVE_KEY);
      if (stored) {
        const config = JSON.parse(stored) as GoogleDriveConfig;
        if (config.expiresAt > Date.now()) {
          setGoogleConfig(config);
          console.log("Google Drive config loaded:", config.email);
        } else {
          await AsyncStorage.removeItem(GOOGLE_DRIVE_KEY);
          console.log("Google Drive token expired");
        }
      }
    } catch (error) {
      console.log("Error loading Google config:", error);
    }
  };

  const loadAutoBackupConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
      if (stored) {
        setAutoBackupConfig(JSON.parse(stored));
        console.log("Auto backup config loaded");
      }
    } catch (error) {
      console.log("Error loading auto backup config:", error);
    }
  };

  const saveAutoBackupConfig = async (config: AutoBackupConfig) => {
    try {
      await AsyncStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(config));
      setAutoBackupConfig(config);
      console.log("Auto backup config saved");
    } catch (error) {
      console.log("Error saving auto backup config:", error);
    }
  };

  const uploadToGoogleDrive = useCallback(async (data: string, accessToken: string) => {
    const fileName = `fry_chicken_backup_${new Date().toISOString().split("T")[0]}_${Date.now()}.json`;
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      mimeType: "application/json",
      parents: ["root"],
    };

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      data +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }, []);

  const performAutoBackup = useCallback(async () => {
    if (!googleConfig) return;
    console.log("Performing auto backup to Google Drive...");
    try {
      const backupData = await exportBackup();
      await uploadToGoogleDrive(backupData, googleConfig.accessToken);
      const now = new Date().toLocaleString();
      await AsyncStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({ enabled: true, intervalMinutes: 60, lastBackup: now }));
      setAutoBackupConfig(prev => ({ ...prev, lastBackup: now }));
      console.log("Auto backup completed:", now);
    } catch (error) {
      console.log("Auto backup error:", error);
    }
  }, [googleConfig, exportBackup, uploadToGoogleDrive]);

  useEffect(() => {
    if (autoBackupConfig.enabled && googleConfig) {
      if (autoBackupInterval.current) {
        clearInterval(autoBackupInterval.current);
      }
      const intervalMs = autoBackupConfig.intervalMinutes * 60 * 1000;
      console.log(`Starting auto backup every ${autoBackupConfig.intervalMinutes} minutes`);
      autoBackupInterval.current = setInterval(() => {
        performAutoBackup();
      }, intervalMs);
    } else {
      if (autoBackupInterval.current) {
        clearInterval(autoBackupInterval.current);
        autoBackupInterval.current = null;
        console.log("Auto backup stopped");
      }
    }
  }, [autoBackupConfig.enabled, autoBackupConfig.intervalMinutes, googleConfig, performAutoBackup]);

  const connectGoogleDrive = async () => {
    if (!savedCredentials?.clientId) {
      Alert.alert(
        "Credenciales Requeridas",
        "Primero debes configurar tu Client ID de Google en la sección de configuración."
      );
      setShowCredentialsForm(true);
      return;
    }
    setIsConnecting(true);
    try {
      const clientId = savedCredentials.clientId;

      const authUrl = `${discovery.authorizationEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive.file email profile")}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const params = new URLSearchParams(result.url.split("#")[1]);
        const accessToken = params.get("access_token");
        const expiresIn = params.get("expires_in");

        if (accessToken) {
          const userInfo = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(r => r.json());

          const config: GoogleDriveConfig = {
            accessToken,
            email: userInfo.email || "Usuario conectado",
            expiresAt: Date.now() + (parseInt(expiresIn || "3600") * 1000),
          };

          await AsyncStorage.setItem(GOOGLE_DRIVE_KEY, JSON.stringify(config));
          setGoogleConfig(config);
          Alert.alert("Éxito", `Cuenta conectada: ${config.email}`);
          console.log("Google Drive connected:", config.email);
        }
      } else {
        simulateGoogleConnection();
      }
    } catch (error) {
      console.log("OAuth error, using simulation:", error);
      simulateGoogleConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  const simulateGoogleConnection = async () => {
    Alert.alert(
      "Conectar Google Drive",
      "Para usar Google Drive en producción, necesitas configurar las credenciales de OAuth en Google Cloud Console.\n\n¿Deseas simular la conexión para pruebas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Simular",
          onPress: async () => {
            const mockConfig: GoogleDriveConfig = {
              accessToken: "mock_token_" + Date.now(),
              email: "usuario@gmail.com",
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            };
            await AsyncStorage.setItem(GOOGLE_DRIVE_KEY, JSON.stringify(mockConfig));
            setGoogleConfig(mockConfig);
            Alert.alert("Éxito", "Conexión simulada establecida. El backup automático está listo.");
          },
        },
      ]
    );
  };

  const disconnectGoogleDrive = async () => {
    Alert.alert(
      "Desconectar Google Drive",
      "¿Estás seguro de desconectar tu cuenta de Google Drive? Se desactivará el backup automático.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(GOOGLE_DRIVE_KEY);
            setGoogleConfig(null);
            const newConfig = { ...autoBackupConfig, enabled: false };
            await saveAutoBackupConfig(newConfig);
            if (autoBackupInterval.current) {
              clearInterval(autoBackupInterval.current);
              autoBackupInterval.current = null;
            }
            Alert.alert("Desconectado", "Tu cuenta de Google Drive ha sido desconectada.");
          },
        },
      ]
    );
  };

  const handleGoogleDriveBackup = async () => {
    if (!googleConfig) {
      Alert.alert("Error", "Primero conecta tu cuenta de Google Drive");
      return;
    }
    setIsUploadingToDrive(true);
    try {
      const backupData = await exportBackup();
      await uploadToGoogleDrive(backupData, googleConfig.accessToken);
      const now = new Date().toLocaleString();
      setLastBackup(now);
      Alert.alert("Éxito", "Backup subido a Google Drive correctamente");
      console.log("Manual backup to Google Drive completed");
    } catch (error) {
      console.log("Google Drive backup error:", error);
      Alert.alert("Error", "No se pudo subir el backup a Google Drive. Verifica tu conexión.");
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const toggleAutoBackup = async (enabled: boolean) => {
    if (enabled && !googleConfig) {
      Alert.alert("Conecta Google Drive", "Para activar el backup automático, primero conecta tu cuenta de Google Drive.");
      return;
    }
    const newConfig = { ...autoBackupConfig, enabled };
    await saveAutoBackupConfig(newConfig);
    if (enabled) {
      Alert.alert("Backup Automático Activado", `Se realizará un backup cada ${autoBackupConfig.intervalMinutes} minutos.`);
    }
  };

  const handleLocalBackup = async () => {
    setIsExporting(true);
    try {
      const backupData = await exportBackup();
      const fileName = `fry_chicken_backup_${new Date().toISOString().split("T")[0]}.json`;
      
      if (Platform.OS === "web") {
        const blob = new Blob([backupData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Éxito", "Backup descargado correctamente");
      } else {
        const file = new File(Paths.cache, fileName);
        file.create({ overwrite: true });
        file.write(backupData);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        }
        Alert.alert("Éxito", "Backup guardado correctamente");
      }
      
      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      console.log("Error creating backup:", error);
      Alert.alert("Error", "No se pudo crear el backup");
    } finally {
      setIsExporting(false);
    }
  };

  

  const handleImportBackup = async () => {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsImporting(false);
        return;
      }

      const pickedFile = result.assets[0];
      let content: string;

      if (Platform.OS === "web") {
        const response = await fetch(pickedFile.uri);
        content = await response.text();
      } else {
        const importFile = new File(pickedFile.uri);
        content = importFile.textSync();
      }

      Alert.alert(
        "Restaurar Backup",
        "¿Estás seguro de restaurar este backup? Se sobrescribirán todos los datos actuales.",
        [
          { text: "Cancelar", style: "cancel", onPress: () => setIsImporting(false) },
          {
            text: "Restaurar",
            style: "destructive",
            onPress: async () => {
              const success = await importBackup(content);
              if (success) {
                Alert.alert("Éxito", "Backup restaurado correctamente. Reinicia la app para ver los cambios.");
              } else {
                Alert.alert("Error", "El archivo de backup no es válido");
              }
              setIsImporting(false);
            },
          },
        ]
      );
    } catch (error) {
      console.log("Error importing backup:", error);
      Alert.alert("Error", "No se pudo importar el backup");
      setIsImporting(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Backup y Restauración" }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Database size={24} color={colors.primary} />
          <Text style={styles.title}>Backup de Datos</Text>
        </View>
        <Text style={styles.subtitle}>
          Guarda y restaura la información de tu negocio
        </Text>

        <View style={styles.warningCard}>
          <AlertCircle size={22} color={colors.accent} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Importante</Text>
            <Text style={styles.warningText}>
              Realiza backups periódicos para no perder información importante como pedidos, productos, clientes y configuraciones.
            </Text>
          </View>
        </View>

        {lastBackup && (
          <View style={styles.lastBackupCard}>
            <Clock size={18} color={colors.success} />
            <Text style={styles.lastBackupText}>
              Último backup: {lastBackup}
            </Text>
          </View>
        )}

        <View style={styles.googleDriveSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Google Drive</Text>
            <TouchableOpacity
              style={styles.configButton}
              onPress={() => setShowCredentialsForm(!showCredentialsForm)}
            >
              <Settings size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {showCredentialsForm && (
            <View style={styles.credentialsCard}>
              <View style={styles.credentialsHeader}>
                <Key size={20} color={colors.primary} />
                <Text style={styles.credentialsTitle}>Configurar Credenciales OAuth</Text>
              </View>
              
              <Text style={styles.credentialsHelp}>
                Obtén tu Client ID desde Google Cloud Console → APIs & Services → Credentials
              </Text>
              
              <View style={styles.redirectUriContainer}>
                <Text style={styles.redirectUriLabel}>Redirect URI (copia esto):</Text>
                <TouchableOpacity 
                  style={styles.redirectUriBox}
                  onPress={() => copyToClipboard(redirectUri)}
                >
                  <Text style={styles.redirectUriText} numberOfLines={1}>{redirectUri}</Text>
                  <Copy size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Client ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="123456789.apps.googleusercontent.com"
                placeholderTextColor={colors.textMuted}
                value={credentials.clientId}
                onChangeText={(text) => setCredentials({ ...credentials, clientId: text })}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <Text style={styles.inputLabel}>Client Secret (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="GOCSPX-..."
                placeholderTextColor={colors.textMuted}
                value={credentials.clientSecret}
                onChangeText={(text) => setCredentials({ ...credentials, clientSecret: text })}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              
              <View style={styles.credentialsButtons}>
                <TouchableOpacity
                  style={styles.saveCredentialsButton}
                  onPress={saveCredentials}
                >
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveCredentialsText}>Guardar Credenciales</Text>
                </TouchableOpacity>
                
                {savedCredentials && (
                  <TouchableOpacity
                    style={styles.clearCredentialsButton}
                    onPress={clearCredentials}
                  >
                    <Text style={styles.clearCredentialsText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {savedCredentials && (
                <View style={styles.savedCredentialsInfo}>
                  <Check size={16} color={colors.success} />
                  <Text style={styles.savedCredentialsText}>
                    Client ID guardado: ...{savedCredentials.clientId.slice(-30)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {googleConfig ? (
            <View style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <View style={styles.connectedIcon}>
                  <User size={24} color="#fff" />
                </View>
                <View style={styles.connectedInfo}>
                  <Text style={styles.connectedEmail}>{googleConfig.email}</Text>
                  <Text style={styles.connectedStatus}>Cuenta conectada</Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={disconnectGoogleDrive}
                >
                  <Unlink size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.autoBackupRow}>
                <View style={styles.autoBackupInfo}>
                  <Timer size={20} color={colors.primary} />
                  <View style={styles.autoBackupText}>
                    <Text style={styles.autoBackupTitle}>Backup Automático</Text>
                    <Text style={styles.autoBackupDesc}>Cada 60 minutos</Text>
                  </View>
                </View>
                <Switch
                  value={autoBackupConfig.enabled}
                  onValueChange={toggleAutoBackup}
                  trackColor={{ false: colors.border, true: colors.success + "80" }}
                  thumbColor={autoBackupConfig.enabled ? colors.success : colors.textMuted}
                />
              </View>
              
              {autoBackupConfig.lastBackup && (
                <View style={styles.lastAutoBackup}>
                  <Clock size={14} color={colors.success} />
                  <Text style={styles.lastAutoBackupText}>
                    Último backup automático: {autoBackupConfig.lastBackup}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectCard}
              onPress={connectGoogleDrive}
              disabled={isConnecting}
            >
              <View style={styles.connectIconContainer}>
                <Cloud size={32} color={colors.primary} />
              </View>
              <Text style={styles.connectTitle}>Conectar Google Drive</Text>
              <Text style={styles.connectDesc}>
                Vincula tu cuenta para activar backups automáticos cada 60 minutos
              </Text>
              {isConnecting ? (
                <View style={styles.connectButton}>
                  <RefreshCw size={18} color="#fff" />
                  <Text style={styles.connectButtonText}>Conectando...</Text>
                </View>
              ) : (
                <View style={styles.connectButton}>
                  <Link size={18} color="#fff" />
                  <Text style={styles.connectButtonText}>Vincular Cuenta</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Crear Backup</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleLocalBackup}
            disabled={isExporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + "20" }]}>
              <Smartphone size={28} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Guardar en Dispositivo</Text>
              <Text style={styles.optionDescription}>
                Descarga un archivo JSON con todos tus datos
              </Text>
            </View>
            {isExporting ? (
              <RefreshCw size={22} color={colors.textMuted} />
            ) : (
              <Download size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleGoogleDriveBackup}
            disabled={isUploadingToDrive || !googleConfig}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.success + "20" }]}>
              <CloudUpload size={28} color={colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Subir a Google Drive</Text>
              <Text style={styles.optionDescription}>
                {googleConfig ? "Guarda un backup ahora en la nube" : "Conecta Google Drive primero"}
              </Text>
            </View>
            {isUploadingToDrive ? (
              <RefreshCw size={22} color={colors.textMuted} />
            ) : (
              <Cloud size={22} color={googleConfig ? colors.success : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Restaurar Backup</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleImportBackup}
            disabled={isImporting}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#3B82F6" + "20" }]}>
              <Upload size={28} color="#3B82F6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Importar Backup</Text>
              <Text style={styles.optionDescription}>
                Selecciona un archivo JSON de backup
              </Text>
            </View>
            {isImporting ? (
              <RefreshCw size={22} color={colors.textMuted} />
            ) : (
              <Upload size={22} color="#3B82F6" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>¿Qué incluye el backup?</Text>
          <View style={styles.infoList}>
            {[
              "Productos y categorías",
              "Pedidos e historial",
              "Sucursales y zonas de envío",
              "Cupones y promociones",
              "Repartidores registrados",
              "Cuentas bancarias",
              "Configuración de horarios",
              "Ajustes del tema",
            ].map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <Check size={16} color={colors.success} />
                <Text style={styles.infoItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Zona de Peligro</Text>

        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <AlertCircle size={22} color={colors.accent} />
            <Text style={styles.dangerTitle}>Reiniciar Todas las Ventas</Text>
          </View>
          <Text style={styles.dangerDescription}>
            Esto eliminará permanentemente todos los pedidos, ventas, notificaciones y estadísticas. Esta acción no se puede deshacer.
          </Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setShowPasswordPrompt(true)}
            disabled={isResetting}
          >
            {isResetting ? (
              <RefreshCw size={20} color="#fff" />
            ) : (
              <Trash2 size={20} color="#fff" />
            )}
            <Text style={styles.dangerButtonText}>
              {isResetting ? "Reiniciando..." : "Reiniciar Todo"}
            </Text>
          </TouchableOpacity>
        </View>

        {showPasswordPrompt && (
          <View style={styles.modalOverlay}>
            <View style={styles.passwordModal}>
              <Text style={styles.modalTitle}>Confirmar Reinicio</Text>
              <Text style={styles.modalDescription}>
                Esta acción eliminará todas las ventas y pedidos. Para continuar, ingresa tu contraseña de administrador (la misma con la que iniciaste sesión):
              </Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowPasswordPrompt(false);
                    setPassword("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={async () => {
                    if (!password.trim()) {
                      Alert.alert("Error", "Por favor ingresa tu contraseña");
                      return;
                    }
                    
                    if (!currentUser || !currentUser.email) {
                      Alert.alert("Error", "No se pudo verificar tu sesión");
                      return;
                    }

                    try {
                      await signInWithEmailAndPassword(auth, currentUser.email, password);
                      console.log('✅ Password verified with Firebase Auth');
                    } catch (error: any) {
                      console.error('❌ Password verification failed:', error);
                      Alert.alert("Error", "Contraseña incorrecta");
                      return;
                    }
                    
                    setShowPasswordPrompt(false);
                    setPassword("");
                    setIsResetting(true);
                    try {
                      const success = await resetAllSalesAndOrders();
                      if (success) {
                        Alert.alert(
                          "Reinicio Completo",
                          "Todas las ventas y pedidos han sido eliminados exitosamente."
                        );
                      } else {
                        Alert.alert("Error", "No se pudo completar el reinicio");
                      }
                    } catch (error) {
                      console.error('❌ Error resetting data:', error);
                      Alert.alert("Error", "Ocurrió un error al reiniciar los datos");
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                >
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    warningCard: {
      flexDirection: "row",
      backgroundColor: colors.accent + "15",
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    warningContent: {
      flex: 1,
    },
    warningTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.accent,
      marginBottom: 4,
    },
    warningText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    lastBackupCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success + "15",
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 14,
      borderRadius: 12,
      gap: 10,
    },
    lastBackupText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.success,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: 16,
      marginBottom: 12,
    },
    configButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    credentialsCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    credentialsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    credentialsTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    credentialsHelp: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 16,
    },
    redirectUriContainer: {
      marginBottom: 16,
    },
    redirectUriLabel: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    redirectUriBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      gap: 8,
    },
    redirectUriText: {
      flex: 1,
      fontSize: 12,
      color: colors.primary,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    credentialsButtons: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    saveCredentialsButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.success,
      paddingVertical: 12,
      borderRadius: 10,
    },
    saveCredentialsText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#fff",
    },
    clearCredentialsButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accent + "20",
    },
    clearCredentialsText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    savedCredentialsInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      padding: 10,
      backgroundColor: colors.success + "15",
      borderRadius: 8,
    },
    savedCredentialsText: {
      flex: 1,
      fontSize: 12,
      color: colors.success,
    },
    optionsContainer: {
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 24,
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      gap: 14,
    },
    optionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    optionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    googleDriveSection: {
      marginBottom: 24,
    },
    connectedCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 16,
      gap: 16,
    },
    connectedHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    connectedIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#4285F4",
      alignItems: "center",
      justifyContent: "center",
    },
    connectedInfo: {
      flex: 1,
    },
    connectedEmail: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    connectedStatus: {
      fontSize: 12,
      color: colors.success,
      marginTop: 2,
    },
    disconnectButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    autoBackupRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.background,
      padding: 14,
      borderRadius: 12,
    },
    autoBackupInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    autoBackupText: {
      gap: 2,
    },
    autoBackupTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    autoBackupDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    lastAutoBackup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 4,
    },
    lastAutoBackupText: {
      fontSize: 12,
      color: colors.success,
    },
    connectCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    connectIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    connectTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    connectDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 20,
    },
    connectButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    connectButtonText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: "#000",
    },
    infoSection: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginBottom: 14,
    },
    infoList: {
      gap: 10,
    },
    infoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    infoItemText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    dangerZone: {
      backgroundColor: colors.accent + "10",
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.accent + "30",
    },
    dangerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    dangerTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    dangerDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 16,
    },
    dangerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 10,
    },
    dangerButtonText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#fff",
    },
    modalOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    passwordModal: {
      backgroundColor: colors.surface,
      marginHorizontal: 24,
      borderRadius: 20,
      padding: 24,
      width: "90%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: "center",
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
      textAlign: "center",
    },
    passwordInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 10,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.textMuted + "20",
      alignItems: "center",
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.textSecondary,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    modalConfirmText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#fff",
    },
    bottomPadding: {
      height: 40,
    },
  });
