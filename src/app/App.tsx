import { NavLink, Route, Routes } from 'react-router-dom'
import { OrdersPage } from '../pages/OrdersPage'
import { OrderPage } from '../pages/OrderPage'
import { EditorPage } from '../pages/EditorPage'
import { CatalogPage } from '../pages/CatalogPage'

export function App() {
  return (
    <div className="shell">
      <header className="app-bar">
        <div className="brand">
          <span className="mark" aria-hidden />
          ОкнаСтудия
        </div>
        <nav>
          <NavLink to="/" end>
            Журнал заказов
          </NavLink>
          <NavLink to="/catalog">Справочники</NavLink>
        </nav>
        <div className="version">MVP · этап «фронтенд»</div>
      </header>
      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderPage />} />
        <Route path="/orders/:orderId/items/:itemId" element={<EditorPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="*" element={<div className="page">Страница не найдена</div>} />
      </Routes>
    </div>
  )
}
