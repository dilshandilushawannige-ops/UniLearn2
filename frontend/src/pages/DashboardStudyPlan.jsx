import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import { studyPlansAPI } from '../api/studyPlans';

const DashboardStudyPlan = () => {
  const { user } = useAuth();

  // Form state
  const [year, setYear] = useState(user?.currentYear || 3);
  const [semester, setSemester] = useState(user?.currentSemester || 1);
  const [moduleCode, setModuleCode] = useState('');
  const [targetLecture, setTargetLecture] = useState(12);
  const [examDate, setExamDate] = useState('');
  const [dailyCommitment, setDailyCommitment] = useState(4.5);

  // Data state
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [availableLectures, setAvailableLectures] = useState([]);
  const [missingLectures, setMissingLectures] = useState([]);
  const [totalLectures, setTotalLectures] = useState(0);
  const [analyzedDocs, setAnalyzedDocs] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [difficulty, setDifficulty] = useState('Moderate');

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch modules when year/semester changes
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await modulesAPI.getModules({ year, semester });
        setModules(data);
        // Reset module selection when year/semester changes
        setModuleCode('');
        setAvailableLectures([]);
        setMissingLectures([]);
        setAnalyzedDocs(0);
        setTotalLectures(0);
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError('Failed to load modules. Please try again.');
      }
    };
    fetchModules();
  }, [year, semester]);

  // Fetch lectures when module changes
  useEffect(() => {
    if (moduleCode) {
      fetchModuleLectures();
    }
  }, [moduleCode, year, semester]);

  const fetchModuleLectures = async () => {
    try {
      setLoading(true);
      const resources = await resourcesAPI.getAll({
        year,
        semester,
        moduleCode,
        resourceType: 'lecture_pdf'
      });

      const lectureNos = resources.map(r => r.lectureNo).filter(Boolean);
      setAvailableLectures(lectureNos);
      setAnalyzedDocs(resources.length);

      // Find selected module details
      const module = modules.find(m => m.moduleCode === moduleCode);
      setSelectedModule(module);

      // Calculate total lectures (assume max lecture number or default to 15)
      const maxLecture = Math.max(...lectureNos, 15);
      setTotalLectures(maxLecture);
      setTargetLecture(Math.min(12, maxLecture));

      // Calculate missing lectures
      const allLectures = Array.from({ length: maxLecture }, (_, i) => i + 1);
      const missing = allLectures.filter(num => !lectureNos.includes(num));
      setMissingLectures(missing);

      // Estimate sessions (roughly 2 sessions per lecture)
      setTotalSessions(lectureNos.length * 2);

    } catch (err) {
      console.error('Error fetching lectures:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!moduleCode) {
      setError('Please select a module');
      return;
    }
    if (!examDate) {
      setError('Please select an examination date');
      return;
    }
    if (targetLecture < 1) {
      setError('Target lecture must be at least 1');
      return;
    }

    // Check if there are missing lectures
    const targetRange = Array.from({ length: targetLecture }, (_, i) => i + 1);
    const missingInRange = targetRange.filter(num => !availableLectures.includes(num));
    
    if (missingInRange.length > 0) {
      setError(`Cannot generate plan. Missing lectures: ${missingInRange.join(', ')}`);
      return;
    }

    try {
      setGenerating(true);
      
      const payload = {
        year,
        semester,
        moduleCode,
        lectureFrom: 1,
        lectureTo: targetLecture,
        examDate
      };

      await studyPlansAPI.generate(payload);
      setSuccess('Study plan generated successfully! Check your dashboard to view it.');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleRequestMissing = () => {
    // Navigate to upload page or show request form
    window.location.href = '/user-dashboard/upload';
  };

  const hasContentGap = missingLectures.length > 0 && targetLecture > 0;
  const missingInRange = missingLectures.filter(num => num <= targetLecture);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2D2D2D', marginBottom: '0.5rem' }}>
          Craft Your <span style={{ color: '#5F63F2' }}>Academic Pathway</span>
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B6B6B' }}>
          Generate AI-optimized study schedules tailored to your course load and examination targets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column - Plan Parameters */}
        <div>
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <span style={{ color: '#5F63F2' }}>⚙️</span>
              Plan Parameters
            </h3>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8B8B8B', fontWeight: '600' }}>
                  Academic Level
                </label>
                <select 
                  value={`${year}-${semester}`} 
                  onChange={(e) => {
                    const [y, s] = e.target.value.split('-');
                    setYear(Number(y));
                    setSemester(Number(s));
                    setModuleCode('');
                  }}
                  style={{ background: '#F5F6FA', border: 'none' }}
                >
                  {[1,2,3,4].map(y => [1,2].map(s => (
                    <option key={`${y}-${s}`} value={`${y}-${s}`}>
                      Year {y} | Semester {s}
                    </option>
                  )))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8B8B8B', fontWeight: '600' }}>
                  Module Code
                </label>
                <select 
                  value={moduleCode} 
                  onChange={(e) => setModuleCode(e.target.value)}
                  style={{ background: '#F5F6FA', border: 'none' }}
                  disabled={loading || modules.length === 0}
                >
                  <option value="">
                    {loading ? 'Loading modules...' : modules.length === 0 ? 'No modules available' : 'Select Module'}
                  </option>
                  {modules.map(m => (
                    <option key={m._id} value={m.moduleCode}>
                      {m.moduleCode} - {m.moduleName}
                    </option>
                  ))}
                </select>
                {modules.length === 0 && !loading && (
                  <p style={{ fontSize: '0.75rem', color: '#FC5C65', marginTop: '4px' }}>
                    No modules found for Year {year}, Semester {semester}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8B8B8B', fontWeight: '600' }}>
                  Target Lecture
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    value={targetLecture} 
                    onChange={(e) => setTargetLecture(Number(e.target.value))}
                    min="1"
                    max={totalLectures}
                    style={{ background: '#F5F6FA', border: 'none', paddingRight: '60px' }}
                  />
                  <span style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: '#8B8B8B'
                  }}>
                    / {totalLectures} Total
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8B8B8B', fontWeight: '600' }}>
                  Examination Date
                </label>
                <input 
                  type="date" 
                  value={examDate} 
                  onChange={(e) => setExamDate(e.target.value)}
                  style={{ background: '#F5F6FA', border: 'none' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8B8B8B', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                Daily Study Commitment
              </label>
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="0.5"
                value={dailyCommitment} 
                onChange={(e) => setDailyCommitment(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#5F63F2' }}
              />
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#5F63F2' }}>
                  {dailyCommitment}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#8B8B8B', marginLeft: '4px' }}>
                  Hours/Day
                </span>
              </div>
            </div>

            <div style={{ background: '#F0F1FF', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#5F63F2' }}>
              <span>ℹ️</span>
              <p style={{ margin: 0 }}>
                Study plans are only generated from uploaded lecture PDFs and short notes. 
                Ensure all relevant materials are present in the Resources section before proceeding.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📄</div>
              <div style={{ fontSize: '11px', color: '#8B8B8B', textTransform: 'uppercase', marginBottom: '4px' }}>
                Analyzed Docs
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2D2D2D' }}>
                {analyzedDocs} Files
              </div>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>⏱️</div>
              <div style={{ fontSize: '11px', color: '#8B8B8B', textTransform: 'uppercase', marginBottom: '4px' }}>
                Total Sessions
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2D2D2D' }}>
                {totalSessions} Units
              </div>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📊</div>
              <div style={{ fontSize: '11px', color: '#8B8B8B', textTransform: 'uppercase', marginBottom: '4px' }}>
                Difficulty Avg
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2D2D2D' }}>
                {difficulty}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Alerts & Actions */}
        <div>
          {/* Content Gap Alert */}
          {hasContentGap && missingInRange.length > 0 && (
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%)', 
              border: '2px solid #FC5C65',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '2rem' }}>⚠️</div>
                <div>
                  <h3 style={{ color: '#FC5C65', marginBottom: '8px' }}>
                    Wait! Content Gap Detected
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#6B6B6B', marginBottom: '12px' }}>
                    Lectures {missingInRange.join(', ')} are missing for this module. 
                    The generator requires these files to build a comprehensive plan.
                  </p>
                  <button 
                    onClick={handleRequestMissing}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#FC5C65', color: '#FC5C65' }}
                  >
                    📝 Request Missing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #5F63F2 0%, #7C5CFF 100%)', color: 'white', textAlign: 'center', padding: '32px' }}>
            <button 
              onClick={handleGeneratePlan}
              disabled={generating || !moduleCode || !examDate || missingInRange.length > 0}
              style={{
                background: 'white',
                color: '#5F63F2',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: (generating || !moduleCode || !examDate || missingInRange.length > 0) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <span>✨</span>
              {generating ? 'Generating Plan...' : 'Generate Plan with Available'}
            </button>
            {missingInRange.length === 0 && moduleCode && (
              <button 
                onClick={handleRequestMissing}
                style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid white',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '12px auto 0'
                }}
              >
                <span>📝</span>
                Continue →
              </button>
            )}
          </div>

          {/* Pro Tip */}
          <div className="card" style={{ background: '#F0F1FF', border: '1px solid #5F63F2', marginTop: '16px' }}>
            <div style={{ 
              background: '#5F63F2', 
              color: 'white', 
              padding: '4px 12px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: '600',
              display: 'inline-block',
              marginBottom: '8px'
            }}>
              PRO TIP
            </div>
            <p style={{ fontSize: '0.9rem', color: '#5F63F2', margin: 0 }}>
              Complete MCQ Practice sessions after each study block to increase plan efficiency by 24%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStudyPlan;
