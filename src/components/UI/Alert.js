// components/UI/Alert.jsx
export const SuccessAlert = ({ children }) => (
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
    <p style={{ color: '#166534', margin: 0 }}>{children}</p>
  </div>
);

export const ErrorAlert = ({ children }) => (
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
    <p style={{ color: '#991b1b', margin: 0 }}>{children}</p>
  </div>
);