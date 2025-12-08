// src/components/LoginPage/LoginPage.jsx
import React, { useState } from 'react';
import { generateWallets, recreateWalletsFromBackup, exportWalletsToFile } from '../../utils/walletUtils';
import { ethers } from 'ethers';

const LoginPage = ({ onLoginSuccess }) => {
  const [wallets, setWallets] = useState([]);
  const [did, setDid] = useState('');
  const [quorum, setQuorum] = useState(2);
  const [step, setStep] = useState('setup'); // 'setup' | 'register' | 'login'
  const [challenge, setChallenge] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // États pour le MFA
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLogId, setMfaLogId] = useState(null);

  // Générer 3 wallets
  const handleGenerateWallets = async () => {
    setLoading(true);
    setError('');
    try {
      const generated = generateWallets();
      setWallets(generated);
      setDid(`did:eth:${generated[0].address}`);
      setMessage('3 wallets générés avec succès');
    } catch (err) {
      setError('Erreur lors de la génération');
    }
    setLoading(false);
  };

  // Importer un backup
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
        setMessage('Wallets importés avec succès !');
        setError('');
      } catch (err) {
        setError('Fichier invalide');
      }
    };
    reader.readAsText(file);
  };

  // Étape 2 : Enregistrer le DID
  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const publicKeys = wallets.map(w => ({ id: w.id, key: w.address }));
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, publicKeys, quorum })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('DID enregistré avec succès');
        setStep('login');
      } else {
        setError(data.error || 'Échec de l’enregistrement');
      }
    } catch {
      setError('Serveur injoignable');
    }
    setLoading(false);
  };

  // Étape 3 : Demander un challenge
  const handleRequestChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:3000/auth/challenge/${encodeURIComponent(did)}`);
      const data = await res.json();
      if (res.ok) {
        setChallenge(data.challenge);
        setMessage('Challenge reçu');
      } else {
        setError(data.error || 'DID non trouvé');
      }
    } catch {
      setError('Erreur serveur');
    }
    setLoading(false);
  };

  // Connexion principale (gère ALLOW / MFA / BLOCK)
  const handleSignAndLogin = async () => {
    if (!challenge) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const signatures = await Promise.all(
        wallets.slice(0, quorum).map(async (w) => {
          const sig = await new ethers.Wallet(w.privateKey).signMessage(challenge);
          return { keyId: w.id, signature: sig };
        })
      );

      const res = await fetch('http://localhost:3000/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, signatures })
      });

      const data = await res.json();

      // Succès direct
      if (data.authenticated === true || data.decision === 'ALLOW') {
        setMessage('Connexion réussie !');
        setTimeout(() => onLoginSuccess({ did, wallets }), 1000);
        return;
      }

      // MFA requis → on ouvre le popup
      if (data.decision === 'MFA' || data.mfa_required === true) {
        setMfaLogId(data.log_id || null);
        setShowMfaDialog(true);
        setLoading(false);
        return;
      }

      // Bloqué
      if (data.decision === 'BLOCK') {
        setError(`Accès refusé : ${data.reason || 'Comportement suspect détecté'}`);
        setChallenge('');
        setStep('setup');
        return;
      }

      // Autre erreur
      setError(data.reason || 'Échec de l’authentification');

    } catch (err) {
      setError('Erreur réseau');
    }
    setLoading(false);
  };

  // Validation du code MFA
const handleMfaSubmit = async () => {
    if (mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3000/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: mfaLogId,
          code: mfaCode,
          did: did
        })
      });

      const data = await res.json();

      if (data.authenticated === true) {
        setMessage('Code validé ! Connexion en cours...');
        setShowMfaDialog(false);
        setTimeout(() => onLoginSuccess({ did, wallets }), 1000);
      } else {
        setError(data.reason || 'Code incorrect ou expiré');
      }
    } catch (err) {
      setError('Erreur serveur lors de la vérification du code');
      console.error(err);
    }
    setLoading(false);
  };

  const handleExportWallets = () => exportWalletsToFile(wallets);

  return (
    <>
      {/* Page principale */}
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)', padding: '2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                  Connexion Sécurisée
                </h1>
                <p style={{ color: '#6b7280', margin: 0 }}>Authentification DID + IA de sécurité</p>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p style={{ margin: 0, color: '#166534' }}>{message}</p>
              </div>
            )}

            {error && (
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
              </div>
            )}

            {/* ÉTAPE 1 : Setup */}
            {step === 'setup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Étape 1 : Création des clés</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={handleGenerateWallets} disabled={loading}
                    style={{ padding: '0.75rem 1.5rem', background: loading ? '#9ca3af' : '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem' }}>
                    {loading ? 'Génération...' : 'Générer 3 wallets'}
                  </button>
                  <label style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    Importer backup
                    <input type="file" accept=".json" onChange={handleImportWallets} style={{ display: 'none' }} />
                  </label>
                </div>

                {wallets.length > 0 && (
                  <>
                    <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                      <p style={{ margin: 0, color: '#1e40af' }}>Wallets prêts ! Sauvegardez-les.</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Clés :</h3>
                      <button onClick={handleExportWallets} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                        Exporter
                      </button>
                    </div>
                    {wallets.map((w, i) => (
                      <div key={i} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                        <strong>{w.id}</strong>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', margin: '0.5rem 0 0' }}>{w.address}</p>
                      </div>
                    ))}
                    <div>
                      <label>Quorum requis : </label>
                      <input type="number" min="1" max="3" value={quorum} onChange={e => setQuorum(parseInt(e.target.value) || 2)}
                        style={{ width: '80px', padding: '0.5rem', marginLeft: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} />
                    </div>
                    <button onClick={() => setStep('register')}
                      style={{ padding: '0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '500' }}>
                      Continuer
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ÉTAPE 2 : Register */}
            {step === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Étape 2 : Enregistrement du DID</h2>
                <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                  {did}
                </div>
                <button onClick={handleRegister} disabled={loading}
                  style={{ padding: '0.75rem 1.5rem', background: loading ? '#9ca3af' : '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem' }}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            )}

            {/* ÉTAPE 3 : Login */}
            {step === 'login' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Étape 3 : Connexion</h2>
                {!challenge ? (
                  <button onClick={handleRequestChallenge} disabled={loading}
                    style={{ padding: '0.75rem 1.5rem', background: loading ? '#9ca3af' : '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem' }}>
                    {loading ? 'Demande...' : 'Demander un challenge'}
                  </button>
                ) : (
                  <>
                    <div style={{ padding: '1rem', background: '#fefce8', border: '1px solid #fde047', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {challenge}
                    </div>
                    <button onClick={handleSignAndLogin} disabled={loading}
                      style={{ padding: '0.75rem 1.5rem', background: loading ? '#9ca3af' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '500' }}>
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POPUP MFA – Toujours au-dessus */}
      {showMfaDialog && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'white',
            padding: '3rem 2rem',
            borderRadius: '1.5rem',
            width: '90%',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.8rem', color: '#1f2937' }}>
              Vérification en 2 étapes
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.5' }}>
              Un comportement inhabituel a été détecté.<br />
              Saisissez le code à 6 chiffres pour continuer.
            </p>

            <input
              type="text"
              maxLength="6"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              style={{
                width: '100%',
                padding: '1.5rem',
                fontSize: '3rem',
                textAlign: 'center',
                letterSpacing: '1rem',
                border: '4px solid #3b82f6',
                borderRadius: '1rem',
                marginBottom: '1.5rem',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: '#f8fafc'
              }}
            />

            {error && <p style={{ color: '#dc2626', margin: '1rem 0', fontWeight: '600' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowMfaDialog(false);
                  setMfaCode('');
                  setError('');
                  setStep('setup');
                  setChallenge('');
                }}
                style={{ flex: 1, padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '1rem', fontWeight: '600' }}
              >
                Annuler
              </button>
              <button
                onClick={handleMfaSubmit}
                disabled={loading || mfaCode.length !== 6}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: (loading || mfaCode.length !== 6) ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '1rem',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Vérification...' : 'Valider le code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;