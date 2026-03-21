import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const cards = [
    {
      title: 'Resources',
      description: 'Browse and upload lecture materials by module and semester.',
      to: '/resource',
    },
    {
      title: 'Requests',
      description: 'Request missing notes or lecture files from peers and mentors.',
      to: '/resource-request',
    },
    {
      title: 'Live Classes',
      description: 'Join real-time sessions and revision events in your faculty.',
      to: '/live-class',
    },
    {
      title: 'Study Plans',
      description: 'Organize your preparation with smart schedules and milestones.',
      to: '/study-plan',
    },
  ];

  return (
    <div>
      <section className="hero">
        <p className="kicker">Student Learning Platform</p>
        <h1>Welcome to UniLearnHub</h1>
        <p>Access learning resources, request missing lectures, join live classes, and create study plans in one place.</p>

        <div className="hero-actions">
          {user ? (
            <Link to="/study-plan" className="btn btn-primary">Open Study Plan</Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary">Create Student Account</Link>
              <Link to="/login" className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.7)' }}>Login</Link>
            </>
          )}
        </div>
      </section>

      {user && (
        <div className="welcome-card">
          Logged in as <strong>{user.username}</strong> ({user.email}) | Year {user.currentYear} Semester {user.currentSemester}
        </div>
      )}

      <section className="feature-grid">
        {cards.map((card) => (
          <div key={card.title} className="feature-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <Link to={card.to} className="feature-link">Open section</Link>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
