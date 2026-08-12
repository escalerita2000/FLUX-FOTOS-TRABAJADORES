import React, { useState, useEffect } from 'react';
import type { Reader, PhotoRecord } from '../types';
import { getMonthlyMatrixData } from '../services/db';
import { Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyControlProps {
  currentDateStr: string; // YYYY-MM-DD
}

export const MonthlyControl: React.FC<MonthlyControlProps> = ({ currentDateStr }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM
  const [readers, setReaders] = useState<Reader[]>([]);
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Vista para móvil: Lector seleccionado para ver su calendario mensual
  const [mobileSelectedReaderId, setMobileSelectedReaderId] = useState<string>('');

  // Inicializar con el mes actual en America/Bogota
  useEffect(() => {
    if (currentDateStr) {
      setSelectedMonth(currentDateStr.substring(0, 7)); // YYYY-MM
    }
  }, [currentDateStr]);

  // Cargar datos al cambiar de mes o recibir señal
  const loadData = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { readers: dbReaders, records: dbRecords } = await getMonthlyMatrixData(selectedMonth);
      setReaders(dbReaders);
      setRecords(dbRecords);
      if (dbReaders.length > 0 && !mobileSelectedReaderId) {
        setMobileSelectedReaderId(dbReaders[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('No se pudieron cargar los datos de cobertura mensual.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // Navegación de mes
  const handlePrevMonth = () => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevMonthStr);
  };

  const handleNextMonth = () => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  // Calcular días en el mes seleccionado
  const getDaysInMonth = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  };

  const days = getDaysInMonth();
  const [yearNum, monthNum] = selectedMonth ? selectedMonth.split('-').map(Number) : [0, 0];

  // Organizar registros indexados por reader_id y capture_date
  const recordsMap = React.useMemo(() => {
    const map: Record<string, Record<string, { entrada?: PhotoRecord; salida?: PhotoRecord; apoyos: PhotoRecord[] }>> = {};
    
    readers.forEach(r => {
      map[r.id] = {};
    });

    records.forEach(rec => {
      const rId = rec.reader_id;
      const date = rec.capture_date;
      if (!map[rId]) map[rId] = {};
      if (!map[rId][date]) map[rId][date] = { apoyos: [] };
      if (!map[rId][date].apoyos) map[rId][date].apoyos = [];
      
      if (rec.photo_type === 'ENTRADA') map[rId][date].entrada = rec;
      if (rec.photo_type === 'SALIDA') map[rId][date].salida = rec;
      if (rec.photo_type === 'APOYO') map[rId][date].apoyos.push(rec);
    });

    return map;
  }, [readers, records]);

  // Formatear nombre de mes largo en español
  const getMonthLongName = () => {
    if (!selectedMonth) return '';
    const date = new Date(yearNum, monthNum - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // Determinar los estados para cada día del mes
  const getDayStatus = (readerId: string, day: number) => {
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const dayRecords = recordsMap[readerId]?.[dayStr] || { apoyos: [] };
    
    const hasEntrada = !!dayRecords.entrada;
    const hasSalida = !!dayRecords.salida;
    const hasApoyo = dayRecords.apoyos && dayRecords.apoyos.length > 0;

    let overall = 'futuro'; // por defecto
    if (dayStr < currentDateStr) {
      overall = (hasEntrada && hasSalida) ? 'completo' : 'falta';
    } else if (dayStr === currentDateStr) {
      overall = (hasEntrada && hasSalida) ? 'completo' : 'hoy-pendiente';
    }

    return {
      hasEntrada,
      hasSalida,
      hasApoyo,
      apoyosCount: dayRecords.apoyos ? dayRecords.apoyos.length : 0,
      overall
    };
  };

  // Estadísticas del mes para el panel
  const monthlyStats = React.useMemo(() => {
    if (!selectedMonth || readers.length === 0) return null;
    
    let totalPhotos = records.length;
    let totalEntradas = records.filter(r => r.photo_type === 'ENTRADA').length;
    let totalSalidas = records.filter(r => r.photo_type === 'SALIDA').length;
    let totalApoyos = records.filter(r => r.photo_type === 'APOYO').length;

    // Calcular días con algún registro
    const uniqueDays = new Set(records.map(r => r.capture_date));
    const processedDays = uniqueDays.size;

    // Lectores completos en el mes (tienen entrada y salida en todos los días del mes hasta hoy)
    let completedCount = 0;
    
    readers.forEach(reader => {
      let completeAllDays = true;
      let hasAnyActivity = false;

      // Solo evaluamos desde el día 1 hasta el día actual del mes (o fin de mes si es un mes pasado)
      const maxDayToEvaluate = selectedMonth === currentDateStr.substring(0, 7) 
        ? Number(currentDateStr.substring(8, 10)) 
        : days.length;

      for (let d = 1; d <= maxDayToEvaluate; d++) {
        const dayStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        const dayData = recordsMap[reader.id]?.[dayStr];
        
        if (dayData) {
          hasAnyActivity = true;
        }

        if (!dayData?.entrada || !dayData?.salida) {
          completeAllDays = false;
        }
      }

      if (hasAnyActivity && completeAllDays) {
        completedCount++;
      }
    });

    return {
      totalPhotos,
      totalEntradas,
      totalSalidas,
      totalApoyos,
      processedDays,
      completedCount,
      pendingCount: readers.length - completedCount
    };
  }, [readers, records, selectedMonth, currentDateStr, days, recordsMap]);

  // Generar cuadrícula de calendario para la vista móvil de un lector
  const renderMobileCalendar = () => {
    if (!selectedMonth || !mobileSelectedReaderId) return null;

    // Obtener primer día del mes para calcular offset
    const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay(); // 0 = Dom, 1 = Lun...
    // Ajustar a 0 = Lun, 6 = Dom
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const weekdayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
      <div className="mobile-matrix-selector">
        <div className="form-group">
          <label className="form-label" htmlFor="mobile-reader-select">SELECCIONAR LECTOR</label>
          <div className="custom-select-wrapper">
            <select
              id="mobile-reader-select"
              className="custom-select"
              value={mobileSelectedReaderId}
              onChange={(e) => setMobileSelectedReaderId(e.target.value)}
            >
              {readers.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ background: 'rgba(9, 10, 15, 0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {weekdayNames.map((name, i) => <div key={i}>{name}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
            {/* Espacios vacíos antes del día 1 */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: '1' }}></div>
            ))}

            {/* Días del mes */}
            {days.map(day => {
              const { hasEntrada, hasSalida, hasApoyo, apoyosCount, overall } = getDayStatus(mobileSelectedReaderId, day);
              const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
              const isToday = dayStr === currentDateStr;

              return (
                <div 
                  key={day} 
                  className={`mobile-matrix-day ${overall} ${isToday ? 'hoy' : ''}`}
                  title={`${dayStr}: Entrada: ${hasEntrada ? 'SÍ' : 'NO'}, Salida: ${hasSalida ? 'SÍ' : 'NO'}, Apoyos: ${apoyosCount}`}
                >
                  <span style={{ fontWeight: isToday ? 800 : 500, fontSize: '0.85rem' }}>{day}</span>
                  <div className="mobile-matrix-dots" style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
                    <span className={`mobile-matrix-dot ${
                      hasEntrada ? 'completo' : (overall === 'futuro' ? 'futuro' : (overall === 'hoy-pendiente' ? 'pendiente' : 'falta'))
                    }`} title="Entrada" />
                    {hasApoyo && (
                      <span className="mobile-matrix-dot" style={{ backgroundColor: 'var(--accent-blue)' }} title={`Apoyo (${apoyosCount})`} />
                    )}
                    <span className={`mobile-matrix-dot ${
                      hasSalida ? 'completo' : (overall === 'futuro' ? 'futuro' : (overall === 'hoy-pendiente' ? 'pendiente' : 'falta'))
                    }`} title="Salida" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
          <Calendar size={18} />
          Cobertura Mensual de Fotografías
        </h2>
        
        {/* Selector de Mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handlePrevMonth} disabled={loading}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '130px', textAlign: 'center' }}>
            {getMonthLongName()}
          </span>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleNextMonth} disabled={loading}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={16} />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Resumen de Estadísticas Mensuales */}
      {monthlyStats && (
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="stat-card" style={{ padding: '1rem' }}>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>{monthlyStats.totalPhotos}</span>
              <span className="stat-title" style={{ fontSize: '0.7rem' }}>Fotos Subidas</span>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem' }}>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>{monthlyStats.processedDays}</span>
              <span className="stat-title" style={{ fontSize: '0.7rem' }}>Días Procesados</span>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem' }}>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--success)' }}>{monthlyStats.completedCount}</span>
              <span className="stat-title" style={{ fontSize: '0.7rem' }}>Lectores Completos</span>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem' }}>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--danger)' }}>{monthlyStats.pendingCount}</span>
              <span className="stat-title" style={{ fontSize: '0.7rem' }}>Lectores Incompletos</span>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem' }}>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-blue)' }}>{monthlyStats.totalApoyos}</span>
              <span className="stat-title" style={{ fontSize: '0.7rem' }}>Apoyos Realizados</span>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda de la Matriz */}
      <div className="legend-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span className="matrix-indicator-dot completo" style={{ width: '10px', height: '10px' }} />
          <span>🟢 Completo (Entrada + Salida registradas)</span>
        </div>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span className="matrix-indicator-dot falta" style={{ width: '10px', height: '10px' }} />
          <span>🔴 Falta (Falta una o ambas en días pasados)</span>
        </div>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span className="matrix-indicator-dot hoy-pendiente" style={{ width: '10px', height: '10px' }} />
          <span>🟡 Día Actual (Pendiente hoy)</span>
        </div>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--accent-blue)', borderRadius: '50%' }} />
          <span>🔵 Apoyo Realizado (A)</span>
        </div>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span className="matrix-indicator-dot futuro" style={{ width: '10px', height: '10px' }} />
          <span>⚫ Futuro</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando matriz de cobertura...
        </div>
      ) : (
        <>
          {/* Vista Escritorio: Tabla de Matriz Completa */}
          <div className="desktop-matrix-view">
            <div className="matrix-scroll-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px', backgroundColor: 'rgba(22, 26, 43, 0.95)' }}>Lector</th>
                    {days.map(day => (
                      <th key={day} className="matrix-day-header">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {readers.length === 0 ? (
                    <tr>
                      <td colSpan={days.length + 1} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay lectores cargados en el catálogo.
                      </td>
                    </tr>
                  ) : (
                    readers.map(reader => (
                      <tr key={reader.id}>
                        <td>{reader.name}</td>
                        {days.map(day => {
                          const { hasEntrada, hasSalida, hasApoyo, apoyosCount, overall } = getDayStatus(reader.id, day);
                          let titleText = `Día ${day}: Futuro`;
                          
                          if (overall === 'completo') {
                            titleText = `Día ${day}: Entrada registrada y Salida registrada`;
                          } else if (overall === 'falta') {
                            titleText = `Día ${day}: Faltan registros. Entrada: ${hasEntrada ? 'Sí' : 'NO'}, Salida: ${hasSalida ? 'Sí' : 'NO'}`;
                          } else if (overall === 'hoy-pendiente') {
                            titleText = `Día ${day} (Hoy): Entrada: ${hasEntrada ? 'Sí' : 'NO'}, Salida: ${hasSalida ? 'Sí' : 'NO'}`;
                          }

                          if (hasApoyo) {
                            titleText += `. Con ${apoyosCount} apoyo(s) realizado(s)`;
                          }

                          return (
                            <td key={day} title={titleText} style={{ padding: '0.4rem 0.25rem' }}>
                              <div className="matrix-cell-indicators">
                                <span className={`matrix-indicator-dot ${overall}`}>
                                  {overall === 'completo' ? '✓' : (overall === 'falta' ? '!' : (overall === 'hoy-pendiente' ? '?' : ''))}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', gap: '1px', opacity: overall === 'futuro' ? 0.3 : 1 }}>
                                  <span style={{ color: hasEntrada ? 'var(--success)' : 'var(--danger)' }}>E:{hasEntrada ? '✓' : '✗'}</span>
                                  {hasApoyo && <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>A:{apoyosCount}</span>}
                                  <span style={{ color: hasSalida ? 'var(--success)' : 'var(--danger)' }}>S:{hasSalida ? '✓' : '✗'}</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Móvil: Selector y Calendario Individual por Lector */}
          <div className="mobile-matrix-view">
            {renderMobileCalendar()}
          </div>
        </>
      )}

      <style>{`
        .desktop-matrix-view { display: block; }
        .mobile-matrix-view { display: none; }
        
        @media (max-width: 900px) {
          .desktop-matrix-view { display: none; }
          .mobile-matrix-view { display: block; }
        }
      `}</style>
    </div>
  );
};
