# Reglas de Seguridad de Firebase - Completas

## Instrucciones de Implementación

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Firestore Database** > **Reglas**
4. Copia y pega las reglas de abajo
5. Haz clic en **Publicar**

---

## Reglas de Seguridad Completas (231 líneas)

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
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'admin';
    }

    function isBranch() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'branch';
    }

    function isDelivery() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'delivery';
    }

    function isCustomer() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'customer';
    }

    function getBranchId() {
      return getUserData().branchId;
    }

    // ================= USUARIOS =================
    match /users/{userId} {
      // Permitir creación sin restricciones (para registro inicial)
      allow create: if true;
      
      // Cualquier usuario autenticado puede leer cualquier perfil
      allow get, list: if isAuthenticated();
      
      // Usuarios autenticados pueden actualizar sus propios perfiles
      // Admin puede actualizar cualquier perfil
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      
      // Solo admin puede eliminar
      allow delete: if isAdmin();
    }

    // ================= PEDIDOS =================
    match /orders/{orderId} {
      // Admin puede ver todos los pedidos
      allow list: if isAdmin();
      
      // Sucursal puede ver solo sus pedidos
      allow list: if isBranch() && resource.data.branchId == getBranchId();
      
      // Repartidor puede ver pedidos asignados o disponibles de su sucursal
      allow list: if isDelivery() && (
        resource.data.deliveryId == request.auth.uid ||
        resource.data.branchId == getBranchId()
      );
      
      // Cliente puede ver sus propios pedidos
      allow list: if isCustomer() && resource.data.customerId == request.auth.uid;
      
      // Lectura individual de pedido
      allow get: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && (resource.data.deliveryId == request.auth.uid || resource.data.branchId == getBranchId())) ||
        (isCustomer() && resource.data.customerId == request.auth.uid)
      );
      
      // Crear pedidos
      allow create: if isAuthenticated() && (isCustomer() || isAdmin());
      
      // Actualizar pedidos
      allow update: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && resource.data.deliveryId == request.auth.uid)
      );
      
      // Eliminar pedidos
      allow delete: if isAdmin();
    }

    // ================= QUEJAS =================
    match /complaints/{complaintId} {
      allow get, list: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= SUCURSALES =================
    match /branches/{branchId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= ZONAS DE ENVÍO =================
    match /zones/{zoneId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= DELIVERY USERS =================
    match /deliveryUsers/{deliveryId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PRODUCTOS =================
    match /products/{productId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CATEGORÍAS =================
    match /categories/{categoryId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CUENTAS BANCARIAS =================
    match /bankAccounts/{accountId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= NOTIFICACIONES =================
    match /notifications/{notificationId} {
      allow get, list, create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PUNTOS DE USUARIO =================
    match /userPoints/{userPointsId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PASSWORD RESETS =================
    match /passwordResets/{email} {
      allow read, write: if true;
    }

    // ================= SOLICITUDES DE RECUPERACIÓN DE CONTRASEÑA =================
    match /passwordRecoveryRequests/{requestId} {
      allow create, read, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= CUPONES =================
    match /coupons/{couponId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= PROMOCIONES =================
    match /promotions/{promotionId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CONFIGURACIÓN DE PUNTOS =================
    match /pointsSettings/{settingId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= HORARIOS DE NEGOCIO =================
    match /businessHours/{hourId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin() || isBranch();
    }

    // ================= CONFIGURACIÓN DE TEMA =================
    match /theme/{themeId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= POPUP DE MARKETING =================
    match /marketingPopup/{popupId} {
      allow get, list: if true;
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
      allow get, list: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= ZONAS DE ENVÍO POR SUCURSAL =================
    match /deliveryZones/{zoneId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Colecciones Incluidas

1. **users** - Usuarios del sistema
2. **orders** - Pedidos (con reglas detalladas por rol)
3. **complaints** - Quejas
4. **branches** - Sucursales
5. **zones** - Zonas de envío generales
6. **deliveryUsers** - Repartidores
7. **products** - Productos
8. **categories** - Categorías
9. **bankAccounts** - Cuentas bancarias
10. **notifications** - Notificaciones
11. **userPoints** - Puntos de usuario
12. **passwordResets** - Reseteo de contraseñas
13. **passwordRecoveryRequests** - Solicitudes de recuperación
14. **coupons** - Cupones
15. **promotions** - Promociones
16. **pointsSettings** - Configuración de puntos
17. **businessHours** - Horarios de negocio
18. **theme** - Configuración de tema
19. **marketingPopup** - Popup de marketing
20. **backups** - Respaldos
21. **statistics** - Estadísticas
22. **importLogs** - Logs de importación
23. **reviews** - Calificaciones
24. **deliveryZones** - Zonas de envío por sucursal

## Funciones Auxiliares

- `isAuthenticated()` - Verifica si el usuario está autenticado
- `getUserData()` - Obtiene los datos del usuario actual
- `isAdmin()` - Verifica si es administrador
- `isBranch()` - Verifica si es sucursal
- `isDelivery()` - Verifica si es repartidor
- `isCustomer()` - Verifica si es cliente
- `getBranchId()` - Obtiene el ID de sucursal del usuario

## Notas Importantes

1. **Registro de usuarios**: `allow create: if true` permite el registro sin autenticación previa
2. **Lectura pública**: Branches, productos, categorías tienen lectura pública para que la app funcione sin login
3. **Permisos de pedidos**: Cada rol tiene acceso específico a los pedidos según su función
4. **Seguridad**: Solo admins pueden eliminar datos críticos
