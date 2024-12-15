import { useState } from 'react'
import authService from '../services/AuthService'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [debugInfo, setDebugInfo] = useState({ req: null, res: null, statusCode: null })
  const [status, setStatus] = useState({ type: null, message: null })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const reqData = { email, password }
    setDebugInfo(prev => ({ ...prev, req: reqData }))
    setStatus({ type: 'loading', message: 'Logging in...' })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData),
      })
      const data = await response.json()

      setDebugInfo(prev => ({ 
        ...prev, 
        res: data,
        statusCode: response.status
      }))
      
      if (response.ok) {
        authService.setAccessToken(data.accessToken)
        setStatus({ type: 'success', message: 'Login successful!' })
      } else {
        setStatus({ type: 'error', message: data.message || 'Login failed' })
      }
    } catch (error) {
      setDebugInfo(prev => ({ 
        ...prev, 
        res: { error: error.message },
        statusCode: 500
      }))
      setStatus({ type: 'error', message: 'Login failed: ' + error.message })
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>
      </form>

      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

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