import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import ResourceRequest from './pages/ResourceRequest';
import LiveClass from './pages/LiveClass';
import StudyPlan from './pages/StudyPlan';
import MCQ from './pages/MCQ';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />

          <Route
            path="/resource"
            element={<ProtectedRoute><Resources /></ProtectedRoute>}
          />
          <Route
            path="/resources"
            element={<ProtectedRoute><Resources /></ProtectedRoute>}
          />
          <Route
            path="/resource-request"
            element={<ProtectedRoute><ResourceRequest /></ProtectedRoute>}
          />
          <Route
            path="/live-class"
            element={<ProtectedRoute><LiveClass /></ProtectedRoute>}
          />
          <Route
            path="/study-plan"
            element={<ProtectedRoute><StudyPlan /></ProtectedRoute>}
          />
          <Route
            path="/mcq"
            element={<ProtectedRoute><MCQ /></ProtectedRoute>}
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
