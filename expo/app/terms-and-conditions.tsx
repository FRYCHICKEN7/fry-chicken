import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { FileText } from 'lucide-react-native';

export default function TermsAndConditionsScreen() {
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
            <FileText size={32} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Términos y Condiciones</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Fry Chicken S.A.{'\n'}Honduras
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.updateDate, { color: colors.textMuted }]}>
            Última actualización: 02/01/2026
          </Text>

          <Section
            title="1. GENERAL"
            content={`1.1 Fry Chicken S.A. (en adelante "Fry Chicken") y sus sociedades vinculadas prestan servicios a los usuarios según los presentes Términos y Condiciones (en adelante, los "Términos y Condiciones"). Estos constituyen el contrato entre el Usuario y Fry Chicken que rige el uso del Portal y de la Aplicación, así como la relación con los servicios ofrecidos.

1.2 Al utilizar cualquier servicio de Fry Chicken, actual o futuro, el Usuario acepta los lineamientos y condiciones aplicables al mismo.

1.3 El desconocimiento de los Términos y Condiciones no exime al Usuario de su cumplimiento ni le da derecho a tomar medidas legales contrarias a los aquí establecidos.

1.4 Los menores de 18 años deberán contar con autorización de sus padres o representantes legales para usar el Portal. Fry Chicken se reserva el derecho de negar el servicio, cerrar cuentas o eliminar contenido a su entera discreción.

1.5 Fry Chicken podrá modificar estos Términos y Condiciones cuando lo considere oportuno. El acceso al Portal después de cualquier actualización implica aceptación expresa de los cambios.

1.6 Quien no acepte estos Términos y Condiciones o cualquiera de las políticas de Fry Chicken deberá abstenerse de usar el Portal o los servicios.

1.7 Dudas o consultas sobre los Términos y Condiciones pueden dirigirse al correo electrónico: frychicken2007@gmail.com`}
          />

          <Section
            title="2. PRIVACIDAD"
            content={`2.1 Por favor, revisa nuestra Política de Privacidad, disponible en el Portal, que regula la obtención, uso y tratamiento de la información de los Usuarios.`}
          />

          <Section
            title="3. DEFINICIONES"
            content={`3.1 Aplicación: La aplicación móvil "Fry Chicken".

3.2 Bienes: Productos ofrecidos por Fry Chicken, que incluyen únicamente alimentos y bebidas no alcohólicas. No se incluyen bebidas alcohólicas, tabaco ni otros productos.

3.3 Oferente: Fry Chicken, como único proveedor de los Bienes en la Aplicación y Portal.

3.4 Pedido: Solicitud del Usuario de Bienes a Fry Chicken a través del Portal o Aplicación.

3.5 Nosotros/Nuestro/Fry Chicken: Se refiere a Fry Chicken S.A., con domicilio en [dirección de la empresa], Honduras.

3.6 Servicio: Servicio de intermediación y entrega de los Bienes solicitados por el Usuario.

3.7 Sitio Web/Portal: Sitio web www.frychickenhn.com y/o la Aplicación móvil Fry Chicken.

3.8 Usuario/Cliente: Persona física o jurídica que accede al Portal o Aplicación y realiza Pedidos.`}
          />

          <Section
            title="4. CAPACIDAD"
            content={`4.1 Los Servicios están disponibles solo para Usuarios con capacidad legal para contratar. No pueden registrarse menores de edad sin autorización de sus padres o tutores.

4.2 Para registrar una empresa, el representante legal debe tener capacidad para obligar a la misma según estos Términos y Condiciones.

4.3 No se venden bebidas alcohólicas ni tabaco, por lo que no aplica requisito de edad para estos productos. Solo se venden alimentos y bebidas no alcohólicas.`}
          />

          <Section
            title="5. DERECHOS DE AUTOR"
            content={`5.1 Todo el contenido del Portal, incluyendo textos, imágenes, software y códigos ("Material") está protegido por leyes de propiedad intelectual.

5.2 Queda prohibido modificar, reproducir, distribuir o usar el Material sin autorización.`}
          />

          <Section
            title="6. MARCAS COMERCIALES"
            content={`6.1 Fry Chicken y su logotipo son marcas comerciales registradas. Su uso sin autorización está prohibido.`}
          />

          <Section
            title="7. USO AUTORIZADO DEL PORTAL"
            content={`7.1 El Portal tiene como finalidad la intermediación y entrega de Bienes de Fry Chicken.

7.2 El Usuario se compromete a realizar Pedidos correctos y a proporcionar datos verídicos para la entrega.`}
          />

          <Section
            title="8. CREACIÓN DE CUENTA"
            content={`8.1 Para usar el Portal, el Usuario debe crear una Cuenta ingresando datos personales como nombre, dirección, correo electrónico y teléfono.

8.2 El Usuario garantiza que sus datos son verídicos y actualizados. Fry Chicken no se responsabiliza por datos falsos proporcionados por el Usuario.

8.3 La Cuenta es única e intransferible. Queda prohibido registrar más de una Cuenta.

8.4 El Usuario es responsable de mantener su correo y contraseña confidenciales. Fry Chicken no será responsable de uso fraudulento por terceros.

8.5 En caso de problemas con el acceso a la Cuenta, el Usuario debe comunicarse al correo frychicken2007@gmail.com`}
          />

          <Section
            title="9. PROCEDIMIENTO DE PEDIDOS"
            content={`9.1 El Usuario selecciona los productos, confirma el Pedido y elige el método de pago disponible (efectivo o transferencia).

9.2 El Usuario se compromete a pagar el precio del Pedido tras recibir la confirmación.

9.3 Fry Chicken no se responsabiliza por errores en la dirección o rechazo del Pedido por datos incorrectos.

9.4 Todos los Pedidos son gestionados por Fry Chicken directamente; no se permite intermediación externa.`}
          />

          <Section
            title="10. CARGOS Y PRECIO DE LOS BIENES"
            content={`10.1 El precio de los Bienes será mostrado en el Portal antes de confirmar el Pedido, incluyendo impuestos y cargos aplicables.

10.2 El Usuario debe verificar que lo recibido coincida con el Pedido y la factura proporcionada.`}
          />

          <Section
            title="11. MEDIOS DE PAGO"
            content={`11.1 Pago en efectivo o transferencia: Solo se aceptan pagos en efectivo al momento de la entrega o mediante transferencia bancaria.

11.2 Fry Chicken no almacena información de tarjetas de crédito o débito ni otros medios de pago electrónico.`}
          />

          <Section
            title="12. PUBLICIDAD"
            content={`12.1 Fry Chicken puede mostrar publicidad mediante banners u otros medios en el Portal.

12.2 El Usuario puede solicitar no recibir notificaciones publicitarias mediante su perfil.`}
          />

          <Section
            title="13. PROMOCIONES Y CONCURSOS"
            content={`13.1 Las promociones y concursos estarán sujetos a reglas publicadas previamente en el Portal.

13.2 El Usuario debe cumplir los requisitos de registro y edad establecidos para participar.`}
          />

          <Section
            title="14. RESPONSABILIDAD"
            content={`14.1 Fry Chicken es responsable únicamente de los Pedidos realizados en su Portal.

14.2 El Usuario reconoce que el riesgo sobre la selección de productos, su consumo y entrega recae sobre él.`}
          />

          <Section
            title="15. SEGURIDAD DEL PORTAL Y CIBERATAQUES"
            content={`15.1 Fry Chicken no garantiza que el Portal esté libre de errores, virus, malware, spyware, ransomware, firmware malicioso u otros tipos de ataques o vulnerabilidades cibernéticas que puedan afectar el funcionamiento del Portal, la Aplicación, los dispositivos del Usuario o la información proporcionada.

15.2 El Usuario es responsable de la seguridad de su correo, contraseña y dispositivo móvil vinculados a la Cuenta.

15.3 Ningún empleado de Fry Chicken solicitará al Usuario sus credenciales de acceso ni que las comparta con terceros.`}
          />

          <Section
            title="16. PROHIBICIONES"
            content={`16.1 Queda prohibido usar el Portal para actividades ilegales, transmitir material que infrinja derechos de terceros o crear Pedidos falsos.

16.2 No se permite el uso comercial no autorizado, reventa o cesión de derechos de la Cuenta.`}
          />

          <Section
            title="17. TERMINACIÓN"
            content={`17.1 Fry Chicken puede suspender o cancelar la Cuenta del Usuario ante incumplimiento de los Términos y Condiciones.

17.2 Se conservará información anónima con fines estadísticos sin comprometer datos personales.`}
          />

          <Section
            title="18. INFORMACIÓN ADICIONAL"
            content={`18.1 Fry Chicken no garantiza que el Portal opere libre de errores, virus o fallas que puedan afectar equipos, firmware o software del Usuario.

18.2 El Portal y el Material se proporcionan "tal cual", sin garantía sobre exactitud o confiabilidad.`}
          />

          <Section
            title="19. LEY APLICABLE"
            content={`19.1 Los Términos y Condiciones se rigen por las leyes de Honduras.`}
          />

          <Section
            title="20. POLÍTICAS, MODIFICACIÓN Y DIVISIBILIDAD"
            content={`20.1 Fry Chicken puede modificar estos Términos y Condiciones en cualquier momento.

20.2 Si alguna disposición fuera inválida o inaplicable, las demás permanecerán vigentes.`}
          />
        </View>

        <View style={[styles.footer, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Para consultas sobre estos términos, contáctenos en:{'\n'}
            <Text style={[styles.footerEmail, { color: colors.primary }]}>frychicken2007@gmail.com</Text>
          </Text>
          <Text style={[styles.footerDate, { color: colors.textMuted }]}>
            Última actualización: 02/01/2026
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
  updateDate: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic' as const,
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
