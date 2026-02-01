# Firebase Rules - Actualizado para Sincronización de Delivery por DNI

Copia estas reglas en la consola de Firebase (Firestore Database > Rules):

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
      allow create: if true;
      allow get, list: if isAuthenticated();
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    // ================= PEDIDOS =================
    match /orders/{orderId} {
      allow list: if
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && (resource.data.deliveryId == request.auth.uid || resource.data.branchId == getBranchId())) ||
        (isCustomer() && resource.data.customerId == request.auth.uid);

      allow get: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && (resource.data.deliveryId == request.auth.uid || resource.data.branchId == getBranchId())) ||
        (isCustomer() && resource.data.customerId == request.auth.uid)
      );

      allow create: if isAuthenticated() && (isCustomer() || isAdmin());

      allow update: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && resource.data.deliveryId == request.auth.uid)
      );

      allow delete: if isAdmin();
    }

    // ================= QUEJAS =================
    match /complaints/{complaintId} {
      allow get, list, create: if isAuthenticated();
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

    // ================= DELIVERY USERS (SOLO YA APROBADOS) =================
    match /deliveryUsers/{deliveryId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= SOLICITUDES DE DELIVERY (REGISTRO PÚBLICO) =================
    match /deliveryRequests/{requestId} {
      // Crear SIN autenticación (registro público)
      allow create: if
        request.resource.data.keys().hasAll(['name', 'email', 'phone', 'dni', 'branchId', 'vehicleType', 'plateNumber']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.email is string &&
        request.resource.data.email.matches('.*@.*\\..*') &&
        request.resource.data.phone is string &&
        request.resource.data.phone.size() > 0 &&
        request.resource.data.dni is string &&
        request.resource.data.dni.size() > 0 &&
        request.resource.data.branchId is string &&
        request.resource.data.branchId.size() > 0 &&
        request.resource.data.vehicleType is string &&
        request.resource.data.vehicleType.size() > 0 &&
        request.resource.data.plateNumber is string &&
        request.resource.data.plateNumber.size() > 0;

      // Leer solo admin o sucursal
      allow get, list: if isAdmin() || isBranch();

      // IMPORTANTE: Permitir que admin Y sucursales puedan actualizar CUALQUIER solicitud
      // Esto es necesario para sincronizar aprobaciones/rechazos por DNI entre sucursales
      allow update: if isAdmin() || isBranch();
      
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
      allow get, list, create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PASSWORD RESETS =================
    match /passwordResets/{email} {
      allow read, write: if true;
    }

    // ================= RECUPERACIÓN DE CONTRASEÑA =================
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
      allow create, update, delete: if isAdmin() || isBranch();
    }
  }
}
```

## Cambios realizados:

La regla de `deliveryRequests` ahora permite que **cualquier sucursal** pueda actualizar **cualquier solicitud** de delivery:

```javascript
// ANTES (solo su propia sucursal):
allow update: if isAdmin() || (isBranch() && resource.data.branchId == getBranchId());

// AHORA (cualquier sucursal autenticada):
allow update: if isAdmin() || isBranch();
```

Esto es necesario para que cuando una sucursal apruebe o rechace un delivery, pueda automáticamente actualizar los registros del mismo DNI en otras sucursales.
