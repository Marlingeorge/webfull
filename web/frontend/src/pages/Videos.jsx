import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import vid1 from "../forms/videos/vid1.mp4";
import vid2 from "../forms/videos/vid2.mp4";
import vid3 from "../forms/videos/vid3.mp4";

const VIDEOS = [
  {
    src: vid1,
    title: "Vidéo 1 : Présentation des tâches",
    description: "Découvre comment les tâches sont réparties pour chaque résident et les étapes à suivre pour bien commencer.",
    videoClass: "video-top",
  },
  {
    src: vid2,
    title: "Vidéo 2 : Suivi des répartitions",
    description: "Regarde l’explication du système de suivi des présences et de la gestion des changements de planning.",
    videoClass: "video-bottom",
  },
  {
    src: vid3,
    title: "Vidéo 3 : Bonnes pratiques",
    description: "Apprends les bonnes pratiques pour respecter la répartition et rendre la vie en communauté plus fluide.",
  },
];

export default function Videos() {
  const navigate = useNavigate();

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <div className="row g-4">
          {VIDEOS.map((video, index) => (
            <div className="col-12 col-md-6" key={index}>
              <div className="card video-card shadow-sm border-0 p-3">
                <h5>{video.title}</h5>
                <div className={`video-wrapper mb-3 ${video.videoClass || ""}`}>
                  <video
                    controls
                    preload="metadata"
                    src={video.src}
                  />
                </div>
                <p className="text-muted mb-0">{video.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>VOIR LES RÉPARTITIONS DES TÂCHES</button>
        </div>
      </main>
    </div>
  );
}
