import Navbar from "../components/Navbar";
import AdminNav from "../components/AdminNav";
import { useEffect, useState } from "react";
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';

import axios from "../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const TASKS = ['Toilette', 'Cuisinage', 'Balayage', 'Vaisselle'];

export default function AdminDashboard() {
  const [persons, setPersons] = useState([]);
  const [distribution, setDistribution] = useState(null);

  useEffect(() => {
    axios.get('/persons?active=true').then((r) => setPersons(r.data)).catch(() => {});
    axios.get('/distributions').then((r) => setDistribution(r.data?.[0] || null)).catch(() => {});
  }, []);

  async function refresh() {
    try {
      const [pRes, dRes] = await Promise.all([
        axios.get('/persons?active=true'),
        axios.get('/distributions'),
      ]);
      setPersons(pRes.data);
      setDistribution(dRes.data?.[0] || null);
    } catch (e) {
      // silent fail
    }
  }

  // listen for distribution updates triggered elsewhere (generate action)
  useEffect(() => {
    const handler = () => {
      axios.get('/persons?active=true').then((r) => setPersons(r.data)).catch(() => {});
      axios.get('/distributions').then((r) => setDistribution(r.data?.[0] || null)).catch(() => {});
    };
    window.addEventListener('distribution:updated', handler);
    return () => window.removeEventListener('distribution:updated', handler);
  }, []);

  const activePersons = persons.filter((p) => p.active);
  function getTaskTargetCounts(totalPeople) {
    if (!totalPeople || totalPeople <= 0) return TASKS.reduce((a, t) => ({ ...a, [t]: 0 }), {});
    const base = Math.floor(totalPeople / TASKS.length);
    const rem = totalPeople % TASKS.length;
    return TASKS.reduce((acc, task, i) => {
      acc[task] = base + (i < rem ? 1 : 0);
      return acc;
    }, {});
  }

  const assignments = distribution ? JSON.parse(distribution.assignments || '{}') : {};
  const counts = distribution
    ? TASKS.reduce((acc, task) => ({ ...acc, [task]: 0 }), {})
    : getTaskTargetCounts(activePersons.length);
  if (distribution) {
    Object.values(assignments).forEach((task) => {
      counts[task] = (counts[task] || 0) + 1;
    });
  }

  const personsById = persons.reduce((acc, person) => {
    acc[person.id] = person;
    return acc;
  }, {});

  const taskCards = TASKS.map((task, index) => {
    const assignedIds = Object.keys(assignments).filter((pid) => assignments[pid] === task);
    const assignedPeople = assignedIds.map((pid) => personsById[pid]).filter(Boolean);
    return {
      task,
      assignees: assignedPeople,
      color: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'][index],
    };
  });

  const distributionDate = distribution ? new Date(distribution.date).toLocaleDateString() : 'N/A';

  async function downloadDistributionPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 40;
    const contentWidth = pageWidth - marginLeft * 2;

    const drawBackground = () => {
      pdf.setFillColor(236, 249, 237);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setDrawColor(190);
      pdf.setLineWidth(0.5);
      pdf.rect(marginLeft / 2, marginLeft / 2, pageWidth - marginLeft, pageHeight - marginLeft, 'S');
    };

    drawBackground();
    pdf.setFontSize(22);
    pdf.setTextColor(28, 65, 34);
    pdf.text('Répartition des tâches', marginLeft, 60);
    pdf.setFontSize(11);
    pdf.setTextColor(64, 80, 59);
    pdf.text(`Date : ${distributionDate}`, marginLeft, 80);
    pdf.text(`Personnes actives : ${activePersons.length}`, marginLeft, 96);
    pdf.text(`Total inscrits : ${persons.length}`, marginLeft + 260, 96);

    let y = 120;

    const blockColors = [
      { fill: [241, 244, 255], accent: [78, 115, 223] },
      { fill: [232, 250, 241], accent: [28, 200, 138] },
      { fill: [227, 248, 250], accent: [54, 185, 204] },
      { fill: [255, 249, 229], accent: [246, 194, 62] },
    ];

    TASKS.forEach((task, index) => {
      const card = taskCards.find((c) => c.task === task);
      const assigned = card ? card.assignees : [];
      const blockHeight = 32 + Math.max(assigned.length, 1) * 16;
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
      pdf.text(`${task} (${assigned.length})`, marginLeft + 12, y + 24);

      pdf.setFontSize(10);
      pdf.setTextColor(30, 40, 36);
      const startY = y + 42;
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
    pdf.setTextColor(95, 110, 93);
    pdf.text('Généré depuis le tableau de bord admin de répartition des tâches.', marginLeft, pageHeight - 30);
    pdf.save('repartition-taches-admin.pdf');
  }

  function printDistribution() {
    if (!distribution) return;
    window.print();
  }

  const chartData = {
    labels: TASKS,
    datasets: [
      {
        label: 'Répartition',
        data: TASKS.map((task) => counts[task] || 0),
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
      },
    ],
  };

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <AdminNav />

        <div className="mb-3 no-print d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={downloadDistributionPdf}
            disabled={!distribution}
          >
            Télécharger PDF
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={printDistribution}
            disabled={!distribution}
          >
            Imprimer
          </button>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card admin-metric-card shadow-sm p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div className="metric-title">Répartition du jour</div>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                  onClick={refresh}
                  aria-label="Rafraîchir la distribution"
                  title="Rafraîchir"
                >
                  ⟳
                </button>
              </div>
              <div className="metric-value">{distribution ? 'Générée' : 'En attente'}</div>
              <div className="metric-note">Dernière génération : {distribution ? new Date(distribution.date).toLocaleDateString() : 'Aucune'}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card admin-metric-card shadow-sm p-4">
              <div className="metric-title">Personnes actives</div>
              <div className="metric-value">{activePersons.length}</div>
              <div className="metric-note">Total inscrits : {persons.length}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card admin-metric-card shadow-sm p-4">
              <div className="metric-title">Résumé</div>
              <div className="metric-value">{Object.keys(assignments).length} tâches</div>
              <div className="metric-note">Tâches prioritaires distribuées</div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm p-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Répartition actuelle</h5>
                <span className="badge bg-success">Aujourd'hui</span>
              </div>
              <div className="chart-card">
                <Pie data={chartData} />
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm p-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Affectations du jour</h5>
                <span className="text-muted small">{distribution ? `${Object.keys(assignments).length} assignations` : 'Aucune'}</span>
              </div>
              <div className="row g-3">
                {taskCards.map((card) => (
                  <div className="col-12" key={card.task}>
                    <div className="task-card d-flex align-items-center justify-content-between p-3 rounded-4" style={{ background: card.color + '15' }}>
                      <div>
                        <div className="task-name">{card.task}</div>
                        <div className="text-muted">{card.assignee}</div>
                      </div>
                      <span className="task-pill" style={{ background: card.color }}></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-1">
          <div className="col-lg-6">
            <div className="card shadow-sm p-4">
              <h5>Activité hebdomadaire</h5>
              <Line
                data={{
                  labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                  datasets: [
                    {
                      label: 'Présences',
                      data: [5, 6, 4, 7, 6, 8, 5],
                      borderColor: '#4e73df',
                      backgroundColor: 'rgba(78,115,223,0.12)',
                      fill: true,
                    },
                  ],
                }}
              />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card shadow-sm p-4">
              <h5>Priorités des tâches</h5>
              <div className="priority-list mt-3">
                <div className="priority-item">1. Toilette</div>
                <div className="priority-item">2. Cuisinage</div>
                <div className="priority-item">3. Balayage</div>
                <div className="priority-item">4. Vaisselle</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
