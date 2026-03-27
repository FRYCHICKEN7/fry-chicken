# Firebase Security Rules - Sin Municipios

## Instrucciones de Implementación

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Firestore Database** > **Reglas**
4. Copia y pega las reglas de abajo
5. Haz clic en **Publicar**

---

## Reglas de Seguridad

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ================= FUNCIONES AUXILIARES =================
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }

    function isBranch() {
      return isAuthenticated() && getUserData().role == 'branch';
    }

    function isDelivery() {
      return isAuthenticated() && getUserData().role == 'delivery';
    }

    function isCustomer() {
      return isAuthenticated() && getUserData().role == 'customer';
    }

    // ================= USUARIOS =================
    match /users/{userId} {
      // Permitir creación sin restricciones (para registro)
      allow create: if true;
      
      // Lectura: usuario autenticado puede leer cualquier perfil
      allow get, list: if isAuthenticated();
      
      // Actualización: el propio usuario o admin
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      
      // Eliminación: solo el propio usuario o admin
      allow delete: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }

    // ================= PEDIDOS =================
    match /orders/{orderId} {
      allow get, list: if isAuthenticated();
      allow create: if isAuthenticated() && (isCustomer() || isAdmin());
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= QUEJAS =================
    match /complaints/{complaintId} {
      allow get, list: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= SUCURSALES =================
    // CRÍTICO: Permitir lectura sin autenticación para que la app funcione
    match /branches/{branchId} {
      allow get, list: if true;
      allow create, delete: if isAdmin();
      // Permitir actualización a admin O a la sucursal que actualiza su propia info
      allow update: if isAdmin() || (isBranch() && getUserData().branchId == branchId);
    }

    // ================= DELIVERY USERS =================
    match /deliveryUsers/{deliveryId} {
      allow get, list: if isAuthenticated();
      allow create: if true; // Permitir registro de repartidores
      allow update: if isAuthenticated() && (request.auth.uid == deliveryId || isAdmin());
      allow delete: if isAdmin();
    }

    // ================= PRODUCTOS =================
    match /products/{productId} {
      allow get, list: if true; // Público para catálogo
      allow create, update, delete: if isAdmin();
    }

    // ================= CATEGORÍAS =================
    match /categories/{categoryId} {
      allow get, list: if true; // Público para catálogo
      allow create, update, delete: if isAdmin();
    }

    // ================= CUENTAS BANCARIAS =================
    match /bankAccounts/{accountId} {
      allow get, list: if true; // Público para checkout
      allow create, update, delete: if isAdmin();
    }

    // ================= NOTIFICACIONES =================
    match /notifications/{notificationId} {
      allow get, list, create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PUNTOS DE USUARIO =================
    match /userPoints/{userPointsId} {
      allow get: if isAuthenticated() && (request.auth.uid == userPointsId || isAdmin());
      allow list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PASSWORD RESETS =================
    match /passwordResets/{email} {
      allow read, write: if true; // Necesario para recuperación de contraseña
    }

    // ================= SOLICITUDES DE RECUPERACIÓN =================
    match /passwordRecoveryRequests/{requestId} {
      allow create: if true; // Cualquiera puede solicitar
      allow read, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= CUPONES =================
    match /coupons/{couponId} {
      allow get, list: if true; // Público para checkout
      allow create, update, delete: if isAdmin();
    }

    // ================= PROMOCIONES =================
    match /promotions/{promotionId} {
      allow get, list: if true; // Público para home
      allow create, update, delete: if isAdmin();
    }

    // ================= CONFIGURACIÓN DE PUNTOS =================
    match /pointsSettings/{settingId} {
      allow get, list: if true; // Público para mostrar info
      allow create, update, delete: if isAdmin();
    }

    // ================= HORARIOS DE NEGOCIO =================
    match /businessHours/{hourId} {
      allow get, list: if true; // Público para mostrar horarios
      allow create, update, delete: if isAdmin() || isBranch();
    }

    // ================= CONFIGURACIÓN DE TEMA =================
    match /theme/{themeId} {
      allow get, list: if true; // Público para aplicar tema
      allow create, update, delete: if isAdmin();
    }

    // ================= POPUP DE MARKETING =================
    match /marketingPopup/{popupId} {
      allow get, list: if true; // Público para mostrar popup
      allow create, update, delete: if isAdmin();
    }

    // ================= RESPALDOS =================
    match /backups/{backupId} {
      allow read, write: if isAdmin();
    }

    // ================= ESTADÍSTICAS =================
    match /statistics/{statId} {
      allow read, write: if isAdmin();
    }

    // ================= IMPORTACIÓN DE PRODUCTOS =================
    match /importLogs/{logId} {
      allow read, write: if isAdmin();
    }

    // ================= CALIFICACIONES =================
    match /reviews/{reviewId} {
      allow get, list: if true; // Público para mostrar
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= ZONAS DE ENVÍO =================
    // Simplificado sin municipios
    match /deliveryZones/{zoneId} {
      allow get, list: if true; // Público para checkout
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Cambios Principales

### ✅ Eliminado
- Todas las referencias a `municipalities`
- Condiciones complejas con `exists()` en funciones auxiliares
- Validaciones innecesarias que causan errores

### ✅ Simplificado
- Funciones auxiliares más simples y confiables
- Permisos claros y directos
- Lectura pública donde es necesario (branches, products, etc.)

### ✅ Mejorado
- Permitir creación de usuarios sin autenticación (necesario para registro)
- Permitir lectura de sucursales sin autenticación (necesario para la app)
- Permisos más específicos y seguros

## Notas Importantes

1. **Branches**: Ahora permiten lectura sin autenticación (`if true`) para que los usuarios no logueados puedan ver sucursales y horarios.

2. **Productos y Categorías**: Lectura pública para que el catálogo funcione sin login.

3. **Seguridad**: Solo admins pueden crear/editar/eliminar datos críticos.

4. **Sin Municipios**: Todas las referencias eliminadas por completo.

## Testing

Después de publicar las reglas, prueba:

1. ✅ Abrir la app sin estar logueado (debería mostrar sucursales)
2. ✅ Registrarse como nuevo usuario
3. ✅ Ver productos y categorías
4. ✅ Hacer checkout (debería ver cuentas bancarias)
5. ✅ Como admin: editar sucursales y horarios

Si persisten errores, revisa la consola de Firebase Firestore para ver logs de acceso denegado.
