import Navbar from "../components/Navbar";
import { useState } from "react";
import axios from "../services/api";
import { useNavigate } from "react-router-dom";
import image1 from "../forms/ima/ima1.jpg";
import image2 from "../forms/ima/ima2.jpg";
import image3 from "../forms/ima/ima3.jpg";
import image8 from "../forms/ima/ima8.png";
import { FACULTIES } from "../data/faculties";

const IMAGES = [image1, image2, image3, image8];

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [assignNumber, setAssignNumber] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function onFile(e) {
    const f = e.target.files[0];
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e) {
    e.preventDefault();
    const proceed = window.confirm("Voulez-vous valider l'enregistrement ? Cliquez sur Annuler si vous souhaitez vérifier ou corriger des informations.");
    if (!proceed) return;
    setSubmitting(true);
    const form = new FormData();
    form.append("full_name", fullName);
    form.append("assign_number", assignNumber);
    form.append("faculty_name", facultyName);
    if (photo) form.append("photo", photo);

    try {
      await axios.post("/persons", form);
      alert("Enregistré avec succès");
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        alert("Ce numéro d'affectation existe déjà. Utilisez un numéro unique.");
      } else {
        alert("Erreur lors de l'enregistrement");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Navbar />
      <main className="container mt-5">
        <div className="row gx-4 gy-4 align-items-center">
          <div className="col-lg-6">
            <div className="card register-card shadow-lg border-0 p-4">
              <div className="mb-4">
                <h2>Enregistrement</h2>
                <p className="text-muted">Remplissez le formulaire pour rejoindre la distribution des tâches du dortoir.</p>
              </div>
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Nom complet</label>
                  <input className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Numéro d'affectation</label>
                  <input className="form-control" value={assignNumber} onChange={(e) => setAssignNumber(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Nom de la faculté</label>
                  <select className="form-select" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} required>
                    <option value="" disabled>Choisissez une faculté</option>
                    {FACULTIES.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label">Photo de profil</label>
                  <input className="form-control" type="file" accept="image/*" onChange={onFile} />
                  {preview && (
                    <div className="mt-3 preview-box">
                      <img src={preview} alt="Aperçu" className="img-fluid rounded" />
                    </div>
                  )}
                </div>
                <div className="d-grid gap-3 d-md-flex">
                  <button className="btn btn-primary btn-lg flex-grow-1" type="submit" disabled={submitting}>
                    {submitting ? "Enregistrement..." : "Valider"}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-lg flex-grow-1"
                    type="button"
                    onClick={() => {
                      setFullName("");
                      setAssignNumber("");                      setFacultyName("");                      setPhoto(null);
                      setPreview(null);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card register-aside shadow-lg border-0 p-4">
              <div className="mb-3">
                <span className="badge bg-primary">Étape 1</span>
              </div>
              <h3>Simple, rapide et efficace</h3>
              <p className="text-muted">Insérez vos informations, puis revenez à l'accueil pour continuer vers la page de vidéos.</p>
              <div className="row gx-3 gy-3 mt-4">
                {IMAGES.map((src, i) => (
                  <div className="col-6" key={i}>
                    <div className="image-slot rounded-4 overflow-hidden">
                      <img src={src} alt={`Image ${i + 1}`} className="img-fluid" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
