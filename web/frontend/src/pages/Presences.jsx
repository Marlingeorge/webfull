import Navbar from "../components/Navbar";
import AdminNav from "../components/AdminNav";
import { useEffect, useState } from "react";
import axios from "../services/api";
import { useNavigate } from "react-router-dom";

const TASKS = ["Toilette", "Cuisinage", "Balayage", "Vaisselle"];

function getTaskTargetCounts(totalPeople) {
  const base = Math.floor(totalPeople / TASKS.length);
  const rem = totalPeople % TASKS.length;
  return TASKS.reduce((acc, task, index) => {
    acc[task] = base + (index < rem ? 1 : 0);
    return acc;
  }, {});
}

function getTaskForNthPerson(n) {
  if (!n || n < 1) return null;
  return TASKS[(n - 1) % TASKS.length];
}

function getOrdinal(n) {
  if (n === 1) return "1ʳᵉ";
  return `${n}ᵉ`;
}

export default function Presences() {
  const [persons, setPersons] = useState([]);
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [distributionSummary, setDistributionSummary] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const res = await axios.get('/persons?active=true');
      setPersons(res.data);
      const initial = {};
      res.data.forEach((p) => {
        initial[p.id] = p.active;
      });
      setChecked(initial);
    } catch (error) {
      console.error(error);
      setMessage('Impossible de charger la liste des personnes.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = Object.values(checked).filter(Boolean).length;
  const targetCounts = getTaskTargetCounts(activeCount);
  const currentTask = getTaskForNthPerson(activeCount);
  const cuisineMessage = currentTask
    ? `La ${getOrdinal(activeCount)} personne est maintenant prévue pour ${currentTask}.`
    : null;

  function toggle(id) {
    setChecked((s) => ({ ...s, [id]: !s[id] }));
  }

  function getPendingPresenceUpdates() {
    return persons.filter((p) => checked[p.id] !== p.active);
  }

  async function savePresenceUpdates() {
    const updates = getPendingPresenceUpdates();
    if (!updates.length) {
      return true;
    }
    await Promise.all(
      updates.map((person) =>
        axios.put(`/persons/${person.id}`, { active: checked[person.id] })
      )
    );
    return true;
  }

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      await savePresenceUpdates();
      setMessage('État des présences enregistré.');
      await load();
    } catch (error) {
      console.error(error);
      setMessage('Erreur lors de l’enregistrement des présences.');
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setCodeError(null);
    setMessage(null);

    const trimmedCode = accessCode.trim();
    if (!trimmedCode) {
      setCodeError('Code requis pour générer la répartition.');
      setGenerating(false);
      return;
    }

    if (trimmedCode !== '8996') {
      setCodeError('Code incorrect. Veuillez saisir le code.');
      setGenerating(false);
      return;
    }

    try {
      if (activeCount === 0) {
        setMessage('Il doit y avoir au moins une personne active pour générer la distribution.');
        setGenerating(false);
        return;
      }

      await savePresenceUpdates();
      const res = await axios.post('/generate');
      const dist = res.data && res.data.distribution;
      if (!dist) {
        throw new Error('Pas de distribution retournée');
      }
      setDistributionSummary(dist.summary || null);
      setMessage('Répartition générée avec succès.');
      await load();
      window.dispatchEvent(new CustomEvent('distribution:updated', { detail: dist }));
      setAccessCode('');
    } catch (error) {
      console.error(error);
      setMessage('Impossible de générer la distribution.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <AdminNav />
        <div className="card p-3 shadow-sm presences-card">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="mb-1">Présences et statut actif</h5>
              <p className="text-muted mb-0">Décochez les personnes inactives puis enregistrez pour mettre à jour la distribution.</p>
            </div>
            <span className="badge bg-info text-dark">Auto génération à 04:00</span>
          </div>

          {message && <div className="alert alert-info">{message}</div>}

          <div className="list-group">
            {persons.map((p) => {
              const isActive = !!checked[p.id];
              return (
                <label key={p.id} className="list-group-item d-flex justify-content-between align-items-center presence-row">
                  <div>
                    <strong>{p.full_name}</strong>
                    <div className="text-muted">{p.assign_number}</div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="presence-status">{isActive ? 'Actif' : 'Inactif'}</span>
                    <input type="checkbox" checked={isActive} onChange={() => toggle(p.id)} />
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mb-3">
            <h6>Répartition attendue</h6>
            <div className="row g-2">
              {TASKS.map((task) => (
                <div key={task} className="col-6 col-md-3">
                  <div className="card p-2 text-center shadow-sm">
                    <div className="fw-semibold">{task}</div>
                    <div className="text-primary fs-4">{targetCounts[task]}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted small mt-2">
              Le système distribue les personnes selon la priorité : Toilette puis Cuisinage, Balayage et Vaisselle.
            </p>
            {distributionSummary && (
              <div className="card mt-3 p-3 bg-light">
                <h6 className="mb-2">Résumé de la dernière génération</h6>
                <div className="row">
                  <div className="col-12 col-md-6 mb-2">
                    <strong>Personnes actives :</strong> {distributionSummary.total_active}
                  </div>
                  <div className="col-12 col-md-6 mb-2">
                    <strong>Date :</strong> {new Date(distributionSummary.date).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="row g-2 mt-2">
                  {TASKS.map((task) => (
                    <div key={task} className="col-6 col-md-3">
                      <div className="border rounded p-2 text-center">
                        <div className="fw-semibold">{task}</div>
                        <div className="text-primary fs-5">{distributionSummary.task_counts[task] ?? 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cuisineMessage && (
              <div className="alert alert-success mt-3">
                {cuisineMessage}
              </div>
            )}
          </div>

          <div className="row g-2 align-items-end mt-3">
            <div className="col-12 col-md-5">
              <label className="form-label">Code d’accès</label>
              <input
                type="password"
                className="form-control"
                placeholder="Entrez le code privé"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              {codeError && <div className="text-danger mt-2">{codeError}</div>}
            </div>
            <div className="col-12 col-md-7 d-flex gap-2">
              <button className="btn btn-primary flex-fill" onClick={submit} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button className="btn btn-success flex-fill" onClick={generate} disabled={generating || activeCount === 0}>
                {generating ? 'Génération...' : 'GÉNÉRER LA DISTRIBUTION'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
