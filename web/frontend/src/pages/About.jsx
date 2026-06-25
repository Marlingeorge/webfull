import Navbar from "../components/Navbar";
import propoImg from "../forms/ima/ima7.png";
import fallbackImg from "../forms/ima/ima1.jpg";

export default function About() {
  return (
    <div>
      <Navbar />
      <main className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-lg border-0 p-4">
              <div className="text-center mb-4">
                <h2>À propos</h2>
                <p className="text-muted">Gestion automatique des tâches et répartition équitable du travail entre les résidents.</p>
              </div>

              <div className="d-flex flex-column flex-lg-row align-items-center gap-4">
                <div>
                  <div className="propo-avatar">
                    <img
                      src={propoImg}
                      alt="Proposition"
                      className="propo-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackImg;
                      }}
                    />
                  </div>
                  <div className="propo-caption">Proposition</div>
                </div>
                <div>
                  <h4>Histoire du développeur</h4>
                  <p>
                    Développeur passionné par l'automatisation et l'amélioration des process de vie en communauté.
                    Ce projet est né pour simplifier la gestion des tâches dans un dortoir et permettre
                    à chaque résident de retrouver une organisation claire, équitable et facile à suivre.
                  </p>
                  <p>
                    L'application combine une interface moderne, un accès admin protégé par code et une logique
                    de répartition qui privilégie la justice entre les membres du groupe.
                  </p>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
