import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Videos from "./pages/Videos";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Gallery from "./pages/Gallery";
import Persons from "./pages/Persons";
import Presences from "./pages/Presences";
import History from "./pages/History";
import About from "./pages/About";
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/videos" element={<Videos/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/admin" element={<AdminDashboard/>} />
        <Route path="/admin/gallery" element={<Gallery/>} />
        <Route path="/admin/persons" element={<Persons/>} />
        <Route path="/admin/presences" element={<Presences/>} />
        <Route path="/admin/history" element={<History/>} />
        <Route path="/about" element={<About/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
