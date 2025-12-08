// src/components/Dashboard/MedicalDashboard.jsx
import React, { useState } from 'react';

const MedicalDashboard = ({ user, onLogout }) => {
  // CORRIGÉ : on garde bien le setter pour que les onglets soient interactifs
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Consultations', value: '24', icon: 'Clipboard', color: '#3b82f6' },
    { label: 'Patients', value: '156', icon: 'People', color: '#10b981' },
    { label: 'Ordonnances', value: '89', icon: 'Pill', color: '#f59e0b' },
    { label: 'Alertes', value: '3', icon: 'Warning', color: '#ef4444' }
  ];

  const recentPatients = [
    { name: 'Marie Dupont', age: 45, lastVisit: '2024-12-05', status: 'stable' },
    { name: 'Jean Martin', age: 62, lastVisit: '2024-12-04', status: 'suivi' },
    { name: 'Sophie Laurent', age: 34, lastVisit: '2024-12-03', status: 'stable' }
  ];

  const appointments = [
    { time: '09:00', patient: 'Paul Bernard', type: 'Consultation' },
    { time: '10:30', patient: 'Claire Dubois', type: 'Suivi' },
    { time: '14:00', patient: 'Marc Petit', type: 'Urgence' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Dashboard Médical
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>Dr. Utilisateur</p>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              margin: 0, 
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {user?.did ? `${user.did.substring(0, 20)}...` : 'DID non chargé'}
            </p>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 2rem'
      }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'patients', label: 'Patients' },
            { id: 'calendar', label: 'Agenda' },
            { id: 'reports', label: 'Rapports' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
                color: activeTab === tab.id ? '#4f46e5' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '700' : '600',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '0.5rem',
                background: stat.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{stat.label}</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Recent Patients */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Patients Récents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentPatients.map((patient, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '600', margin: 0 }}>{patient.name}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '4px 0 0' }}>
                      {patient.age} ans • Dernière visite : {patient.lastVisit}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: patient.status === 'stable' ? '#dcfce7' : '#fef3c7',
                    color: patient.status === 'stable' ? '#166534' : '#78350f'
                  }}>
                    {patient.status === 'stable' ? 'Stable' : 'Suivi'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Appointments */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Rendez-vous du jour
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {appointments.map((apt, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    borderLeft: '4px solid #4f46e5'
                  }}
                >
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4f46e5', margin: 0 }}>
                    {apt.time}
                  </p>
                  <p style={{ fontWeight: '600', margin: '0.25rem 0 0.5rem' }}>{apt.patient}</p>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>{apt.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MedicalDashboard;