import React, { useState, useEffect, useRef } from 'react';
import type { Reader, PhotoType, ReaderDailyStatus } from '../types';
import { getDailyStatus } from '../services/db';
import { getReaders } from '../services/readers';
import { uploadPhoto } from '../services/upload';
import { compressImage } from '../utils/image';
import { Upload, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface PhotoUploadFormProps {
  onUploadSuccess: () => void;
  currentDateStr: string;
}

export const PhotoUploadForm: React.FC<PhotoUploadFormProps> = ({ onUploadSuccess, currentDateStr }) => {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReaderId, setSelectedReaderId] = useState<string>('');
  const [photoType, setPhotoType] = useState<PhotoType>('ENTRADA');
  const [itinerary, setItinerary] = useState<string>('');
  const [supportedReaderId, setSupportedReaderId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Estado de carga y operación robusto
  const [uploadState, setUploadState] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de carga e información de hoy del lector seleccionado
  const [readerDailyInfo, setReaderDailyInfo] = useState<ReaderDailyStatus | null>(null);
  const [loadingReaderInfo, setLoadingReaderInfo] = useState(false);

  // Estados de éxito y error
  const [successInfo, setSuccessInfo] = useState<{
    lector: string;
    tipo: string;
    fecha: string;
    hora: string;
    itinerario: string;
    apoyado?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar lista de lectores al montar
  useEffect(() => {
    async function loadReaders() {
      try {
        const data = await getReaders();
        setReaders(data);
      } catch (err: any) {
        setErrorMsg('Error al cargar el catálogo de lectores.');
      }
    }
    loadReaders();
  }, []);

  // Consultar estado en tiempo real del lector al cambiar selección
  useEffect(() => {
    if (!selectedReaderId) {
      setReaderDailyInfo(null);
      setItinerary('');
      return;
    }

    async function loadReaderTodayStatus() {
      setLoadingReaderInfo(true);
      setErrorMsg(null);
      setSuccessInfo(null);
      try {
        const statuses = await getDailyStatus(currentDateStr);
        const currentInfo = statuses.find((s) => s.reader.id === selectedReaderId) || null;
        setReaderDailyInfo(currentInfo);
      } catch (err: any) {
        console.error('Error cargando estado del lector:', err);
        setErrorMsg('Error al consultar el estado diario del lector.');
      } finally {
        setLoadingReaderInfo(false);
      }
    }

    loadReaderTodayStatus();
  }, [selectedReaderId, currentDateStr]);

  // Sincronizar el itinerario preexistente cuando se carga el estado del lector
  useEffect(() => {
    if (readerDailyInfo) {
      setItinerary(readerDailyInfo.itinerary || '');
    } else {
      setItinerary('');
    }
  }, [readerDailyInfo]);

  // Limpiar lector apoyado si el tipo de foto cambia y no es APOYO
  useEffect(() => {
    if (photoType !== 'APOYO') {
      setSupportedReaderId('');
    }
  }, [photoType]);

  // Verificar si el tipo de foto seleccionado ya está registrado (solo ENTRADA y SALIDA)
  const isAlreadyRegistered = () => {
    if (!readerDailyInfo) return false;
    if (photoType === 'ENTRADA' && readerDailyInfo.entradaRecord) return true;
    if (photoType === 'SALIDA' && readerDailyInfo.salidaRecord) return true;
    return false;
  };

  // Manejo de archivo seleccionado
  const handleFileChange = (selectedFile: File) => {
    setErrorMsg(null);
    setSuccessInfo(null);

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg('Formato de archivo inválido. Formatos permitidos: JPG, JPEG, PNG, WEBP.');
      return;
    }

    // Validar tamaño máximo antes de comprimir (ej. 10MB)
    const maxBeforeCompression = 15 * 1024 * 1024; // 15MB para permitir imágenes de cámara
    if (selectedFile.size > maxBeforeCompression) {
      setErrorMsg('La imagen original supera el límite permitido para procesamiento (15MB).');
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Enviar fotografía
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    // 1. Validaciones cliente rigurosas
    if (!selectedReaderId) {
      setErrorMsg('Selecciona un lector.');
      return;
    }

    if (!itinerary.trim()) {
      setErrorMsg('El itinerario es obligatorio.');
      return;
    }

    if (isAlreadyRegistered()) {
      setErrorMsg(`El lector ya tiene una fotografía de ${photoType} registrada para hoy.`);
      return;
    }

    if (photoType === 'APOYO') {
      if (!supportedReaderId) {
        setErrorMsg('Debes seleccionar al trabajador apoyado.');
        return;
      }
      if (supportedReaderId === selectedReaderId) {
        setErrorMsg('Un lector no puede apoyarse a sí mismo.');
        return;
      }
    }

    if (!file) {
      setErrorMsg('Selecciona una fotografía.');
      return;
    }

    setUploadState('UPLOADING');
    setLoadingStatus('Optimizando fotografía...');

    try {
      // 2. Comprimir la imagen antes de subirla
      let fileToUpload = file;
      try {
        fileToUpload = await compressImage(file);
      } catch (compressErr: any) {
        console.warn('La compresión falló, se intentará subir la original:', compressErr);
      }

      setUploadState('PROCESSING');
      setLoadingStatus('Subiendo al servidor...');

      // 3. Subir vía Edge Function con los nuevos datos
      const response = await uploadPhoto(
        fileToUpload,
        selectedReaderId,
        photoType,
        itinerary.trim(),
        photoType === 'APOYO' ? supportedReaderId : undefined,
        (status) => {
          setLoadingStatus(status);
        }
      );

      if (response.success) {
        setUploadState('SUCCESS');
        
        const readerName = readers.find((r) => r.id === selectedReaderId)?.name || 'Lector';
        const supportedName = photoType === 'APOYO' 
          ? readers.find((r) => r.id === supportedReaderId)?.name 
          : undefined;
        
        const timeParts = response.bogotaTime ? response.bogotaTime.split(' ') : ['', ''];
        
        setSuccessInfo({
          lector: readerName,
          tipo: photoType,
          fecha: timeParts[0] || currentDateStr,
          hora: timeParts[1] || '---',
          itinerario: itinerary.trim(),
          apoyado: supportedName,
        });

        // Limpiar archivo y preview
        setFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }

        // Forzar recarga del estado del lector seleccionado
        const statuses = await getDailyStatus(currentDateStr);
        const updatedInfo = statuses.find((s) => s.reader.id === selectedReaderId) || null;
        setReaderDailyInfo(updatedInfo);

        // Notificar al componente principal para refrescar paneles
        onUploadSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setUploadState('ERROR');
      setErrorMsg(err.message || 'No se pudo cargar la fotografía.');
    }
  };

  const isBtnDisabled = 
    uploadState === 'UPLOADING' ||
    uploadState === 'PROCESSING' ||
    !selectedReaderId ||
    !itinerary.trim() ||
    isAlreadyRegistered() ||
    !file ||
    (photoType === 'APOYO' && !supportedReaderId);

  return (
    <div className="card">
      <h2 className="card-title">
        <Upload size={18} />
        Registrar Fotografía
      </h2>

      {/* Alertas */}
      {errorMsg && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={16} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successInfo && (
        <div className="alert-banner alert-success" style={{ flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
            <Check size={18} /> FOTOGRAFÍA GUARDADA
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <p><strong>Lector:</strong> {successInfo.lector}</p>
            <p><strong>Itinerario:</strong> {successInfo.itinerario}</p>
            <p><strong>Tipo:</strong> {successInfo.tipo}</p>
            {successInfo.apoyado && <p><strong>Apoyando a:</strong> {successInfo.apoyado}</p>}
            <p><strong>Fecha:</strong> {successInfo.fecha}</p>
            <p><strong>Hora:</strong> {successInfo.hora}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleUploadSubmit}>
        {/* Selector de Lector */}
        <div className="form-group">
          <label className="form-label" htmlFor="reader-select">LECTOR</label>
          <div className="custom-select-wrapper">
            <select
              id="reader-select"
              className="custom-select"
              value={selectedReaderId}
              onChange={(e) => {
                setSelectedReaderId(e.target.value);
                setUploadState('IDLE');
              }}
              disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
              required
            >
              <option value="">[ Seleccionar lector ▼ ]</option>
              {readers.map((reader) => (
                <option key={reader.id} value={reader.id}>
                  {reader.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estado en tiempo real del lector seleccionado */}
        {selectedReaderId && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              ESTADO DEL DÍA ACTUAL
            </div>
            {loadingReaderInfo ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando estado...</div>
            ) : (
              <div className="status-indicators" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div className={`status-badge ${readerDailyInfo?.entradaRecord ? 'registrado' : 'disponible'}`}>
                  <span className="label">Entrada</span>
                  <span>{readerDailyInfo?.entradaRecord ? '🔴 REGISTRADA' : '🟢 DISPONIBLE'}</span>
                </div>
                <div className={`status-badge ${readerDailyInfo?.apoyoRecords && readerDailyInfo.apoyoRecords.length > 0 ? 'registrado' : 'disponible'}`} style={{ borderColor: 'var(--accent-blue)', color: readerDailyInfo?.apoyoRecords && readerDailyInfo.apoyoRecords.length > 0 ? 'var(--accent-blue)' : 'inherit' }}>
                  <span className="label">Apoyos</span>
                  <span>{readerDailyInfo?.apoyoRecords && readerDailyInfo.apoyoRecords.length > 0 ? `🔵 (${readerDailyInfo.apoyoRecords.length}) HECHO` : '🟢 NINGUNO'}</span>
                </div>
                <div className={`status-badge ${readerDailyInfo?.salidaRecord ? 'registrado' : 'disponible'}`}>
                  <span className="label">Salida</span>
                  <span>{readerDailyInfo?.salidaRecord ? '🔴 REGISTRADA' : '🟢 DISPONIBLE'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campo Itinerario Terminado */}
        <div className="form-group">
          <label className="form-label" htmlFor="itinerary-input">ITINERARIO TERMINADO</label>
          <input
            id="itinerary-input"
            type="text"
            className="custom-select"
            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)' }}
            value={itinerary}
            onChange={(e) => setItinerary(e.target.value)}
            disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
            placeholder="Ej. IT-4587"
            required
          />
        </div>

        {/* Tipo de Fotografía */}
        <div className="form-group">
          <label className="form-label" htmlFor="type-select">TIPO DE FOTO</label>
          <div className="custom-select-wrapper">
            <select
              id="type-select"
              className="custom-select"
              value={photoType}
              onChange={(e) => {
                setPhotoType(e.target.value as PhotoType);
                setUploadState('IDLE');
              }}
              disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
            >
              <option value="ENTRADA">ENTRADA ▼</option>
              <option value="APOYO">APOYO ▼</option>
              <option value="SALIDA">SALIDA ▼</option>
            </select>
          </div>
        </div>

        {/* Selector de Trabajador Apoyado (solo visible para APOYO) */}
        {photoType === 'APOYO' && (
          <div className="form-group">
            <label className="form-label" htmlFor="supported-select">TRABAJADOR APOYADO</label>
            <div className="custom-select-wrapper">
              <select
                id="supported-select"
                className="custom-select"
                value={supportedReaderId}
                onChange={(e) => setSupportedReaderId(e.target.value)}
                disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
                required
              >
                <option value="">[ Seleccionar lector apoyado ▼ ]</option>
                {readers
                  .filter((r) => r.id !== selectedReaderId) // No apoyarse a sí mismo
                  .map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Bloqueo Visual de tipo ya registrado */}
        {selectedReaderId && !loadingReaderInfo && isAlreadyRegistered() && (
          <div className="alert-banner alert-danger" style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700 }}>🔴 {photoType} YA REGISTRADA</div>
          </div>
        )}

        {/* Zona de Arrastre y Selección de Archivos */}
        {(!selectedReaderId || !isAlreadyRegistered()) && (
          <div className="form-group">
            <label className="form-label">SELECCIONAR FOTOGRAFÍA</label>
            
            {!previewUrl ? (
              <>
                <input
                  id="file-picker"
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/jpeg, image/jpg, image/png, image/webp"
                  onChange={onFileSelectChange}
                  disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
                />
                <div
                  className={`upload-zone ${dragActive ? 'dragging' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="upload-icon" />
                  <span className="upload-text">
                    <strong>Haga clic para seleccionar</strong> o arrastre una foto
                  </span>
                  <span className="upload-hint">Formatos soportados: JPG, JPEG, PNG, WEBP (Máx. 15MB)</span>
                </div>
              </>
            ) : (
              <div className="preview-container">
                <img src={previewUrl} alt="Vista previa" className="image-preview" />
                <div className="preview-info" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <p>{file?.name}</p>
                  <p>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                </div>
                <button
                  type="button"
                  className="btn-remove-preview"
                  onClick={removeFile}
                  disabled={uploadState === 'UPLOADING' || uploadState === 'PROCESSING'}
                  title="Eliminar foto"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botón de Guardar */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isBtnDisabled}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {uploadState === 'UPLOADING' && `SUBIENDO (${loadingStatus})...`}
          {uploadState === 'PROCESSING' && `PROCESANDO (${loadingStatus})...`}
          {uploadState === 'SUCCESS' && '✅ GUARDADO CON ÉXITO'}
          {uploadState === 'ERROR' && '❌ REINTENTAR GUARDAR'}
          {uploadState === 'IDLE' && 'GUARDAR FOTOGRAFÍA'}
        </button>
      </form>
    </div>
  );
};
