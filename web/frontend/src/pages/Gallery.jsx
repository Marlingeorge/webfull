import Navbar from "../components/Navbar";
import AdminNav from "../components/AdminNav";
import { useEffect, useState } from "react";
import axios from "../services/api";

const API_BASE_HOST = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

function getPhotoUrl(photoPath) {
  if (!photoPath) return null;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  return `${API_BASE_HOST}${photoPath}`;
}

export default function Gallery() {
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const res = await axios.get('/persons');
        setPersons(res.data || []);
      } catch (err) {
        console.error('Impossible de charger la galerie', err);
        setPersons([]);
      }
    }
    loadPhotos();
  }, []);

  const personsWithPhotos = persons.filter((person) => person.photo_path);

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <AdminNav />
        <div className="card p-4 shadow-sm mb-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h4 className="mb-1">Galerie des utilisateurs</h4>
              <p className="text-muted mb-0">Les photos envoyées lors de l’enregistrement apparaissent ici avec le nom correspondant.</p>
            </div>
            <div>
              <span className="badge bg-primary">{personsWithPhotos.length} photo{s(personsWithPhotos.length)}</span>
            </div>
          </div>
        </div>

        {personsWithPhotos.length === 0 ? (
          <div className="card p-4 shadow-sm">
            <p className="mb-0 text-muted">Aucune image enregistrée pour le moment. Demandez aux utilisateurs de s’enregistrer avec une photo.</p>
          </div>
        ) : (
          <div className="row g-3">
            {personsWithPhotos.map((person) => (
              <div className="col-6 col-sm-4 col-md-3" key={person.id}>
                <div className="card gallery-card shadow-sm overflow-hidden h-100">
                  <div className="gallery-image-wrapper">
                    <img
                      src={getPhotoUrl(person.photo_path)}
                      alt={person.full_name}
                      className="img-fluid w-100 h-100"
                      style={{ objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <div className="p-3 text-center">
                    <strong className="d-block">{person.full_name}</strong>
                    <small className="text-muted">{person.faculty_name}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function s(count) {
  return count > 1 ? 's' : '';
}
