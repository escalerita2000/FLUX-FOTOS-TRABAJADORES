import React, { useState } from 'react';
import type { ReaderDailyStatus, PhotoRecord } from '../types';
import { Eye, Check, X, FileImage } from 'lucide-react';

interface DailyControlProps {
  dailyStatuses: ReaderDailyStatus[];
  loading: boolean;
  onViewPhoto: (record: PhotoRecord) => void;
}

export const DailyControl: React.FC<DailyControlProps> = ({ dailyStatuses, loading, onViewPhoto }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar lectores por nombre (solo ayuda de búsqueda en el panel de control)
  const filteredStatuses = dailyStatuses.filter((status) =>
    status.reader.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">Control del Día</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Cargando registros del día...
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
          Control del Día
        </h2>
        {/* Campo de búsqueda interno para auditar */}
        <input
          type="text"
          className="form-input"
          placeholder="Buscar lector..."
          style={{ maxWidth: '240px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vista de Escritorio - Tabla */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Lector</th>
              <th>Itinerario</th>
              <th>Entrada</th>
              <th>Hora E.</th>
              <th>Supervisor E.</th>
              <th>Apoyos</th>
              <th>Salida</th>
              <th>Hora S.</th>
              <th>Supervisor S.</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredStatuses.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron lectores.
                </td>
              </tr>
            ) : (
              filteredStatuses.map(({ reader, itinerary, entradaRecord, salidaRecord, apoyoRecords }) => (
                <tr key={reader.id}>
                  <td style={{ fontWeight: 600 }}>{reader.name}</td>
                  
                  {/* Itinerario */}
                  <td>
                    {itinerary ? (
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {itinerary}
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                        Falta
                      </span>
                    )}
                  </td>

                  {/* Entrada */}
                  <td>
                    {entradaRecord ? (
                      <span className="badge entrada" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0' }}>
                        Registrada
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    {entradaRecord 
                      ? new Date(entradaRecord.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) 
                      : '-'
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {entradaRecord?.uploader_email ? entradaRecord.uploader_email.split('@')[0] : '-'}
                  </td>

                  {/* Apoyos */}
                  <td>
                    {apoyoRecords.length > 0 ? (
                      <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontWeight: 600 }} title={apoyoRecords.map((a, i) => `Apoyo ${i+1}: a ${a.supported_reader?.name}`).join('\n')}>
                        {apoyoRecords.length} Apoyo(s)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>

                  {/* Salida */}
                  <td>
                    {salidaRecord ? (
                      <span className="badge salida" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0' }}>
                        Registrada
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    {salidaRecord 
                      ? new Date(salidaRecord.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) 
                      : '-'
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {salidaRecord?.uploader_email ? salidaRecord.uploader_email.split('@')[0] : '-'}
                  </td>

                  {/* Acciones */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {entradaRecord && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => onViewPhoto(entradaRecord)}
                          title="Ver Entrada"
                        >
                          <Eye size={12} /> E
                        </button>
                      )}
                      {apoyoRecords.map((apoyo, idx) => (
                        <button
                          key={apoyo.id}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--accent-blue)', color: '#93c5fd' }}
                          onClick={() => onViewPhoto(apoyo)}
                          title={`Ver Apoyo ${idx + 1} a ${apoyo.supported_reader?.name}`}
                        >
                          <Eye size={12} /> A{idx + 1}
                        </button>
                      ))}
                      {salidaRecord && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => onViewPhoto(salidaRecord)}
                          title="Ver Salida"
                        >
                          <Eye size={12} /> S
                        </button>
                      )}
                      {!entradaRecord && !salidaRecord && apoyoRecords.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vista de Móvil - Lista de Tarjetas */}
      <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredStatuses.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
            No se encontraron lectores.
          </div>
        ) : (
          filteredStatuses.map(({ reader, itinerary, entradaRecord, salidaRecord, apoyoRecords }) => (
            <div key={reader.id} className="mobile-card">
              <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mobile-card-name" style={{ fontSize: '0.95rem' }}>{reader.name}</span>
                {itinerary ? (
                  <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {itinerary}
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', fontSize: '0.8rem' }}>
                    Falta Itin.
                  </span>
                )}
              </div>
              
              {/* Entrada */}
              <div className="mobile-card-row">
                <span>Entrada:</span>
                <span className="mobile-card-value">
                  {entradaRecord ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={14} /> Registrada ({new Date(entradaRecord.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <X size={14} /> Pendiente
                    </span>
                  )}
                </span>
              </div>

              {entradaRecord && (
                <div className="mobile-card-row" style={{ fontSize: '0.8rem', paddingLeft: '1rem' }}>
                  <span>Subido por:</span>
                  <span className="mobile-card-value">{entradaRecord.uploader_email}</span>
                </div>
              )}

              {/* Apoyos */}
              {apoyoRecords.length > 0 && (
                <div className="mobile-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                  <span style={{ color: '#93c5fd', fontWeight: 600 }}>Apoyos realizados: {apoyoRecords.length}</span>
                  <div style={{ width: '100%', paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {apoyoRecords.map((apoyo, idx) => (
                      <div key={apoyo.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>A{idx + 1} a {apoyo.supported_reader?.name?.split(' ')[0]}</span>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem', borderColor: 'var(--accent-blue)' }} 
                          onClick={() => onViewPhoto(apoyo)}
                        >
                          Ver Foto
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salida */}
              <div className="mobile-card-row">
                <span>Salida:</span>
                <span className="mobile-card-value">
                  {salidaRecord ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={14} /> Registrada ({new Date(salidaRecord.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <X size={14} /> Pendiente
                    </span>
                  )}
                </span>
              </div>

              {salidaRecord && (
                <div className="mobile-card-row" style={{ fontSize: '0.8rem', paddingLeft: '1rem' }}>
                  <span>Subido por:</span>
                  <span className="mobile-card-value">{salidaRecord.uploader_email}</span>
                </div>
              )}

              {/* Botones de Ver Foto Entrada/Salida para Móvil */}
              {(entradaRecord || salidaRecord) && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  {entradaRecord && (
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', padding: '0.4rem' }}
                      onClick={() => onViewPhoto(entradaRecord)}
                    >
                      <FileImage size={14} /> Ver Entrada
                    </button>
                  )}
                  {salidaRecord && (
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', padding: '0.4rem' }}
                      onClick={() => onViewPhoto(salidaRecord)}
                    >
                      <FileImage size={14} /> Ver Salida
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .table-responsive { display: block !important; }
          .mobile-only-cards { display: none !important; }
        }
        @media (max-width: 767px) {
          .table-responsive { display: none !important; }
          .mobile-only-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
