import { useState } from 'react';
import authService from '../services/AuthService';

const useLogout = () => {
  const [status, setStatus] = useState({ type: null, message: null });
  const [debugInfo, setDebugInfo] = useState({ req: null, res: null, statusCode: null });

  const logout = async () => {
    setDebugInfo({ req: {}, res: null, statusCode: null });
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      setDebugInfo(prev => ({ ...prev, req: {}, res: data, statusCode: response.status }));

      if (response.ok) {
        authService.setAccessToken(null); // Clear the access token
        setStatus({ type: 'success', message: 'Logged out successfully!' });
      } else {
        setStatus({ type: 'error', message: data.message || 'Logout failed' });
      }
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, res: { error: error.message } }));
      setStatus({ type: 'error', message: 'Error during logout: ' + error.message });
    }
  };

  return { logout, status, debugInfo };
};

export default useLogout; 