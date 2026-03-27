import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import DashboardResources from './pages/DashboardResources';
import DashboardUpload from './pages/DashboardUpload';
import DashboardStudyPlan from './pages/DashboardStudyPlan';
import Resources from './pages/Resources';
import ResourceRequest from './pages/ResourceRequest';
import ResourceDetails from './pages/ResourceDetails';
import LiveClass from './pages/LiveClass';
import StudyPlan from './pages/StudyPlan';
import MCQ from './pages/MCQ';
import GameDashboard from './pages/GameDashboard';
import GameInvite from './pages/GameInvite';
import QuizBattle from './pages/QuizBattle';
import StackOver from './pages/StackOver';
import QuestionDetails from './pages/QuestionDetails';
import TopContributors from './pages/TopContributors';

const AppContent = () => {
  const location = useLocation();
  const hideNavbarPaths = ['/user-dashboard'];
  const hideNavbar = location.pathname.startsWith('/user-dashboard');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* User Dashboard with nested routes */}
        <Route path="/user-dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="resources" element={<DashboardResources />} />
          <Route path="resources/:id" element={<ResourceDetails />} />
          <Route path="upload" element={<DashboardUpload />} />
          <Route path="study-plans" element={<DashboardStudyPlan />} />
          <Route path="requests" element={<ResourceRequest />} />
          <Route path="questions" element={<StackOver />} />
          <Route path="questions/:id" element={<QuestionDetails />} />
          <Route path="top-contributors" element={<TopContributors />} />
          <Route path="mcq" element={<MCQ />} />
          <Route path="live-class" element={<LiveClass />} />
          <Route path="games" element={<GameDashboard />} />
          <Route path="games/invite/:studentId" element={<GameInvite />} />
          <Route path="games/battle/:battleId" element={<QuizBattle />} />
        </Route>

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
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
