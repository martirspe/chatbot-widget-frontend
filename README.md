# Chatbot Widget Frontend

## Descripción

Interfaz web desarrollada en **Angular 20** para interactuar con el asistente inteligente. Permite a los usuarios enviar mensajes y recibir respuestas en tiempo real, integrando funcionalidades modernas y una experiencia accesible. El frontend está diseñado para integrarse fácilmente en aplicaciones empresariales y consumir la API del backend.

---

## Tecnologías utilizadas

- **Angular 20**
- **TypeScript**
- **Docker**
- **npm**

---

## Acceso

- **Frontend Angular:** [http://localhost:4200](http://localhost:4200)

---

## Estructura del proyecto

```
frontend/
├─ Dockerfile
├─ package.json
├─ angular.json
└─ src/
```

---

## Configuración

Configura las variables de entorno en los archivos:

- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)

Ejemplo de configuración:

```typescript
export const environment = {
  production: false, // true en environment.prod.ts
  apiBaseUrl: 'http://localhost:3000' // URL del backend
};
```

**Variables principales:**

- `apiBaseUrl`: URL base para las peticiones al backend (por ejemplo, `http://localhost:3000` en desarrollo y `https://api.tudominio.com` en producción).

> Angular selecciona automáticamente el archivo de entorno según el modo de compilación (`ng serve` para desarrollo, `ng build --configuration production` para producción).

---

## Contribución

1. Clona el repositorio
2. Configura las variables en `src/environments/environment.ts` y `src/environments/environment.prod.ts`
3. Construye la imagen Docker con el `Dockerfile`
4. Desarrolla nuevas funcionalidades en `frontend/src`
5. Abre Pull Request y documenta los cambios

---

## Licencia

Este proyecto es **privado y de uso comercial**.  
Queda estrictamente prohibida la distribución, copia, modificación o uso total o parcial sin la autorización expresa y por escrito del titular.  
Para obtener acceso, soporte técnico o licencias comerciales, contacta a [MartiPE](mailto:martirspe@gmail.com).
