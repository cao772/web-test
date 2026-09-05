import ReactDOM from 'react-dom/client'
import V6App from './v6App.jsx'
import RuntimeErrorBoundary from './RuntimeErrorBoundary.jsx'
import './styles.css'
import './stage3.css'
import './stage4.css'
import './stage5.css'
import './stage6.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <RuntimeErrorBoundary>
    <V6App />
  </RuntimeErrorBoundary>,
)
