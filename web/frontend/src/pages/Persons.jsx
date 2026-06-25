import Navbar from "../components/Navbar";
import AdminNav from "../components/AdminNav";
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios, { API_BASE_HOST } from "../services/api";
import { FACULTIES } from "../data/faculties";

function getPhotoUrl(photoPath) {
  if (!photoPath) return null;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  return `${API_BASE_HOST}${photoPath}`;
}

export default function Persons(){
  const [persons,setPersons]=useState([])
  const [filter, setFilter] = useState('all')
  const [accessCode, setAccessCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [message, setMessage] = useState(null)
  const [editingPerson, setEditingPerson] = useState(null)
  const [editFullName, setEditFullName] = useState('')
  const [editAssignNumber, setEditAssignNumber] = useState('')
  const [editFacultyName, setEditFacultyName] = useState('')
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  // Ne pas persister l'autorisation : exiger le code à chaque visite
  const [authorized, setAuthorized] = useState(false)

  async function load(){
    const res = await axios.get('/persons')
    setPersons(res.data)
  }

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const navigate = useNavigate()

  const filteredPersons = persons.filter((p) => {
    if (filter === 'active') return p.active
    if (filter === 'disparu') return !p.active
    return true
  })

  useEffect(() => {
    if (authorized) load()
  }, [authorized])

  async function remove(id){
    if(!confirm('Supprimer cette personne ?')) return
    await axios.delete(`/persons/${id}`)
    load()
  }

  async function removeAll(){
    if(!persons.length) return
    if(!confirm('Supprimer toutes les personnes ?')) return
    await axios.delete('/persons')
    load()
  }

  function startEdit(p) {
    setEditingPerson(p)
    setEditFullName(p.full_name || '')
    setEditAssignNumber(p.assign_number || '')
    setEditFacultyName(p.faculty_name || '')
    setEditPhoto(null)
    setEditPreview(getPhotoUrl(p.photo_path))
  }

  function cancelEdit() {
    setEditingPerson(null)
    setEditFullName('')
    setEditAssignNumber('')
    setEditFacultyName('')
    setEditPhoto(null)
    setEditPreview(null)
  }

  function onEditFile(e) {
    const file = e.target.files[0]
    setEditPhoto(file)
    setEditPreview(file ? URL.createObjectURL(file) : getPhotoUrl(editingPerson?.photo_path))
  }

  async function saveEdit() {
    if (!editingPerson) return
    setEditSubmitting(true)
    try {
      const form = new FormData()
      form.append('full_name', editFullName)
      form.append('assign_number', editAssignNumber)
      form.append('faculty_name', editFacultyName)
      if (editPhoto) {
        form.append('photo', editPhoto)
      }
      await axios.put(`/persons/${editingPerson.id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage(`Informations de ${editFullName} mises à jour.`)
      await load()
      cancelEdit()
    } catch (err) {
      console.error(err)
      alert('Impossible de mettre à jour la personne.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function toggleActive(p) {
    await axios.put(`/persons/${p.id}`, { active: !p.active })
    setPersons((prev) => prev.map((person) =>
      person.id === p.id ? { ...person, active: !person.active } : person
    ))
    setMessage(p.active ? `${p.full_name} est maintenant disparu.` : `${p.full_name} est maintenant réactivé.`)
  }

  function enterCode() {
    setCodeError(null)
    const trimmed = (accessCode || '').trim()
    if (!trimmed) {
      setCodeError('Code requis pour accéder à cette page.')
      return
    }
    if (trimmed !== '8996') {
      setCodeError('Code incorrect. Veuillez saisir le code.')
      return
    }
    // Ne pas stocker le code en session : l'utilisateur devra le saisir à chaque visite
    setAuthorized(true)
    setAccessCode('')
  }

  
  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <AdminNav />
        {!authorized ? (
          <div className="card p-4 shadow-sm">
            <h5>Accès restreint</h5>
            <p className="text-muted">Veuillez entrer le code privé pour accéder à la gestion des personnes.</p>
            <div className="mb-3" style={{maxWidth:400}}>
              <label className="form-label">Code d’accès</label>
              <input type="password" className="form-control" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
              {codeError && <div className="text-danger mt-2">{codeError}</div>}
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={enterCode}>Entrer</button>
              <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Retour</button>
            </div>
          </div>
        ) : (
          <div className="card p-3 shadow-sm">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-3">
            <div>
              <h5 className="mb-1">Personnes</h5>
              {message && <div className="alert alert-success mt-2 mb-0">{message}</div>}
              <div className="btn-group" role="group" aria-label="Filtrer les personnes">
                <button type="button" className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')}>
                  Toutes
                </button>
                <button type="button" className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('active')}>
                  Actives
                </button>
                <button type="button" className={`btn btn-sm ${filter === 'disparu' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('disparu')}>
                  Disparues
                </button>
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={removeAll} disabled={!persons.length}>
              Tout effacer
            </button>
          </div>

          {editingPerson && (
            <div className="card card-body mb-4 border-primary shadow-sm">
              <h6 className="mb-3">Modifier {editingPerson.full_name}</h6>
              <div className="row gy-3">
                <div className="col-md-4">
                  <label className="form-label">Nom complet</label>
                  <input className="form-control" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Numéro d'affectation</label>
                  <input className="form-control" value={editAssignNumber} onChange={(e) => setEditAssignNumber(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Nom de la faculté</label>
                  <select className="form-select" value={editFacultyName} onChange={(e) => setEditFacultyName(e.target.value)}>
                    <option value="" disabled>Choisissez une faculté</option>
                    {FACULTIES.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Changer la photo</label>
                  <input type="file" accept="image/*" className="form-control" onChange={onEditFile} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Aperçu</label>
                  <div className="border rounded p-2" style={{minHeight:120, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    {editPreview ? (
                      <img src={editPreview} alt="Aperçu" style={{maxWidth:'100%', maxHeight:120, objectFit:'contain'}} />
                    ) : (
                      <span className="text-muted">Aucune photo sélectionnée</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={editSubmitting}>
                  {editSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={cancelEdit} disabled={editSubmitting}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-striped">
            <thead><tr><th>Nom complet</th><th>Numéro</th><th>Faculté</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredPersons.map(p=> (
                <tr key={p.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {p.photo_path ? (
                        <img
                          src={getPhotoUrl(p.photo_path)}
                          alt={p.full_name}
                          style={{width:40, height:40, objectFit:'cover', borderRadius:'50%'}}
                          className="me-2"
                        />
                      ) : (
                        <div
                          className="bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                          style={{width:40, height:40, borderRadius:'50%', fontSize:12}}
                        >
                          {p.full_name ? p.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <span>{p.full_name}</span>
                    </div>
                  </td>
                  <td>{p.assign_number}</td>
                  <td>{p.faculty_name}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${p.active ? 'bg-success' : 'bg-danger'}`}>
                      {p.active ? '🟢 Actif' : '🔴 Disparu'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>startEdit(p)}>Modifier</button>
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>toggleActive(p)}>
                      {p.active ? 'Disparaître' : 'Réactiver'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p.id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="persons-cards">
            {filteredPersons.map((p) => (
              <div className="person-card card mb-3" key={`card-${p.id}`}>
                <div className="card-body d-flex align-items-center">
                  <div className="me-3" style={{width:60, flex: '0 0 60px'}}>
                    {p.photo_path ? (
                      <img src={getPhotoUrl(p.photo_path)} alt={p.full_name} style={{width:60, height:60, objectFit:'cover', borderRadius:8}} />
                    ) : (
                      <div className="bg-secondary text-white d-flex align-items-center justify-content-center" style={{width:60, height:60, borderRadius:8}}>
                        {p.full_name ? p.full_name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <div style={{flex:1}}>
                    <div className="fw-bold">{p.full_name}</div>
                    <div className="text-muted small mb-1">{p.faculty_name} — {p.assign_number}</div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <span className={`badge ${p.active ? 'bg-success' : 'bg-danger'}`}>
                        {p.active ? '🟢 Actif' : '🔴 Disparu'}
                      </span>
                      <span className="text-muted small">{new Date(p.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="ms-3 d-flex flex-column" style={{gap:8, minWidth:130}}>
                    <button className="btn btn-sm btn-outline-primary" onClick={()=>startEdit(p)}>Modifier</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>toggleActive(p)}>
                      {p.active ? 'Disparaître' : 'Réactiver'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p.id)}>Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </main>
    </div>
  )
}
