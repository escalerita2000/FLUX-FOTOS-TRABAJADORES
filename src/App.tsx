import { useState, useEffect } from 'react';
import { supabase } from './supabase/client';
import { LoginForm } from './components/LoginForm';
import { DashboardStats } from './components/DashboardStats';
import { PhotoUploadForm } from './components/PhotoUploadForm';
import { DailyControl } from './components/DailyControl';
import { MonthlyControl } from './components/MonthlyControl';
import { HistoryPanel } from './components/HistoryPanel';
import { getDailySummary, getDailyStatus, getBogotaDateFromServer, getSignedUrl } from './services/db';
import type { DailySummary, ReaderDailyStatus, PhotoRecord } from './types';
import { LogOut, CloudOff, RefreshCw, X, FileImage, ShieldCheck } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<'upload' | 'daily' | 'monthly' | 'history'>('upload');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Datos del día
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [dailyStats, setDailyStats] = useState<DailySummary | null>(null);
  const [dailyStatuses, setDailyStatuses] = useState<ReaderDailyStatus[]>([]);
  const [loadingDailyData, setLoadingDailyData] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Modal de previsualización de foto
  const [selectedPreviewRecord, setSelectedPreviewRecord] = useState<PhotoRecord | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [loadingPreviewImage, setLoadingPreviewImage] = useState(false);

  // Escuchar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obtener fecha del servidor y cargar estadísticas diarias
  useEffect(() => {
    if (!session) return;

    async function initializeDate() {
      const date = await getBogotaDateFromServer();
      setCurrentDateStr(date);
    }
    
    initializeDate();
  }, [session, refreshSignal]);

  // Cargar estadísticas y estados de hoy
  useEffect(() => {
    if (!session || !currentDateStr) return;

    async function loadDailyData() {
      setLoadingDailyData(true);
      try {
        const [stats, statuses] = await Promise.all([
          getDailySummary(currentDateStr),
          getDailyStatus(currentDateStr)
        ]);
        setDailyStats(stats);
        setDailyStatuses(statuses);
      } catch (err) {
        console.error('Error al cargar datos diarios:', err);
      } finally {
        setLoadingDailyData(false);
      }
    }

    loadDailyData();
  }, [session, currentDateStr, refreshSignal]);

  // Manejar cierre de sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Cargar imagen para el modal de previsualización
  const handleOpenPreviewModal = async (record: PhotoRecord) => {
    setSelectedPreviewRecord(record);
    setLoadingPreviewImage(true);
    setPreviewImageUrl('');
    try {
      const url = await getSignedUrl(record.storage_path);
      setPreviewImageUrl(url);
    } catch (err) {
      console.error('Error cargando la foto:', err);
    } finally {
      setLoadingPreviewImage(false);
    }
  };

  const handleClosePreviewModal = () => {
    setSelectedPreviewRecord(null);
    setPreviewImageUrl('');
  };

  const isConfigured = 
    !!import.meta.env.VITE_SUPABASE_URL && 
    !!import.meta.env.VITE_SUPABASE_ANON_KEY && 
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== '';

  if (!isConfigured) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', padding: '1.5rem' }}>
        <div className="login-card" style={{ textAlign: 'center', maxWidth: '500px' }}>
          <h1 className="login-logo" style={{ color: 'var(--danger)', fontSize: '1.5rem', marginBottom: '1rem' }}>CONFIGURACIÓN PENDIENTE</h1>
          <p style={{ margin: '1rem 0 1.5rem', color: 'var(--text-secondary)' }}>
            Supabase todavía no está configurado.
          </p>
          <div className="alert-banner alert-warning" style={{ textAlign: 'left', display: 'block' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Para solucionar esto:</p>
            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
              <li style={{ marginBottom: '0.25rem' }}>Asegúrate de que exista el archivo <strong>.env</strong> en la raíz del proyecto.</li>
              <li style={{ marginBottom: '0.25rem' }}>Define <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> con tus credenciales.</li>
              <li>Reinicia el servidor de desarrollo (<code>npm run dev</code>).</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Verificando credenciales...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm onLoginSuccess={() => setRefreshSignal(prev => prev + 1)} />;
  }

  return (
    <div className="app-container">
      {/* Encabezado */}
      <header className="app-header">
        <h1 className="app-title">
          <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
          LECTORES FOTOS
        </h1>
        
        <div className="header-actions">
          <span className="hide-on-mobile" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {session.user.email}
          </span>
          <button className="btn-secondary" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut size={16} />
            <span className="hide-on-mobile">Salir</span>
          </button>
        </div>
      </header>

      {/* Banner de estado de conexión */}
      {!isOnline && (
        <div className="alert-banner alert-danger" style={{ borderRadius: 0, margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CloudOff size={16} />
          <span>Sin conexión. Las funciones de carga y consulta están suspendidas temporalmente.</span>
        </div>
      )}

      {/* Área Principal */}
      <main className="app-main">
        {/* Pestañas de Navegación */}
        <div className="tabs-header">
          <button 
            className={`tab-btn ${currentTab === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentTab('upload')}
          >
            Registrar Foto
          </button>
          <button 
            className={`tab-btn ${currentTab === 'daily' ? 'active' : ''}`}
            onClick={() => setCurrentTab('daily')}
          >
            Control del Día
          </button>
          <button 
            className={`tab-btn ${currentTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setCurrentTab('monthly')}
          >
            Cobertura Mensual
          </button>
          <button 
            className={`tab-btn ${currentTab === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentTab('history')}
          >
            Historial General
          </button>
        </div>

        {/* Contenido según pestaña */}
        {currentTab === 'upload' && (
          <div>
            <DashboardStats stats={dailyStats} loading={loadingDailyData} />
            <div className="main-layout" style={{ marginTop: '1rem' }}>
              <PhotoUploadForm 
                currentDateStr={currentDateStr} 
                onUploadSuccess={() => setRefreshSignal(prev => prev + 1)} 
              />
              <DailyControl 
                dailyStatuses={dailyStatuses} 
                loading={loadingDailyData} 
                onViewPhoto={handleOpenPreviewModal}
              />
            </div>
          </div>
        )}

        {currentTab === 'daily' && (
          <div>
            <DashboardStats stats={dailyStats} loading={loadingDailyData} />
            <div style={{ marginTop: '1rem' }}>
              <DailyControl 
                dailyStatuses={dailyStatuses} 
                loading={loadingDailyData} 
                onViewPhoto={handleOpenPreviewModal}
              />
            </div>
          </div>
        )}

        {currentTab === 'monthly' && (
          <MonthlyControl currentDateStr={currentDateStr} />
        )}

        {currentTab === 'history' && (
          <HistoryPanel onViewPhoto={handleOpenPreviewModal} refreshSignal={refreshSignal} />
        )}
      </main>

      {/* Modal de Previsualización Seguro */}
      {selectedPreviewRecord && (
        <div className="modal-overlay" onClick={handleClosePreviewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Fotografía Registrada</h3>
              <button className="modal-close" onClick={handleClosePreviewModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingPreviewImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '250px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                  <p>Cargando enlace seguro...</p>
                </div>
              ) : (
                <>
                  {previewImageUrl ? (
                    <img src={previewImageUrl} alt="Fotografía del medidor" className="modal-img-full" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                      <FileImage size={32} style={{ marginBottom: '0.5rem' }} />
                      <p>No se pudo recuperar la fotografía</p>
                    </div>
                  )}
                  
                  <div className="modal-info-grid">
                    <div className="modal-info-item">
                      <span className="modal-info-label">Lector</span>
                      <span>{selectedPreviewRecord.reader?.name || 'DESCONOCIDO'}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Tipo</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: selectedPreviewRecord.photo_type === 'ENTRADA' 
                          ? '#a5b4fc' 
                          : selectedPreviewRecord.photo_type === 'SALIDA' 
                            ? '#fde68a' 
                            : '#93c5fd' 
                      }}>
                        {selectedPreviewRecord.photo_type}
                      </span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Fecha de Registro</span>
                      <span>{selectedPreviewRecord.capture_date}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Hora</span>
                      <span>{new Date(selectedPreviewRecord.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                    </div>
                    {selectedPreviewRecord.photo_type === 'APOYO' && selectedPreviewRecord.supported_reader && (
                      <div className="modal-info-item" style={{ gridColumn: 'span 2' }}>
                        <span className="modal-info-label">Apoyando a</span>
                        <span style={{ color: '#93c5fd', fontWeight: 600 }}>{selectedPreviewRecord.supported_reader.name}</span>
                      </div>
                    )}
                    <div className="modal-info-item" style={{ gridColumn: 'span 2' }}>
                      <span className="modal-info-label">Subido por</span>
                      <span>{selectedPreviewRecord.uploader_email || 'Supervisor'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reglas de animación CSS extra */}
      <style>{`
        .spin {
          animation: spin-anim 1.5s linear infinite;
        }
        @keyframes spin-anim {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Reglas adaptables auxiliares */
        @media (max-width: 576px) {
          .app-header { padding: 0.75rem 1rem; }
          .app-main { padding: 1rem; }
          .tab-btn { padding: 0.5rem 0.75rem; font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}

export default App;
