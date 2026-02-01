import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { Shield } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#FCBA1D' : colors.primary }]}>{title}</Text>
      <Text style={[styles.sectionContent, { color: colors.textPrimary }]}>{content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Shield size={32} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Política de Privacidad</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Chicken Network Company S de RL de C.V{'\n'}Fry Chicken Honduras
          </Text>
        </View>

        <View style={styles.content}>
          <Section
            title="1. ANTECEDENTES PRELIMINARES"
            content={`1.1 Al utilizar el sitio web www.frychickenhn.com o la aplicación móvil Fry Chicken (en adelante, el "Portal"), usted nos confía su información. Esta política de privacidad (la "Política") describe cómo Chicken Network Company S de RL de C.V y su nombre comercial Fry Chicken tratan sus datos personales.

1.2 Por favor, tómese el tiempo suficiente para leer esta Política detenidamente.

1.3 Si nuestro Portal contiene enlaces que conducen a sitios web de terceros, esta Política no se aplica a dichos sitios externos.

1.4 Esta Política aplica a todos los usuarios de nuestro Portal.

1.5 Con su consentimiento a esta Política, usted autoriza a Chicken Network Company S de RL de C.V a recopilar, procesar, usar y tratar sus datos personales de conformidad con la normativa vigente en Honduras, así como cualquier norma que la modifique o reemplace (la "Normativa").

1.6 Los usuarios garantizan la veracidad, exactitud, vigencia y autenticidad de la información personal que proporcionen, y se comprometen a mantenerla actualizada.`}
          />

          <Section
            title="2. PRINCIPIOS QUE ORIENTAN LA POLÍTICA"
            content={`2.1 Legalidad: El tratamiento de datos personales se realizará conforme a la normativa vigente en Honduras y a los derechos fundamentales conexos.

2.2 Libertad: Los datos personales solo se recopilarán con el consentimiento previo, escrito, expreso, informado e inequívoco del usuario.

2.3 Finalidad: Los datos recopilados se usarán únicamente para fines legítimos y específicos, que serán informados al usuario.

2.4 Veracidad o Calidad: La información debe ser veraz, completa, exacta y actualizada. Fry Chicken no será responsable de información incompleta o errónea proporcionada por el usuario.

2.5 Transparencia: El usuario tiene derecho a conocer, en cualquier momento, la existencia de sus datos personales y cómo se usan.

2.6 Acceso y Circulación Restringida: Los datos no estarán disponibles públicamente, salvo para personal autorizado, Sociedades Relacionadas o terceros debidamente autorizados.

2.7 Seguridad: Fry Chicken adopta medidas tecnológicas y administrativas para proteger los datos contra acceso o uso no autorizado.

2.8 Confidencialidad: Todas las personas que administran, manejan o tienen acceso a los datos personales se comprometen a mantenerlos confidenciales.`}
          />

          <Section
            title="3. INFORMACIÓN QUE RECOPILAMOS"
            content={`3.1 Los datos personales son información con la que podemos identificar a los usuarios, como nombre, dirección, correo electrónico, número de teléfono, fecha de nacimiento, datos de localización, y cualquier información que usted nos proporcione.

3.2 Cuando un usuario visita el Portal sin registrarse ni realizar un pedido, se recopilan los siguientes datos:

• Información del dispositivo: Identificación del dispositivo, sistema operativo y otros identificadores.
• Información de conexión: Fecha, hora, duración de uso y origen de la visita.

3.3 Si el usuario inicia sesión o realiza pedidos, también se recopilan:

• Credenciales de acceso: Correo electrónico y contraseña utilizadas para ingresar al Portal.
• Información de comunicación: Comentarios, puntuaciones, devoluciones y comunicaciones con Fry Chicken.
• Otros datos: Información voluntaria proporcionada por el usuario mientras usa el Portal o redes sociales públicas.

3.4 Historial de pedidos: Tipo de pedido, detalle, entrega, fecha, hora, precio y forma de pago.

3.5 Toda información proporcionada por terceros es responsabilidad del usuario, quien debe asegurarse de contar con el consentimiento de dichos terceros.`}
          />

          <Section
            title="4. USO DE LA INFORMACIÓN"
            content={`4.1 Fry Chicken utiliza la información de los usuarios únicamente para fines legítimos, como:

• Administrar el Portal y actualizar cuentas de usuario.
• Personalizar la experiencia de navegación y los servicios ofrecidos.
• Procesar y controlar los pedidos.
• Atender consultas y reclamos del Servicio de Atención al Cliente.
• Mejorar la seguridad, prevenir fraudes y desarrollar nuevas funciones.
• Enviar promociones, publicidad o información sobre concursos, siempre que el usuario no se haya opuesto al tratamiento para marketing.`}
          />

          <Section
            title="5. CÓMO COMPARTIMOS SUS DATOS"
            content={`5.1 Fry Chicken podrá compartir información con terceros únicamente cuando sea necesario:

• Sociedades relacionadas: Para procesar servicios y mejorar la experiencia del usuario.
• Proveedores de servicios: Para soporte técnico, marketing, análisis de datos o seguridad.
• Comercios adheridos: Para concretar pedidos.
• Autoridades: Si la ley, resolución judicial o administrativa lo requiere.

5.2 Los datos pueden transferirse internacionalmente a países donde operen nuestros proveedores, siempre cumpliendo la normativa aplicable.`}
          />

          <Section
            title="6. INFORMACIÓN DE PAGOS"
            content={`6.1 Actualmente Fry Chicken solo recibe pagos en efectivo y transferencias bancarias.

6.2 No se aceptan pagos con tarjeta de crédito o débito, por lo que Fry Chicken no almacena información sensible de tarjetas.

6.3 Cualquier proveedor que gestione pagos será responsable de sus propios procesos y políticas de privacidad.`}
          />

          <Section
            title="7. ACTUALIZACIÓN DE LA INFORMACIÓN"
            content={`7.1 Usted es responsable de mantener sus datos actualizados en el Portal para asegurar un correcto funcionamiento.

7.2 Fry Chicken conservará información personal anterior únicamente por motivos de seguridad o control de fraude.`}
          />

          <Section
            title="8. DERECHOS DEL USUARIO"
            content={`8.1 Usted tiene derecho a acceder, actualizar, eliminar o limitar el tratamiento de sus datos personales.

8.2 Para gestionar o eliminar sus datos, puede dirigirse a:
Correo electrónico: frychicken2007@gmail.com

8.3 Una vez solicitada la eliminación, Fry Chicken procederá a realizarla dentro del plazo indicado por la normativa hondureña, o en su defecto, en un máximo de 10 días hábiles.

8.4 Los registros de pedidos anteriores se conservarán únicamente con fines de análisis estadístico o prevención de fraude, sin vincularse a la identidad del usuario.`}
          />

          <Section
            title="9. COOKIES"
            content={`9.1 Se usan cookies de sesión y persistentes para mejorar la experiencia del usuario en el Portal.

9.2 Las cookies de sesión se eliminan al cerrar el navegador; las persistentes se mantienen hasta su expiración o eliminación manual.

9.3 Se utiliza Google Analytics para generar información estadística del uso del Portal.

9.4 Los usuarios pueden desactivar las cookies mediante la configuración de su navegador, aunque esto puede afectar la experiencia de uso.`}
          />

          <Section
            title="10. SEGURIDAD DE SU INFORMACIÓN"
            content={`10.1 Fry Chicken adopta medidas técnicas y administrativas para proteger la información de accesos no autorizados, alteraciones o divulgación indebida.

10.2 La transmisión de datos por internet nunca es totalmente segura, por lo que se recomienda no incluir información altamente sensible.

10.3 Usted es responsable de mantener confidenciales sus credenciales de acceso.`}
          />

          <Section
            title="11. CAMBIOS EN ESTA POLÍTICA"
            content={`11.1 Fry Chicken puede modificar esta Política cuando lo considere necesario.

11.2 Los cambios significativos se notificarán a los usuarios mediante correo electrónico o aviso en el Portal.`}
          />

          <Section
            title="12. USO DEL SITIO POR NIÑOS"
            content={`12.1 Este Portal no está dirigido a menores de edad.

12.2 En caso de que un menor acceda al sitio y proporcione datos sin supervisión de un adulto, Fry Chicken no se hace responsable.

12.3 Si un adulto desea solicitar la eliminación de información proporcionada por un menor, debe comunicarse al correo frychicken2007@gmail.com.`}
          />

          <Section
            title="13. DISPOSICIONES FINALES"
            content={`13.1 El Portal puede contener enlaces a sitios de terceros. Fry Chicken no se responsabiliza por la privacidad de dichos sitios.

13.2 Ninguna parte de esta Política genera derechos legales adicionales a los ya establecidos por la ley hondureña.`}
          />

          <Section
            title="14. JURISDICCIÓN Y LEY APLICABLE"
            content={`14.1 Esta Política se rige por las leyes de la República de Honduras.

14.2 Cualquier controversia será resuelta por los tribunales ordinarios de Honduras, renunciando a cualquier otro fuero.`}
          />

          <Section
            title="15. CONSENTIMIENTO"
            content={`15.1 Al usar el Portal, usted consiente el tratamiento de sus datos personales conforme a esta Política, incluyendo la posibilidad de recibir información de promociones y novedades de Fry Chicken.`}
          />
        </View>

        <View style={[styles.footer, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Para consultas sobre esta política, contáctenos en:{'\n'}
            <Text style={[styles.footerEmail, { color: colors.primary }]}>frychicken2007@gmail.com</Text>
          </Text>
          <Text style={[styles.footerDate, { color: colors.textMuted }]}>
            Última actualización: Enero 2026
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
    lineHeight: 22,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  footer: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  footerEmail: {
    fontWeight: '600' as const,
  },
  footerDate: {
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
});
