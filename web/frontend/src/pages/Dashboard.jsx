import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import axios from "../services/api";
import balayageImg from "../forms/ima/ima4 (1).jpg";
import cuisineImg from "../forms/ima/ima4 (2).jpg";
import vaisselleImg from "../forms/ima/ima4 (3).jpg";
import toiletteImg from "../forms/ima/ima4 (4).jpg";

const TASK_IMAGES = {
  Balayage: balayageImg,
  Cuisinage: cuisineImg,
  Cuisine: cuisineImg,
  Vaisselle: vaisselleImg,
  Toilette: toiletteImg,
};

export default function Dashboard() {
  const [persons, setPersons] = useState([]);
  const [distribution, setDistribution] = useState(null);

  useEffect(() => {
    axios.get('/persons?active=true').then((r) => setPersons(r.data)).catch(() => {});
    axios.get('/distributions').then((r) => setDistribution(r.data?.[0] || null)).catch(() => {});

    const handleDistributionUpdate = () => {
      axios.get('/persons?active=true').then((r) => setPersons(r.data)).catch(() => {});
      axios.get('/distributions').then((r) => setDistribution(r.data?.[0] || null)).catch(() => {});
    };

    window.addEventListener('distribution:updated', handleDistributionUpdate);
    return () => window.removeEventListener('distribution:updated', handleDistributionUpdate);
  }, []);

  const TASK_ORDER = ["Toilette", "Cuisinage", "Balayage", "Vaisselle"];
  function getTaskTargetCounts(totalPeople) {
    if (!totalPeople || totalPeople <= 0) return TASK_ORDER.reduce((a, t) => ({ ...a, [t]: 0 }), {});
    const base = Math.floor(totalPeople / TASK_ORDER.length);
    const rem = totalPeople % TASK_ORDER.length;
    return TASK_ORDER.reduce((acc, task, i) => {
      acc[task] = base + (i < rem ? 1 : 0);
      return acc;
    }, {});
  }

  const TASK_ALIASES = {
    Cuisine: 'Cuisinage',
    cuisine: 'Cuisinage',
  };

  function normalizeTaskName(task) {
    if (!task) return task;
    const key = String(task).trim();
    return TASK_ALIASES[key] || key;
  }

  function normalizeAssignments(assignments) {
    const result = {};
    if (!assignments) return result;
    Object.entries(assignments).forEach(([key, value]) => {
      if (value) {
        result[String(key)] = normalizeTaskName(value);
      }
    });
    return result;
  }

  function computeAssignmentPreview(activePersons) {
    const targetCounts = getTaskTargetCounts(activePersons.length);
    const assignments = {};
    const assignedPersonIds = new Set();

    const comparePerson = (a, b) => {
      const dateA = new Date(a.created_at).getTime() || 0;
      const dateB = new Date(b.created_at).getTime() || 0;
      return dateA - dateB || a.id - b.id;
    };

    TASK_ORDER.forEach((task) => {
      const need = targetCounts[task] || 0;
      if (need <= 0) return;

      const candidates = activePersons.filter((p) => !assignedPersonIds.has(p.id));
      const preferred = candidates.filter((p) => p.last_task !== task).sort(comparePerson);
      const fallback = candidates.filter((p) => p.last_task === task).sort(comparePerson);

      const selected = preferred.slice(0, need);
      if (selected.length < need) {
        selected.push(...fallback.slice(0, need - selected.length));
      }

      selected.forEach((person) => {
        assignments[String(person.id)] = task;
        assignedPersonIds.add(person.id);
      });
    });

    return assignments;
  }

  const activePersons = persons.filter((p) => p.active);
  let distributionAssignments = {};
  if (distribution) {
    try {
      distributionAssignments = typeof distribution.assignments === 'string'
        ? JSON.parse(distribution.assignments || '{}')
        : distribution.assignments || {};
    } catch (error) {
      distributionAssignments = {};
    }
  }

  distributionAssignments = normalizeAssignments(distributionAssignments);
  const activePersonIds = new Set(activePersons.map((p) => String(p.id)));
  distributionAssignments = Object.entries(distributionAssignments).reduce((acc, [key, value]) => {
    if (activePersonIds.has(String(key))) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const rawAssignmentSource = Object.keys(distributionAssignments).length > 0
    ? distributionAssignments
    : computeAssignmentPreview(activePersons);

  // Ensure all assignment values are normalized (trim + alias) so they match TASK_ORDER
  let assignmentSource = Object.entries(rawAssignmentSource || {}).reduce((acc, [k, v]) => {
    if (!v) return acc;
    acc[k] = normalizeTaskName(v);
    return acc;
  }, {});

  // If distribution exists but none of its assigned IDs match current active persons,
  // fallback to computed preview and mark a mismatch flag for UI hints.
  let distributionMismatch = false;
  if (distribution && Object.keys(assignmentSource).length > 0) {
    const activeAssignmentIds = new Set(Object.keys(assignmentSource));
    const allActiveAssigned = activePersons.every((p) => activeAssignmentIds.has(String(p.id)));
    if (!allActiveAssigned) {
      distributionMismatch = true;
      const preview = computeAssignmentPreview(activePersons);
      assignmentSource = Object.entries(preview).reduce((acc, [k, v]) => {
        if (!v) return acc;
        acc[k] = normalizeTaskName(v);
        return acc;
      }, {});
    }
  }

  const grouped = activePersons.reduce((acc, person) => {
    const task = normalizeTaskName(assignmentSource[String(person.id)]);
    if (!task) return acc;
    acc[task] = acc[task] || [];
    acc[task].push(person);
    return acc;
  }, {});
  const orderedGroups = TASK_ORDER.map((task) => {
    const personsForTask = grouped[task] || [];
    return {
      task,
      persons: personsForTask,
      assignedNames: personsForTask.map((p) => p.full_name).join(', '),
    };
  });
  const counts = TASK_ORDER.reduce((acc, task) => ({
    ...acc,
    [task]: grouped[task]?.length || 0,
  }), {});
  const activeCount = activePersons.length;
  const distributionDate = distribution ? new Date(distribution.date).toLocaleDateString() : 'Aperçu';
  const hasAssignments = Object.keys(assignmentSource).length > 0;

  async function downloadDistributionPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 40;
    const contentWidth = pageWidth - marginLeft * 2;

    const drawBackground = () => {
      pdf.setFillColor(235, 247, 236);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setDrawColor(190);
      pdf.setLineWidth(0.5);
      pdf.rect(marginLeft / 2, marginLeft / 2, pageWidth - marginLeft, pageHeight - marginLeft, 'S');
    };

    drawBackground();
    pdf.setFontSize(22);
    pdf.setTextColor(34, 55, 34);
    pdf.text('Répartition des tâches', marginLeft, 60);
    pdf.setFontSize(11);
    pdf.setTextColor(60, 78, 64);
    pdf.text(`Date : ${distributionDate}`, marginLeft, 80);
    pdf.text(`Personnes actives : ${activeCount}`, marginLeft, 96);
    pdf.text(`Total inscrits : ${persons.length}`, marginLeft + 260, 96);

    let y = 120;

    const blockColors = [
      { fill: [236, 244, 255], accent: [79, 115, 223] },
      { fill: [232, 250, 241], accent: [28, 200, 138] },
      { fill: [227, 248, 250], accent: [54, 185, 204] },
      { fill: [255, 249, 229], accent: [246, 194, 62] },
    ];

    orderedGroups.forEach(({ task, persons: assigned }, index) => {
      const blockHeight = 30 + Math.max(assigned.length, 1) * 16;
      if (y + blockHeight > pageHeight - 50) {
        pdf.addPage();
        drawBackground();
        y = 50;
      }

      const color = blockColors[index] || { fill: [245, 245, 245], accent: [36, 34, 32] };
      pdf.setFillColor(...color.fill);
      pdf.roundedRect(marginLeft, y, contentWidth, blockHeight, 12, 12, 'F');
      pdf.setDrawColor(210);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(marginLeft, y, contentWidth, blockHeight, 12, 12, 'S');

      pdf.setFontSize(13);
      pdf.setTextColor(...color.accent);
      pdf.text(`${task} (${assigned.length})`, marginLeft + 12, y + 22);

      pdf.setFontSize(10);
      pdf.setTextColor(35, 48, 37);
      const startY = y + 40;
      if (assigned.length === 0) {
        pdf.text('Aucun assigné', marginLeft + 12, startY);
      } else {
        assigned.forEach((person, pIndex) => {
          const personY = startY + pIndex * 14;
          pdf.text(`• ${person.full_name}`, marginLeft + 12, personY);
        });
      }
      y += blockHeight + 14;
    });

    if (y > pageHeight - 70) {
      pdf.addPage();
      drawBackground();
      y = 50;
    }

    pdf.setFontSize(10);
    pdf.setTextColor(100, 110, 100);
    pdf.text('Généré depuis le tableau de bord de répartition des tâches du dortoir.', marginLeft, pageHeight - 30);
    pdf.save('repartition-taches.pdf');
  }

  function printDistribution() {
    if (!distribution) return;
    window.print();
  }

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <div className="mb-3">
          <div>
            <h4 className="mb-0">Tableau de bord</h4>
            <p className="text-muted mb-0">Vue des répartitions et présences actives.</p>
          </div>
        </div>

        <div className="print-summary print-only mb-4">
          <h2>Répartition des tâches</h2>
          <p className="mb-1">Date : {distributionDate}</p>
          <p className="mb-2">Personnes actives : {activeCount} / Total inscrits : {persons.length}</p>
          {TASK_ORDER.map((task) => {
            const assigned = grouped[task] || [];
            return (
              <div key={task} className="mb-2">
                <strong>{task} ({assigned.length})</strong>
                <ul>
                  {assigned.length > 0 ? (
                    assigned.map((person) => <li key={person.id}>{person.full_name}</li>)
                  ) : (
                    <li>Aucun assigné</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="card mb-3 p-3 shadow-sm dashboard-menu-card no-print">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Link className="btn btn-outline-primary btn-sm" to="/admin/persons">Personnes</Link>
            <Link className="btn btn-outline-primary btn-sm" to="/admin/presences">Présences</Link>
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              onClick={downloadDistributionPdf}
              disabled={!hasAssignments}
              title={hasAssignments ? 'Télécharger la répartition au format PDF' : 'Aucune répartition à télécharger'}
            >
              Télécharger PDF
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={printDistribution}
              disabled={!hasAssignments}
              title={hasAssignments ? 'Imprimer la répartition' : 'Aucune répartition à imprimer'}
            >
              Imprimer
            </button>
            <Link className="btn btn-outline-info btn-sm" to="/admin/gallery">Voir la galerie</Link>
          </div>
        </div>

        

        <div className="row g-3">
          <div className="col-md-6">
            <div className="card dashboard-card p-4 shadow-sm">
              <h5>Répartition du jour</h5>
              <p className="display-6 mb-0">{distribution ? 'OK' : 'Aucun'}</p>
              <small className="text-muted">Dernière génération : {distribution ? new Date(distribution.date).toLocaleDateString() : 'N/A'}</small>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card dashboard-card p-4 shadow-sm">
              <h5>Personnes actives</h5>
              <p className="display-6 mb-0">{persons.filter((p) => p.active).length}</p>
              <small className="text-muted">Total enregistrés : {persons.length}</small>
            </div>
          </div>
        </div>

        <div className="row g-3 mt-3">
          {orderedGroups.map(({ task, persons, assignedNames }) => (
            <div className="col-12 col-md-6 col-lg-3" key={task}>
              <div className="card task-summary-card p-3 shadow-sm h-100">
                <div className="task-summary-image-wrapper mb-3">
                  <img src={TASK_IMAGES[task]} alt={task} className="task-summary-image rounded-4" />
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0">{task}</h6>
                  <span className="badge bg-primary">{persons.length}</span>
                </div>
                {persons.length > 0 ? (
                  <>
                    <p className="text-muted mb-2 small">{assignedNames}</p>
                    <ul className="mb-0 ps-3 task-name-list">
                      {persons.map((person) => (
                        <li key={person.id}>{person.full_name}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-muted mb-0">Aucun assigné</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3 mt-3">
          <div className="col-12">
            <div className="card p-4 shadow-sm">
              <h5>Répartition détaillée</h5>
                <div className="row gy-3">
                  {distribution && distributionMismatch ? (
                    <p className="text-muted">La distribution enregistrée ne correspond pas aux personnes actuelles — affichage d'un aperçu basé sur les présences actives.</p>
                  ) : (!distribution && (
                    <p className="text-muted">Aperçu de la répartition (prévisualisation basée sur les présences actives)</p>
                  ))}
                  {TASK_ORDER.map((task) => {
                    const assigned = grouped[task] || [];
                    return (
                      <div className="col-md-6" key={task}>
                        <div className="card task-card p-0 overflow-hidden h-100">
                          <div className="task-summary-image-wrapper mb-0">
                            <img src={TASK_IMAGES[task]} alt={task} className="task-summary-image rounded-4" />
                          </div>
                          <div className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6 className="mb-0">{task}</h6>
                              <span className="badge bg-primary">{assigned.length}</span>
                            </div>
                            <p className="small text-muted mb-2">{assigned.length} personne{assigned.length > 1 ? 's' : ''} assignée{assigned.length > 1 ? 's' : ''}</p>
                            {assigned.length > 0 ? (
                              <ul className="mb-0 ps-3 task-name-list">
                                {assigned.map((person) => (
                                  <li key={person.id}>{person.full_name}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted mb-0">Aucun assigné</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
