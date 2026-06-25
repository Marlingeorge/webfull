import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import image1 from "../forms/image1.jpg";
import image2 from "../forms/image2.jpg";
import image3 from "../forms/image3.jpg";
import image4 from "../forms/image4.jpg";

const IMAGES = [image1, image2, image3, image4];

export default function Home() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  function goPrev() {
    setActiveIndex((current) => (current - 1 + IMAGES.length) % IMAGES.length);
  }

  function goNext() {
    setActiveIndex((current) => (current + 1) % IMAGES.length);
  }

  return (
    <div className="home-page py-4">
      <Navbar />

      <main className="container mt-4">
        <div className="row gx-4 gy-4 align-items-center">
          <div className="col-12 col-lg-8">
            <div className="card hero-card shadow-lg border-0 p-3 position-relative overflow-hidden">
              <div className="home-carousel">
                {IMAGES.map((src, index) => (
                  <div key={index} className={`home-carousel-slide ${index === activeIndex ? "active" : ""}`}>
                    <img src={src} className="img-fluid rounded-4 home-carousel-image" alt={`Slide ${index + 1}`} />
                  </div>
                ))}
              </div>
              <button className="home-carousel-control prev" onClick={goPrev} aria-label="Précédent">
                ‹
              </button>
              <button className="home-carousel-control next" onClick={goNext} aria-label="Suivant">
                ›
              </button>
              <div className="home-carousel-indicators">
                {IMAGES.map((_, index) => (
                  <button
                    key={index}
                    className={`home-carousel-indicator ${index === activeIndex ? "active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Aller à l'image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card hero-info shadow-lg border-0 p-4 h-100">
              <div className="hero-info-body d-flex flex-column justify-content-between h-100">
                <div>
                  <h1 className="mb-3">Distribution des tâches</h1>
                  <p className="mb-4 text-muted">Une solution moderne pour gérer les présences, les tâches et l’équité du dortoir.</p>

                  <ul className="hero-check list-unstyled mb-4">
                    <li>Organisation automatique des tâches</li>
                    <li>Suivi des résidents</li>
                    <li>Gestion des présences</li>
                    <li>Répartition équitable des travaux</li>
                  </ul>
                </div>

                <div className="d-flex flex-column gap-3">
                  <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>S'ENREGISTRER</button>
                  <button className="btn btn-success btn-lg" onClick={() => navigate('/videos')}>PASSER</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
