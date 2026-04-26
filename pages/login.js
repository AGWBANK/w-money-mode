import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
    } else {
      setError('Wrong password. Try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>W Money — Model Access</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'fixed', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(var(--paper) 1px, transparent 1px), linear-gradient(90deg, var(--paper) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56, height: 56,
              background: 'var(--w-mid)',
              borderRadius: 14,
              marginBottom: '1rem',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              fontFamily: 'Syne, sans-serif',
            }}>W</div>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}>W Money</div>
            <div style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Financial Model — Restricted Access</div>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(247,246,242,0.04)',
            border: '1px solid rgba(247,246,242,0.10)',
            borderRadius: 16,
            padding: '2rem',
            backdropFilter: 'blur(20px)',
          }}>
            <form onSubmit={handleSubmit}>
              <label style={{
                display: 'block',
                fontFamily: 'DM Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 8,
              }}>
                Access password
              </label>

              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${error ? 'rgba(220,80,80,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                  fontFamily: 'DM Mono, monospace',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  marginBottom: error ? 8 : 16,
                }}
              />

              {error && (
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  color: '#ff7070',
                  marginBottom: 16,
                  letterSpacing: '0.02em',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading || !password ? 'rgba(61,53,168,0.4)' : 'var(--w-mid)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Syne, sans-serif',
                  cursor: loading || !password ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? 'Verifying...' : 'Access model →'}
              </button>
            </form>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.06em',
          }}>
            CONFIDENTIAL — W Money B.V. · TFBH B.V. · KvK 99770938
          </div>
        </div>
      </div>
    </>
  )
}
