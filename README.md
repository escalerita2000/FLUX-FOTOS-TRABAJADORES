# LECTORES FOTOS

Aplicación web PWA y servidor de almacenamiento para el registro de fotografías de medidores por parte de supervisores.

---

## A) Primera Configuración (Solo la primera vez)

1. **Clonar/Abrir el proyecto** en tu PC.
2. **Ejecutar el instalador automático**:
   Abre PowerShell en la carpeta del proyecto y ejecuta:
   ```bash
   npm run setup
   ```
   *Este script instalará las dependencias de Node.js, configurará tu archivo `.env` local, verificará Supabase CLI y compilará la aplicación.*

3. **Cargar la base de datos** (en la nube de Supabase):
   - Ve a tu consola web de Supabase -> **SQL Editor**.
   - Pega y ejecuta el contenido del archivo [`supabase/schema.sql`](./supabase/schema.sql) para crear las tablas y la lista de 33 lectores.

4. **Desplegar la Edge Function** (opcional, si deseas actualizar la función de carga en la nube):
   ```bash
   supabase login
   supabase link --project-ref umhexyqukxgnbztlbqbc
   supabase functions deploy upload-photo
   ```

---

## B) Uso Diario

Para encender la aplicación en tu computadora local:

1. Ejecuta en la terminal:
   ```bash
   npm run dev
   ```
2. Abre la URL en tu navegador:
   `http://localhost:5173`

*Puedes instalar la aplicación como una aplicación de escritorio nativa (PWA) haciendo clic en el icono de instalación de la barra de direcciones del navegador.*

---

## C) Desarrollo y Estructura

* `src/components/`: Componentes modulares de interfaz (Formulario de carga, Control Diario, Cobertura Mensual, Historial y Exportación ZIP).
* `src/services/`: Capa lógica de comunicación con la base de datos y de subida estructurada de archivos.
* `supabase/`: Contiene el esquema SQL y la lógica del servidor (Edge Function de subida con políticas de rollback y control de duplicados).
