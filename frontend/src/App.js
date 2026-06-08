import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ExperiencePage from "./pages/ExperiencePage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AIConcierge from "./components/AIConcierge";
import WhatsAppCTA from "./components/WhatsAppCTA";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/experiences/:slug" element={<ExperiencePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <AIConcierge />
      <WhatsAppCTA />
    </BrowserRouter>
  );
}
