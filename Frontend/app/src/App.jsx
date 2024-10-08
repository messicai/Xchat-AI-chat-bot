import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgetPasswordForm from "./components/ForgetPasswordForm";
import HomePage from "./components/HomePage";
import AdminDashboard from "./components/AdminDashboard";
import "./App.scss";
import { AuthProvider } from "./AuthContext";

function App() {
 return (
  <AuthProvider>
   <Router>
    <div>
     <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Signup />} />
      <Route path="/forget_password" element={<ForgetPasswordForm />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/homepage" element={<HomePage />} />
      <Route path="/" element={<Login />} />
     </Routes>
    </div>
   </Router>
  </AuthProvider>
 );
}

export default App;
