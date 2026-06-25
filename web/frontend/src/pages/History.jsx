import Navbar from "../components/Navbar";
import AdminNav from "../components/AdminNav";
import { useEffect, useState } from "react";
import axios from "../services/api";

export default function History(){
  const [hist,setHist]=useState([])
  const [personsMap, setPersonsMap] = useState({})

  async function load(){
    const [pRes, hRes] = await Promise.all([axios.get('/persons'), axios.get('/histories')])
    const map = {}
    pRes.data.forEach(p=> map[p.id]=p)
    setPersonsMap(map)
    setHist(hRes.data)
  }

  useEffect(()=>{ load() },[])

  return (
    <div>
      <Navbar />
      <main className="container mt-4">
        <AdminNav />
        <div className="card p-3 shadow-sm">
          <h5>Historique (2 dernières)</h5>cd 
          {hist.map(d=> (
            <div key={d.id} className="mb-3">
              <div className="small text-muted">{new Date(d.date).toLocaleString()}</div>
              <ul>
                {Object.entries(JSON.parse(d.assignments || '{}')).map(([pid, task])=> (
                  <li key={pid}>{personsMap[pid] ? personsMap[pid].full_name : `ID ${pid}` } — {task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
