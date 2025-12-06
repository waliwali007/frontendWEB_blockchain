import React, { useState } from 'react';
import { ethers } from 'ethers';

const App = () => {
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
      // Génération de vrais wallets Ethereum avec ethers.js
      const generatedWallets = Array.from({ length: 3 }, (_, i) => {
        const wallet = ethers.Wallet.createRandom();
        return {
          id: `key${i + 1}`,
          address: wallet.address,
          privateKey: wallet.privateKey,
          wallet: wallet // Garder l'objet wallet pour signer plus tard
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
      // Signature réelle avec ethers.js
      const signatures = await Promise.all(
        wallets.slice(0, quorum).map(async (w) => {
          try {
            // Créer le wallet à partir de la clé privée
            const wallet = new ethers.Wallet(w.privateKey);
            
            // Signer le message (challenge)
            const signature = await wallet.signMessage(challenge);
            
            return {
              keyId: w.id,
              signature: signature
            };
          } catch (err) {
            console.error(`Erreur signature ${w.id}:`, err);
            throw err;
          }
        })
      );

      console.log('Signatures générées:', signatures);

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
        setStep('authenticated');
      } else {
        setError(data.reason || 'Authentification échouée');
      }
    } catch (err) {
      setError('Erreur lors de la signature/vérification: ' + err.message);
    }
    setLoading(false);
  };

  const reset = () => {
    setStep('setup');
    setWallets([]);
    setChallenge('');
    setMessage('');
    setError('');
  };

  const exportWallets = () => {
    const dataStr = JSON.stringify(wallets.map(w => ({
      id: w.id,
      address: w.address,
      privateKey: w.privateKey
    })), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'wallets-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
                DID Authentication
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>Multi-signature blockchain identity avec ethers.js</p>
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

          {/* Step 1: Setup */}
          {step === 'setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  Étape 1: Génération des wallets Ethereum
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Générez 3 wallets Ethereum réels avec ethers.js pour votre identité décentralisée.
                </p>
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
                  {loading ? 'Génération...' : 'Générer les wallets'}
                </button>
              </div>

              {wallets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Wallets générés:</h3>
                    <button
                      onClick={exportWallets}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                          <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600' }}>{wallet.id}</span>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Address:</span>
                        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#1f2937', margin: '0.25rem 0 0 0', wordBreak: 'break-all' }}>
                          {wallet.address}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Private Key:</span>
                        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#dc2626', margin: '0.25rem 0 0 0', wordBreak: 'break-all' }}>
                          {wallet.privateKey}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    padding: '1rem',
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '0.5rem'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#78350f', margin: 0 }}>
                      ⚠️ <strong>Important:</strong> Sauvegardez vos clés privées en lieu sûr! Ne les partagez jamais.
                    </p>
                  </div>

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                      Quorum requis (signatures nécessaires):
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
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      {quorum} signature(s) sur 3 seront nécessaires pour s'authentifier
                    </p>
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
                    Continuer vers l'enregistrement
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Register */}
          {step === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                  Étape 2: Enregistrement du DID
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
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Enregistrez votre identité décentralisée avec vos {wallets.length} clés publiques Ethereum.
                </p>
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
            </div>
          )}

          {/* Step 3: Login */}
          {step === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                  Étape 3: Authentification avec signatures cryptographiques
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Challenge à signer avec ethers.js:
                        </p>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', margin: 0 }}>
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
                        {loading ? 'Signature en cours...' : `Signer avec ${quorum} clé(s) et vérifier`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Authenticated */}
          {step === 'authenticated' && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '5rem',
                height: '5rem',
                background: '#dcfce7',
                borderRadius: '50%',
                marginBottom: '1rem'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Authentification réussie!
              </h2>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Votre identité décentralisée a été vérifiée avec des signatures cryptographiques Ethereum.
              </p>
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Recommencer
              </button>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>✅ ethers.js intégré!</p>
                <p style={{ margin: 0 }}>
                  Cette application utilise maintenant de vraies signatures cryptographiques Ethereum. Les wallets sont générés de manière sécurisée et les signatures sont vérifiées côté serveur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;