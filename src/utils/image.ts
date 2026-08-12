/**
 * Optimiza y comprime una imagen seleccionada por el usuario en el cliente.
 * 
 * Si el lado más largo de la imagen supera el límite de pixeles (maxSide, por defecto 2000px),
 * se reduce proporcionalmente para evitar archivos excesivamente grandes.
 * Luego, la imagen se convierte a formato JPEG con una calidad de 85%, lo que genera
 * archivos de aproximadamente 1-2 MB con excelente definición visual como evidencia.
 * 
 * La compresión se realiza en memoria utilizando HTML5 Canvas sin convertir el archivo
 * a base64 (trabaja con Blob y File para evitar consumo excesivo de RAM).
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  // Solo optimizar formatos de imagen comunes
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return file; // Retornar el archivo original si no es una imagen compatible
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Liberar URL temporal inmediatamente
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Determinar si es necesario redimensionar
      let needResize = false;
      if (width > maxSide || height > maxSide) {
        needResize = true;
        if (width > height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }

      // Si no requiere redimensión y ya pesa menos de 1.5MB, no recomprimir
      const MAX_SIZE_WITHOUT_COMPRESSION = 1.5 * 1024 * 1024; // 1.5 MB
      if (!needResize && file.size < MAX_SIZE_WITHOUT_COMPRESSION) {
        resolve(file);
        return;
      }

      // Crear Canvas para la redimensión y compresión
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback en caso de falla del canvas
        return;
      }

      // Dibujar la imagen. Los navegadores modernos corrigen la orientación EXIF de forma nativa.
      ctx.drawImage(img, 0, 0, width, height);

      // Exportar como Blob en formato JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Conservar el nombre original pero cambiando la extensión a .jpg
          const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          const newName = `${originalNameWithoutExt}.jpg`;

          const compressedFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          console.log(`[compresor] Imagen optimizada: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) -> ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen para su optimización.'));
    };

    img.src = objectUrl;
  });
}
