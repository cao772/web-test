import React from 'react'

export default class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[DigitalTwinRuntimeError]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main style={{ minHeight: '100vh', background: '#050a0f', color: '#dff7ff', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '10vh auto', border: '1px solid rgba(255,90,115,.4)', background: 'rgba(35,12,18,.82)', padding: 24, borderRadius: 12 }}>
          <div style={{ color: '#ff8194', fontSize: 12, letterSpacing: '.12em', marginBottom: 10 }}>RUNTIME ERROR</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>数字孪生运行时发生异常</h1>
          <p style={{ color: '#9eb8c2', lineHeight: 1.6 }}>页面不会再静默黑屏。下面是浏览器实际抛出的错误，可直接用于定位。</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#080d12', borderRadius: 8, padding: 16, color: '#ffd6dc', fontSize: 12 }}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 14, minHeight: 38, padding: '0 16px', borderRadius: 7, border: '1px solid #4d9caf', background: '#102b34', color: '#dff7ff', cursor: 'pointer' }}>重新加载</button>
        </div>
      </main>
    )
  }
}
