import React, { useState } from 'react';
import { ethers } from 'ethers';

// ========== PAGE DE LOGIN ==========
const LoginPage = ({ onLoginSuccess }) => {
  const [wallets, setWallets] = useState([]);
  const [did, setDid] = useState('');
  const [quorum, setQuorum] = useState(2);
  const [step, setStep] = useState('setup');
  const [challenge, setChallenge] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';

  const generateWallets = async () => {
    setLoading(true);
    setError('');
    try {
      const generatedWallets = Array.from({ length: 3 }, (_, i) => {
        const wallet = ethers.Wallet.createRandom();
        return {
          id: `key${i + 1}`,
          address: wallet.address,
          privateKey: wallet.privateKey,
          wallet: wallet
        };
      });
      
      setWallets(generatedWallets);
      setDid(`did:eth:${generatedWallets[0].address}`);
      setMessage('✅ 3 wallets Ethereum générés avec succès');
    } catch (err) {
      setError('Erreur lors de la génération des wallets: ' + err.message);
    }
    setLoading(false);
  };

  const registerDID = async () => {
    if (wallets.length === 0) {
      setError('Générez d\'abord des wallets');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did,
          publicKeys: wallets.map(w => ({ id: w.id, key: w.address })),
          quorum
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setStep('login');
      } else {
        setError(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur: ' + err.message);
    }
    setLoading(false);
  };

  const requestChallenge = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/auth/challenge/${encodeURIComponent(did)}`);
      const data = await response.json();
      
      if (response.ok) {
        setChallenge(data.challenge);
        setMessage(`Challenge reçu: ${data.challenge.substring(0, 20)}...`);
      } else {
        setError(data.error || 'DID non trouvé');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur: ' + err.message);
    }
    setLoading(false);
  };

  const signAndVerify = async () => {
    if (!challenge) {
      setError('Demandez d\'abord un challenge');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const signatures = await Promise.all(
        wallets.slice(0, quorum).map(async (w) => {
          const wallet = new ethers.Wallet(w.privateKey);
          const signature = await wallet.signMessage(challenge);
          return {
            keyId: w.id,
            signature: signature
          };
        })
      );

      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did,
          signatures
        })
      });

      const data = await response.json();
      
      if (response.ok && data.authenticated) {
        setMessage(`🎉 Authentifié! ${data.message}`);
        // Redirection vers le dashboard après 1 seconde
        setTimeout(() => {
          onLoginSuccess({ did, wallets });
        }, 1000);
      } else {
        setError(data.reason || 'Authentification échouée');
      }
    } catch (err) {
      setError('Erreur lors de la signature/vérification: ' + err.message);
    }
    setLoading(false);
  };

  const exportWallets = () => {
    const dataStr = JSON.stringify(wallets.map(w => ({
      id: w.id,
      address: w.address,
      privateKey: w.privateKey
    })), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'wallets-backup.json');
    linkElement.click();
  };

  const importWallets = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Valider le format
        if (!Array.isArray(importedData) || importedData.length !== 3) {
          setError('Format de fichier invalide. 3 wallets requis.');
          return;
        }

        // Recréer les objets wallet avec ethers.js
        const recreatedWallets = importedData.map(w => {
          const wallet = new ethers.Wallet(w.privateKey);
          return {
            id: w.id,
            address: w.address,
            privateKey: w.privateKey,
            wallet: wallet
          };
        });

        setWallets(recreatedWallets);
        setDid(`did:eth:${recreatedWallets[0].address}`);
        setMessage('✅ Wallets importés avec succès!');
        setError('');
      } catch (err) {
        setError('Erreur lors de l\'import: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Connexion Sécurisée
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>Authentification décentralisée DID</p>
            </div>
          </div>

          {message && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.5rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p style={{ color: '#166534', margin: 0 }}>{message}</p>
            </div>
          )}

          {error && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
            </div>
          )}

          {step === 'setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                  Étape 1: Génération des wallets
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Générez 3 nouveaux wallets Ethereum ou importez des wallets existants.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={generateWallets}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: loading ? '#9ca3af' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? 'Génération...' : '🔑 Générer les wallets'}
                  </button>
                  
                  <label style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📂 Importer des wallets
                    <input
                      type="file"
                      accept=".json"
                      onChange={importWallets}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {wallets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ 
                    padding: '1rem', 
                    background: '#dbeafe', 
                    border: '1px solid #3b82f6',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af' }}>
                        Wallets chargés
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                      Vos wallets sont maintenant prêts à être utilisés. N'oubliez pas de les exporter pour les sauvegarder !
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Wallets:</h3>
                    <button onClick={exportWallets} style={{
                      padding: '0.5rem 1rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      💾 Exporter
                    </button>
                  </div>
                  
                  {wallets.map((wallet, i) => (
                    <div key={i} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600' }}>{wallet.id}</span>
                      <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280', margin: '0.5rem 0 0 0', wordBreak: 'break-all' }}>
                        {wallet.address}
                      </p>
                    </div>
                  ))}

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                      Quorum requis:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      value={quorum}
                      onChange={(e) => setQuorum(parseInt(e.target.value))}
                      style={{
                        width: '8rem',
                        padding: '0.5rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <button
                    onClick={() => setStep('register')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.5rem',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    Continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Étape 2: Enregistrement
              </h2>
              <div style={{
                padding: '1rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all', margin: 0 }}>
                  {did}
                </p>
              </div>
              <button
                onClick={registerDID}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading ? '#9ca3af' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer le DID'}
              </button>
            </div>
          )}

          {step === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Étape 3: Authentification
              </h2>
              {!challenge ? (
                <button
                  onClick={requestChallenge}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#9ca3af' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Demande...' : 'Demander un challenge'}
                </button>
              ) : (
                <>
                  <div style={{
                    padding: '1rem',
                    background: '#fefce8',
                    border: '1px solid #fde047',
                    borderRadius: '0.5rem'
                  }}>
                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>
                      {challenge}
                    </p>
                  </div>
                  <button
                    onClick={signAndVerify}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: loading ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? 'Signature...' : 'Se connecter'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== DASHBOARD MÉDICAL ==========
const MedicalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Consultations', value: '24', icon: '📋', color: '#3b82f6' },
    { label: 'Patients', value: '156', icon: '👥', color: '#10b981' },
    { label: 'Ordonnances', value: '89', icon: '💊', color: '#f59e0b' },
    { label: 'Alertes', value: '3', icon: '⚠️', color: '#ef4444' }
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
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>
              {user.did.substring(0, 20)}...
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
          {['overview', 'patients', 'calendar', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                color: activeTab === tab ? '#4f46e5' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'overview' ? 'Vue d\'ensemble' : 
               tab === 'patients' ? 'Patients' :
               tab === 'calendar' ? 'Agenda' : 'Rapports'}
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
            <div key={i} style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.5rem',
                background: stat.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{stat.label}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

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
                <div key={i} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontWeight: '600', margin: 0 }}>{patient.name}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                      {patient.age} ans • Dernière visite: {patient.lastVisit}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: patient.status === 'stable' ? '#dcfce7' : '#fef3c7',
                    color: patient.status === 'stable' ? '#166534' : '#78350f'
                  }}>
                    {patient.status}
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
                <div key={i} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #4f46e5'
                }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4f46e5', margin: 0 }}>
                    {apt.time}
                  </p>
                  <p style={{ fontWeight: '600', margin: '0.25rem 0' }}>{apt.patient}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{apt.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ========== APPLICATION PRINCIPALE ==========
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <MedicalDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;