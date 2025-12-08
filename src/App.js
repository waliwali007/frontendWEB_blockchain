// src/App.jsx
import{ React,  useState } from 'react';
import LoginPage from './components/LoginPage/LoginPage';
import MedicalDashboard from './components/dashboard/MedicalDashboard.js';

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