# Configuración de Supabase para Comprobantes de Pago

Este proyecto usa Supabase únicamente para almacenar las imágenes de los comprobantes de pago. El resto de funciones sigue funcionando con Firebase.

## Paso 1: Crear Cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Haz clic en "New Project"
4. Completa la información:
   - **Name**: `fry-chicken-receipts` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana a Honduras (ej: South America - São Paulo)
5. Haz clic en "Create new project" y espera a que se cree (toma 2-3 minutos)

## Paso 2: Crear el Bucket de Storage

1. En el menú lateral izquierdo, haz clic en **Storage**
2. Haz clic en "Create a new bucket"
3. Completa la información:
   - **Name**: `receipts`
   - **Public bucket**: Marca esta opción como **activada** (importante)
4. Haz clic en "Create bucket"

## Paso 3: Configurar las Políticas de Acceso (RLS)

1. En la página de Storage, haz clic en el bucket `receipts`
2. Haz clic en la pestaña **Policies**
3. Necesitamos crear 2 políticas:

### Política 1: Permitir SUBIR comprobantes

1. Haz clic en "New Policy"
2. Selecciona "For full customization"
3. Completa:
   - **Policy name**: `Allow public uploads`
   - **Allowed operation**: Selecciona `INSERT`
   - **Target roles**: `public`
   - **USING expression**: Deja en blanco o escribe `true`
   - **WITH CHECK expression**: Escribe `true`
4. Haz clic en "Review" y luego "Save policy"

### Política 2: Permitir VER comprobantes

1. Haz clic en "New Policy" nuevamente
2. Selecciona "For full customization"
3. Completa:
   - **Policy name**: `Allow public reads`
   - **Allowed operation**: Selecciona `SELECT`
   - **Target roles**: `public`
   - **USING expression**: Escribe `true`
4. Haz clic en "Review" y luego "Save policy"

## Paso 4: Obtener las Credenciales

1. En el menú lateral, haz clic en **Settings** (icono de engranaje)
2. Haz clic en **API** en el submenú
3. Encontrarás:
   - **Project URL**: Copia esta URL (ejemplo: `https://orepcdnddxcqjjsejugb.supabase.co`)
   - **anon/public key**: Copia esta clave (es una clave larga que empieza con `eyJ...`)

## Paso 5: Configurar las Variables de Entorno

Las credenciales ya están configuradas en el proyecto:
- `EXPO_PUBLIC_SUPABASE_URL`: Tu Project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Tu anon/public key

## Verificar la Configuración

Para verificar que todo funciona correctamente:

1. Inicia la aplicación
2. Ve a la pantalla de checkout
3. Selecciona "Transferencia Bancaria"
4. Sube un comprobante de prueba
5. Si ves "✅ Comprobante Cargado" y "Tu comprobante se ha cargado correctamente a Supabase", ¡funciona!

## Ver los Comprobantes Subidos

1. Ve a Supabase Dashboard
2. Haz clic en **Storage**
3. Selecciona el bucket `receipts`
4. Verás todas las imágenes subidas organizadas por pedido

## Costos

El plan gratuito de Supabase incluye:
- 1 GB de almacenamiento en Storage
- 2 GB de transferencia de datos por mes
- Más que suficiente para cientos/miles de comprobantes

## Flujo Completo

1. **Cliente**: Sube comprobante → Se guarda en Supabase → URL pública se guarda en Firebase
2. **Administrador**: Ve el comprobante en la pantalla de órdenes → Puede aprobar el pedido
3. **Sucursal**: Ve el comprobante aprobado y procesa el pedido

## Notas Importantes

- ✅ Supabase SOLO se usa para los comprobantes
- ✅ Firebase sigue siendo la base de datos principal
- ✅ Los comprobantes son públicos (cualquiera con el URL puede verlos)
- ✅ Los URLs de Supabase son permanentes
- ✅ Compatible con web y móvil

## Solución de Problemas

### Error: "No se pudo subir el comprobante"

- Verifica que el bucket `receipts` existe
- Verifica que las políticas están configuradas correctamente
- Verifica que el bucket es público

### Error: "Error al conectar con Supabase"

- Verifica que las credenciales son correctas
- Verifica tu conexión a internet

### Los comprobantes no se ven

- Verifica que la política de SELECT está activada
- Verifica que el URL del comprobante sea correcto
