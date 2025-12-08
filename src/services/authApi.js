// services/authApi.js
const API_URL = 'http://localhost:3000';

export const registerDID = async (did, publicKeys, quorum) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ did, publicKeys, quorum })
  });
  return response.json();
};

export const requestChallenge = async (did) => {
  const response = await fetch(`${API_URL}/auth/challenge/${encodeURIComponent(did)}`);
  return response.json();
};

export const verifySignatures = async (did, signatures) => {
  const response = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ did, signatures })
  });
  return response.json();
};