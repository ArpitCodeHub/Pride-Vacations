import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ExperiencesIndex from "./pages/ExperiencesIndex";
import ExperiencePage from "./pages/ExperiencePage";
import StoriesIndex from "./pages/StoriesIndex";
import StoryPage from "./pages/StoryPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
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
        <Route path="/experiences" element={<ExperiencesIndex />} />
        <Route path="/experiences/:slug" element={<ExperiencePage />} />
        <Route path="/stories" element={<StoriesIndex />} />
        <Route path="/stories/:slug" element={<StoryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <AIConcierge />
      <WhatsAppCTA />
    </BrowserRouter>
  );
}
