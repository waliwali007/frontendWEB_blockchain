// src/components/LoginPage/LoginPage.jsx
import React, { useState } from 'react';
import { generateWallets, recreateWalletsFromBackup, exportWalletsToFile } from '../../utils/walletUtils';
import { registerDID, requestChallenge, verifySignatures } from '../../services/authApi';
import { ethers } from 'ethers';

const LoginPage = ({ onLoginSuccess }) => {
  const [wallets, setWallets] = useState([]);
  const [did, setDid] = useState('');
  const [quorum, setQuorum] = useState(2);
  const [step, setStep] = useState('setup');
  const [challenge, setChallenge] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handlers corrigés
  const handleGenerateWallets = async () => {
    setLoading(true);
    setError('');
    try {
      const generated = generateWallets();
      setWallets(generated);
      setDid(`did:eth:${generated[0].address}`);
      setMessage('3 wallets Ethereum générés avec succès');
    } catch (err) {
      setError('Erreur lors de la génération: ' + err.message);
    }
    setLoading(false);
  };

  const handleImportWallets = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = recreateWalletsFromBackup(data);
        setWallets(imported);
        setDid(`did:eth:${imported[0].address}`);
        setMessage('Wallets importés avec succès!');
        setError('');
      } catch (err) {
        setError('Erreur lors de l\'import: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleRegister = async () => {
    if (wallets.length === 0) {
      setError('Générez d\'abord des wallets');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const publicKeys = wallets.map(w => ({ id: w.id, key: w.address }));
      const res = await registerDID(did, publicKeys, quorum);
      if (res.message) {
        setMessage(res.message);
        setStep('login');
      } else {
        setError(res.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur');
    }
    setLoading(false);
  };

  const handleRequestChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requestChallenge(did);
      if (data.challenge) {
        setChallenge(data.challenge);
        setMessage(`Challenge reçu: ${data.challenge.substring(0, 20)}...`);
      } else {
        setError(data.error || 'DID non trouvé');
      }
    } catch (err) {
      setError('Erreur serveur');
    }
    setLoading(false);
  };

  const handleSignAndLogin = async () => {
    if (!challenge) {
      setError('Challenge manquant');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const signatures = await Promise.all(
        wallets.slice(0, quorum).map(async (w) => {
          const signature = await new ethers.Wallet(w.privateKey).signMessage(challenge);
          return { keyId: w.id, signature };
        })
      );

      const data = await verifySignatures(did, signatures);
      if (data.authenticated) {
        setMessage(`Authentifié! ${data.message || ''}`);
        setTimeout(() => onLoginSuccess({ did, wallets }), 1000);
      } else {
        setError(data.reason || 'Authentification échouée');
      }
    } catch (err) {
      setError('Erreur lors de la signature: ' + err.message);
    }
    setLoading(false);
  };

  const handleExportWallets = () => {
    if (wallets.length === 0) {
      setError('Aucun wallet à exporter');
      return;
    }
    exportWalletsToFile(wallets);
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
          {/* Header */}
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

          {/* Messages */}
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

          {/* Étape 1: Setup */}
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
                    onClick={handleGenerateWallets}
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
                    {loading ? 'Génération...' : 'Générer les wallets'}
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
                    Importer des wallets
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportWallets}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {wallets.length > 0 && (
                <>
                  <div style={{ padding: '1rem', background: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                      Vos wallets sont chargés. Sauvegardez-les !
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Wallets:</h3>
                    <button onClick={handleExportWallets} style={{
                      padding: '0.5rem 1rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Exporter
                    </button>
                  </div>

                  {wallets.map((wallet, i) => (
                    <div key={i} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{wallet.id}</span>
                      <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280', margin: '0.5rem 0 0', wordBreak: 'break-all' }}>
                        {wallet.address}
                      </p>
                    </div>
                  ))}

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Quorum requis:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      value={quorum}
                      onChange={(e) => setQuorum(parseInt(e.target.value) || 2)}
                      style={{
                        width: '8rem',
                        padding: '0.5rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem'
                      }}
                    />
                  </div>

                  <button
                    onClick={() => setStep('register')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '500'
                    }}
                  >
                    Continuer vers l'enregistrement
                  </button>
                </>
              )}
            </div>
          )}

          {/* Étape 2: Register */}
          {step === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Étape 2: Enregistrement du DID</h2>
              <div style={{ padding: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>{did}</p>
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading ? '#9ca3af' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer le DID'}
              </button>
            </div>
          )}

          {/* Étape 3: Login */}
          {step === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Étape 3: Authentification</h2>
              {!challenge ? (
                <button
                  onClick={handleRequestChallenge}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#9ca3af' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
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
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {challenge}
                  </div>
                  <button
                    onClick={handleSignAndLogin}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: loading ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
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

export default LoginPage;