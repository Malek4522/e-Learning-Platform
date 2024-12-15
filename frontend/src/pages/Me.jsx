import { useState } from 'react'
import useProtectedFetch from '../hooks/useProtectedFetch'
import useLogout from '../hooks/useLogout'

export default function Me() {
  const { data, status, debugInfo } = useProtectedFetch('/api/auth/me')
  const { logout, status: logoutStatus, debugInfo: logoutDebugInfo } = useLogout()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div>
      <h1>Me</h1>
      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}
      {logoutStatus.message && (
        <div className={`status-message ${logoutStatus.type}`}>
          {logoutStatus.message}
        </div>
      )}
      
      <button onClick={handleLogout}>Logout</button>

      <div className="debug-container">
        <h3>Debug Info:</h3>
        <div>
          <h4>Request:</h4>
          <pre>{JSON.stringify(debugInfo.req, null, 2)}</pre>
        </div>
        <div>
          <h4>Response:</h4>
          {debugInfo.statusCode && (
            <div className={`status-code ${status.type}`}>
              Status Code: {debugInfo.statusCode}
            </div>
          )}
          <pre className={status.type === 'error' ? 'error' : ''}>
            {JSON.stringify(debugInfo.res, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 