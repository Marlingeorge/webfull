import { NavLink, useNavigate } from 'react-router-dom'

export default function AdminNav() {
  const navigate = useNavigate();

  function logout() {
    navigate('/');
  }

  return (
    <nav className="admin-navbar navbar navbar-expand-lg navbar-light bg-white shadow-sm rounded-4 mb-4">
      <div className="container-fluid px-0">
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavMenu" aria-controls="adminNavMenu" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="adminNavMenu">
          <ul className="navbar-nav align-items-center w-100">
            <li className="nav-item me-2">
              <NavLink className="nav-link" to="/admin">Tableau de bord</NavLink>
            </li>
            <li className="nav-item me-2">
              <NavLink className="nav-link" to="/admin/persons">Personnes</NavLink>
            </li>
            <li className="nav-item me-2">
              <NavLink className="nav-link" to="/admin/presences">Présences</NavLink>
            </li>
            <li className="nav-item me-2">
              <NavLink className="nav-link" to="/admin/history">Historique</NavLink>
            </li>
            <li className="nav-item me-2">
              <NavLink className="nav-link" to="/about">À propos</NavLink>
            </li>
            <li className="nav-item ms-auto">
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={logout}>Déconnexion</button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
