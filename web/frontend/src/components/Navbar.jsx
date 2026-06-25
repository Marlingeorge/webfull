import { Link } from "react-router-dom";
import logo from "../forms/logo.png";

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm py-3">
      <div className="container d-flex align-items-center">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img src={logo} alt="Logo" className="navbar-logo me-2" />
          <strong className="text-white">DISTRIBUTION DES TÂCHES DU DORTOIR</strong>
        </Link>

        <div className="navbar-links ms-auto d-flex flex-wrap align-items-center gap-2">
          <Link className="btn btn-outline-light btn-sm" to="/">Accueil</Link>
          <Link className="btn btn-outline-light btn-sm" to="/dashboard">Répartition</Link>
          <Link className="btn btn-outline-light btn-sm" to="/admin">Dashboard Admin</Link>
          <Link className="btn btn-outline-light btn-sm" to="/admin/history">Historique</Link>
          <Link className="btn btn-outline-light btn-sm" to="/about">À propos</Link>
        </div>
      </div>
    </nav>
  );
}
