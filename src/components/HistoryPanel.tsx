import React, { useState, useEffect } from 'react';
import type { PhotoRecord, Reader } from '../types';
import { getHistory, getSupervisors, getSignedUrl } from '../services/db';
import { getReaders } from '../services/readers';
import { Filter, Download, FolderSync, Eye, Image as ImageIcon } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface HistoryPanelProps {
  onViewPhoto: (record: PhotoRecord) => void;
  refreshSignal: number;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onViewPhoto, refreshSignal }) => {
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [supervisors, setSupervisors] = useState<{ id: string; email: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de los filtros
  const [selectedReader, setSelectedReader] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');

  // Estados de exportación
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  // Notificaciones internas
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cargar catálogos de filtro
  useEffect(() => {
    async function loadFilterCatalogs() {
      try {
        const [readersData, supervisorsData] = await Promise.all([
          getReaders(),
          getSupervisors(),
        ]);
        setReaders(readersData);
        setSupervisors(supervisorsData);
      } catch (err) {
        console.error('Error al cargar filtros del historial:', err);
      }
    }
    loadFilterCatalogs();
  }, []);

  // Consultar historial filtrado
  const loadHistory = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getHistory({
        readerId: selectedReader || undefined,
        date: selectedDate || undefined,
        photoType: selectedType || undefined,
        uploaderId: selectedSupervisor || undefined,
      });
      setRecords(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedReader, selectedDate, selectedType, selectedSupervisor, refreshSignal]);

  const handleResetFilters = () => {
    setSelectedReader('');
    setSelectedDate('');
    setSelectedType('');
    setSelectedSupervisor('');
  };

  // Descarga Masiva ZIP
  const handleDownloadZip = async () => {
    if (records.length === 0) {
      setErrorMsg('No hay fotografías en el historial para descargar.');
      return;
    }

    setDownloadingZip(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const zip = new JSZip();

    try {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const readerName = record.reader?.name || 'DESCONOCIDO';
        const dateStr = record.capture_date;
        const fileExt = record.storage_path.split('.').pop() || 'jpg';

        // Obtener URL firmada
        const signedUrl = await getSignedUrl(record.storage_path);
        
        // Descargar el archivo
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error(`No se pudo descargar la foto de ${readerName}`);
        const blob = await res.blob();

        // Estructura ZIP organizada
        if (record.photo_type === 'APOYO') {
          const parts = record.storage_path.split('/');
          const uuidName = parts[parts.length - 1]; // e.g. uuid.jpg
          zip.folder(readerName)?.folder(dateStr)?.folder('apoyo')?.file(uuidName, blob);
        } else {
          const fileName = `${record.photo_type.toLowerCase()}.${fileExt}`; // entrada.jpg / salida.jpg
          zip.folder(readerName)?.folder(dateStr)?.file(fileName, blob);
        }
      }

      // Generar ZIP y descargar
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `lectores_fotos_${new Date().toISOString().slice(0, 10)}.zip`);
      setSuccessMsg('✅ Descarga del archivo ZIP iniciada correctamente.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Fallo al generar el archivo de descarga: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Sincronización a Carpeta Local de Windows utilizando File System Access API
  const handleLocalFolderSync = async () => {
    if (records.length === 0) {
      setErrorMsg('No hay fotografías en el historial para sincronizar.');
      return;
    }

    // Verificar soporte del navegador
    if (!('showDirectoryPicker' in window)) {
      setErrorMsg(
        'Su navegador o dispositivo no soporta la escritura directa en carpetas del sistema. Por favor use la descarga en ZIP en su lugar.'
      );
      return;
    }

    setSyncingLocal(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSyncProgress('Seleccionando carpeta destino...');

    try {
      // Pedir al usuario seleccionar una carpeta local de destino
      const dirHandle = await (window as any).showDirectoryPicker();
      
      let successCount = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const readerName = record.reader?.name || 'DESCONOCIDO';
        const dateStr = record.capture_date;
        const fileExt = record.storage_path.split('.').pop() || 'jpg';

        setSyncProgress(`Descargando y guardando ${i + 1}/${records.length}: ${readerName}...`);

        // Obtener URL firmada y descargar blob
        const signedUrl = await getSignedUrl(record.storage_path);
        const res = await fetch(signedUrl);
        if (!res.ok) continue;
        const blob = await res.blob();

        // Abrir/Crear estructura de carpetas
        const readerDirHandle = await dirHandle.getDirectoryHandle(readerName, { create: true });
        const dateDirHandle = await readerDirHandle.getDirectoryHandle(dateStr, { create: true });

        if (record.photo_type === 'APOYO') {
          const parts = record.storage_path.split('/');
          const uuidName = parts[parts.length - 1];
          const apoyoDirHandle = await dateDirHandle.getDirectoryHandle('apoyo', { create: true });
          const fileHandle = await apoyoDirHandle.getFileHandle(uuidName, { create: true });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const fileName = `${record.photo_type.toLowerCase()}.${fileExt}`;
          const fileHandle = await dateDirHandle.getFileHandle(fileName, { create: true });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
        
        successCount++;
      }

      setSuccessMsg(`✅ Sincronización local exitosa. Se guardaron ${successCount} archivos en la carpeta seleccionada.`);
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setErrorMsg(`Error durante la sincronización: ${err.message}`);
      }
    } finally {
      setSyncingLocal(false);
      setSyncProgress('');
    }
  };

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <h2 className="card-title">
        <Filter size={18} />
        Historial de Registros
      </h2>

      {/* Alertas */}
      {errorMsg && (
        <div className="alert-banner alert-danger">
          <div>{errorMsg}</div>
        </div>
      )}
      {successMsg && (
        <div className="alert-banner alert-success">
          <div>{successMsg}</div>
        </div>
      )}

      {/* Controles de Filtros */}
      <div className="search-bar-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Lector</label>
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedReader}
              onChange={(e) => setSelectedReader(e.target.value)}
            >
              <option value="">[ Todos los lectores ]</option>
              {readers.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Fecha de Captura</label>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tipo</label>
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">[ Todos los tipos ]</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="APOYO">APOYO</option>
              <option value="SALIDA">SALIDA</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Supervisor</label>
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
            >
              <option value="">[ Todos los supervisores ]</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.email}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button
          className="btn-secondary"
          onClick={handleResetFilters}
          disabled={loading || downloadingZip || syncingLocal}
        >
          Limpiar Filtros
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary"
            onClick={handleLocalFolderSync}
            disabled={loading || downloadingZip || syncingLocal || records.length === 0}
            style={{ borderColor: 'var(--primary)', color: 'var(--text-primary)' }}
          >
            <FolderSync size={16} />
            {syncingLocal ? (syncProgress || 'Sincronizando...') : 'Sincronizar a Carpeta Local'}
          </button>
          
          <button
            className="btn-primary"
            onClick={handleDownloadZip}
            disabled={loading || downloadingZip || syncingLocal || records.length === 0}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <Download size={16} />
            {downloadingZip ? 'Generando ZIP...' : 'Descargar ZIP'}
          </button>
        </div>
      </div>

      {/* Lista del Historial */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando registros del historial...
        </div>
      ) : (
        <>
          {/* Escritorio: Tabla */}
          <div className="desktop-table-view">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Lector</th>
                    <th>Fecha</th>
                    <th>Itinerario</th>
                    <th>Tipo</th>
                    <th>Apoyado a</th>
                    <th>Hora</th>
                    <th>Supervisor</th>
                    <th>Tamaño</th>
                    <th>Fotografía</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron registros en el historial.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 600 }}>{record.reader?.name || 'DESCONOCIDO'}</td>
                        <td>{record.capture_date}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {(record as any).itinerary || '-'}
                        </td>
                        <td>
                          <span className={`badge ${record.photo_type.toLowerCase()}`} style={{
                            backgroundColor: record.photo_type === 'APOYO' ? 'rgba(59, 130, 246, 0.15)' : undefined,
                            color: record.photo_type === 'APOYO' ? '#93c5fd' : undefined
                          }}>
                            {record.photo_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.9rem', color: record.supported_reader ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {record.supported_reader?.name || '-'}
                        </td>
                        <td>{new Date(record.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                        <td style={{ fontSize: '0.85rem' }}>{record.uploader_email || 'Supervisor'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {(record.file_size / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            onClick={() => onViewPhoto(record)}
                          >
                            <Eye size={12} style={{ marginRight: '4px' }} /> Ver Foto
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Móvil: Lista de Tarjetas */}
          <div className="mobile-table-view">
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No se encontraron registros en el historial.
              </div>
            ) : (
              <div className="mobile-card-list">
                {records.map((record) => (
                  <div key={record.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <span className="mobile-card-name">{record.reader?.name || 'DESCONOCIDO'}</span>
                      <span className={`badge ${record.photo_type.toLowerCase()}`} style={{
                        backgroundColor: record.photo_type === 'APOYO' ? 'rgba(59, 130, 246, 0.15)' : undefined,
                        color: record.photo_type === 'APOYO' ? '#93c5fd' : undefined
                      }}>
                        {record.photo_type}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Itinerario:</span>
                      <span className="mobile-card-value" style={{ fontFamily: 'monospace' }}>{(record as any).itinerary || '-'}</span>
                    </div>
                    {record.photo_type === 'APOYO' && (
                      <div className="mobile-card-row">
                        <span>Apoyó a:</span>
                        <span className="mobile-card-value" style={{ color: 'var(--accent-blue)' }}>{record.supported_reader?.name || '-'}</span>
                      </div>
                    )}
                    <div className="mobile-card-row">
                      <span>Fecha / Hora:</span>
                      <span className="mobile-card-value">
                        {record.capture_date} a las {new Date(record.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Supervisor:</span>
                      <span className="mobile-card-value">{record.uploader_email || 'Supervisor'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span>Tamaño de archivo:</span>
                      <span className="mobile-card-value">{(record.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => onViewPhoto(record)}
                      >
                        <ImageIcon size={14} style={{ marginRight: '6px' }} /> Ver Fotografía
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .desktop-table-view { display: block; }
        .mobile-table-view { display: none; }
        
        @media (max-width: 768px) {
          .desktop-table-view { display: none; }
          .mobile-table-view { display: block; }
        }
      `}</style>
    </div>
  );
};
