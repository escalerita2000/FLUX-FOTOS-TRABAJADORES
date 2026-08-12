import React from 'react';
import type { DailySummary } from '../types';
import { Users, LogIn, LogOut, CheckCircle, Clock, Activity, ClipboardList } from 'lucide-react';

interface DashboardStatsProps {
  stats: DailySummary | null;
  loading: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="dashboard-grid">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="stat-card" style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--border-color)' }}></div>
            <div className="stat-info">
              <div className="stat-value" style={{ height: '24px', width: '60px', backgroundColor: 'var(--border-color)', borderRadius: '4px' }}></div>
              <div className="stat-title" style={{ height: '12px', width: '80px', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginTop: '6px' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
      <div className="stat-card">
        <div className="stat-icon primary">
          <Users size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem' }}>{stats.totalReaders}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Lectores Totales</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon primary">
          <LogIn size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem' }}>{stats.entradasCount}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Entradas Registradas</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon warning">
          <LogOut size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem' }}>{stats.salidasCount}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Salidas Registradas</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon success">
          <CheckCircle size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--success)' }}>{stats.completedCount}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Lectores Completos</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon danger">
          <Clock size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>{stats.pendingCount}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Lectores Pendientes</span>
        </div>
      </div>

      <div className="stat-card" style={{ borderColor: 'var(--accent-blue)' }}>
        <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
          <Activity size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem', color: '#93c5fd' }}>{stats.apoyosCount || 0}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Apoyos Realizados</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
          <ClipboardList size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value" style={{ fontSize: '1.25rem', color: '#c084fc' }}>{stats.itinerariosCount || 0}</span>
          <span className="stat-title" style={{ fontSize: '0.75rem' }}>Itinerarios Hechos</span>
        </div>
      </div>
    </div>
  );
};
