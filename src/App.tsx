import { Routes, Route } from 'react-router-dom';
import Welcome from './Welcome';
import Login from './Login';
import CreateAccount from './CreateAccount';
import StudentHome from './student_pages/StudentHome';
import MyClearance from './student_pages/MyClearance';
import Staff from './Staff';
import Admin from './Admin';
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/createaccount" element={<CreateAccount />} />
      <Route path="/student-home" element={<StudentHome />} />
      <Route path="/myclearance" element={<MyClearance />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}
