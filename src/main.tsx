import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './app/App'
import './app/styles.css'

/**
 * HashRouter, а не BrowserRouter: приложение должно одинаково работать
 * и с dev-сервера, и из собранного одним файлом билда (открытого с диска),
 * где серверного роутинга нет.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
