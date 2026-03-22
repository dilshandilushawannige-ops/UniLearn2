import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { studyPlansAPI } from '../api/studyPlans';
import { resourcesAPI } from '../api/resources';

const DashboardHome = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(user?.currentYear || 3);
  const [selectedSemester, setSelectedSemester] = useState(user?.currentSemester || 2);
  const [modules, setModules] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedYear, selectedSemester]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const modulesData = await modulesAPI.getModules({ 
        year: selectedYear, 
        semester: selectedSemester 
      });
      setModules(modulesData);

      const plansData = await studyPlansAPI.getAll();
      setStudyPlans(plansData);

      if (plansData.length > 0) {
        const avgProgress = plansData.reduce((sum, plan) => sum + plan.completionPercent, 0) / plansData.length;
        setOverallProgress(Math.round(avgProgress));
      }

      const resourcesData = await resourcesAPI.getAll({ 
        year: selectedYear, 
        semester: selectedSemester 
      });
      setRecentResources(resourcesData.slice(0, 4));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingTasks = () => {
    const tasks = [];
    studyPlans.forEach(plan => {
      const incompleteDays = plan.days?.filter(d => !d.completed).slice(0, 3);
      incompleteDays?.forEach((day, idx) => {
        if (tasks.length < 3) {
          tasks.push({
            id: `${plan._id}-${idx}`,
            title: day.topics?.[0] || `Day ${day.day} Tasks`,
            subtitle: `${plan.moduleCode} • ${day.date || 'Upcoming'}`,
            icon: getTaskIcon(idx),
            color: getTaskColor(idx),
            planId: plan._id
          });
        }
      });
    });
    return tasks;
  };

  const getTaskIcon = (idx) => {
    const icons = ['📄', '📝', '🔬', '📚', '💻'];
    return icons[idx % icons.length];
  };

  const getTaskColor = (idx) => {
    const colors = ['#FF9F43', '#5F63F2', '#A55EEA', '#26DE81', '#FC5C65'];
    return colors[idx % colors.length];
  };

  const getResourceIcon = (resourceType) => {
    const iconMap = {
      lecture_pdf: '📄',
      tutorial_pdf: '📝',
      past_paper: '📋',
      video_tutorial: '🎥',
      quick_notes: '📚',
      other: '📦'
    };
    return iconMap[resourceType] || '📄';
  };

  const getResourceColor = (idx) => {
    const colors = ['#26DE81', '#FC5C65', '#5F63F2', '#FD9644', '#A55EEA'];
    return colors[idx % colors.length];
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  const getModuleIcon = (moduleCode) => {
    if (moduleCode.includes('SE')) return '🛡️';
    if (moduleCode.includes('IT')) return '💻';
    if (moduleCode.includes('DS')) return '☁️';
    if (moduleCode.includes('DB')) return '💾';
    return '📚';
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const upcomingTasks = getUpcomingTasks();

  if (loading) {
    return <div className="loading-state">Loading dashboard...</div>;
  }

  return (
    <>
      {/* Top Section - 3 Cards */}
      <div className="dashboard-grid-top">
        {/* Study Progress */}
        <div className="card study-progress-card">
          <h3>Study Progress</h3>
          <div className="progress-circle">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#E8E8E8" strokeWidth="10" />
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                fill="none" 
                stroke="#5F63F2" 
                strokeWidth="10"
                strokeDasharray="314"
                strokeDashoffset={314 - (314 * overallProgress / 100)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="progress-text">
              <span className="progress-value">{overallProgress}%</span>
              <span className="progress-label">SEMESTER {selectedSemester}</span>
            </div>
          </div>
          <p className="progress-description">
            {studyPlans.length > 0 
              ? `Overall completion across ${studyPlans.length} study plan${studyPlans.length > 1 ? 's' : ''}`
              : 'No study plans yet. Create one to track progress!'}
          </p>
        </div>

        {/* Upcoming Tasks */}
        <div className="card upcoming-tasks-card">
          <div className="card-header">
            <h3>Upcoming Tasks</h3>
            <Link to="/user-dashboard/study-plans" className="view-all-link">View All</Link>
          </div>
          <div className="tasks-list">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => (
                <Link to="/user-dashboard/study-plans" key={task.id} className="task-item">
                  <div className="task-icon" style={{ backgroundColor: task.color + '20', color: task.color }}>
                    {task.icon}
                  </div>
                  <div className="task-info">
                    <h4>{task.title}</h4>
                    <p>{task.subtitle}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="empty-state">No upcoming tasks. Create a study plan to get started!</p>
            )}
          </div>
        </div>

        {/* Recent Resources */}
        <div className="card recent-resources-card">
          <div className="card-header">
            <h3>Recent Resources</h3>
            <Link to="/user-dashboard/resources" className="view-all-link">See New</Link>
          </div>
          <div className="resources-list">
            {recentResources.length > 0 ? (
              recentResources.map((resource, idx) => (
                <Link to="/user-dashboard/resources" key={resource._id} className="resource-item">
                  <div className="resource-icon" style={{ backgroundColor: getResourceColor(idx) + '20', color: getResourceColor(idx) }}>
                    {getResourceIcon(resource.resourceType)}
                  </div>
                  <div className="resource-info">
                    <h4>{truncateText(resource.title, 30)}</h4>
                    <p>{resource.moduleCode} • {formatTimeAgo(resource.createdAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="empty-state">No resources available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Study Plans */}
      {studyPlans.some(plan => plan.completionPercent < 100) && (
        <div className="card request-status-card">
          <h3>Active Study Plans</h3>
          {studyPlans.filter(plan => plan.completionPercent < 100).slice(0, 1).map(plan => (
            <div key={plan._id} className="request-item">
              <div className="request-info">
                <span className="request-title">{plan.moduleCode} - Lectures {plan.lectureFrom} to {plan.lectureTo}</span>
                <span className="request-badge">IN PROGRESS</span>
              </div>
              <div className="request-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${plan.completionPercent}%` }}></div>
                </div>
                <span className="request-status-text">{plan.completionPercent}% Complete</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Academic Modules */}
      <div className="card academic-modules-card">
        <div className="modules-header">
          <h3>Academic Modules <span className="info-icon">ℹ️</span></h3>
          <div className="modules-filters">
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              <option value={1}>Year 01</option>
              <option value={2}>Year 02</option>
              <option value={3}>Year 03</option>
              <option value={4}>Year 04</option>
            </select>
            <div className="semester-tabs">
              <button 
                className={selectedSemester === 1 ? 'active' : ''}
                onClick={() => setSelectedSemester(1)}
              >
                Semester 1
              </button>
              <button 
                className={selectedSemester === 2 ? 'active' : ''}
                onClick={() => setSelectedSemester(2)}
              >
                Semester 2
              </button>
            </div>
          </div>
        </div>

        <div className="modules-grid">
          {modules.length > 0 ? (
            modules.map(module => (
              <div key={module._id} className="module-card">
                <div className="module-header">
                  <span className="module-code">{module.moduleCode}</span>
                  <div className="module-icon" style={{ backgroundColor: '#5F63F2' + '20' }}>
                    {getModuleIcon(module.moduleCode)}
                  </div>
                </div>
                <h4>{module.moduleName}</h4>
                <p>{truncateText(module.moduleName, 80)}</p>
                <div className="module-footer">
                  <div className="student-info">
                    <div className="student-avatar">
                      {user?.username?.substring(0, 2).toUpperCase() || 'JD'}
                    </div>
                    <div>
                      <p className="student-name">{user?.username || 'Student'}</p>
                      <p className="student-id">STUDENT PRO</p>
                    </div>
                  </div>
                  <Link 
                    to={`/user-dashboard/resources?moduleCode=${module.moduleCode}`} 
                    className="view-resources-btn"
                  >
                    View Resources →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-modules">
              <p>No modules found for Year {selectedYear}, Semester {selectedSemester}</p>
            </div>
          )}

          {/* Request Elective Card */}
          <div className="module-card request-elective-card">
            <div className="request-elective-content">
              <div className="plus-icon">+</div>
              <p>Request Elective</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardHome;
