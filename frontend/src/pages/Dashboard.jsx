import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import arrow1 from '../assets/arrow1.png';
import smartResourcesIcon from '../assets/SmartResources.png';
import studyPlansIcon from '../assets/StudyPlans.png';
import liveClassesIcon from '../assets/LiveClasses.png';
import mcqPracticeIcon from '../assets/MCQPractice.png';

const Dashboard = () => {
  const features = [
    {
      icon: '📚',
      title: 'Smart Resources',
      description: 'Access organized lecture materials, notes, and study resources by module and semester.',
    },
    {
      icon: '🎯',
      title: 'Study Plans',
      description: 'Create personalized study schedules with smart milestones and progress tracking.',
    },
    {
      icon: '🎓',
      title: 'Live Classes',
      description: 'Join interactive sessions and revision events with peers and mentors.',
    },
    {
      icon: '📝',
      title: 'MCQ Practice',
      description: 'Test your knowledge with curated multiple-choice questions and instant feedback.',
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-landing">
        <div className="hero-container">
          <div className="hero-left">
            <p className="hero-badge">THE SCHOLARLY CURATOR</p>
            <h1 className="hero-main-title">
              Master Your<br />
              SLIIT<br />
              Modules with<br />
              <span className="hero-brand">UniLearnHub</span>
            </h1>
            <p className="hero-description">
              A unified platform for resources, study plans, and progress tracking. Designed for the academic excellence of SLIIT students.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn-hero-primary">Get Started</Link>
              <Link to="/login" className="btn-hero-secondary">Login</Link>
            </div>
          </div>
          <div className="hero-right">
            <img src={heroImage} alt="Student learning" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="how-it-works">
        <div className="arrow-decoration">
          <img src={arrow1} alt="" className="arrow-img" />
        </div>
        <h2 className="section-heading">How It Works</h2>
        <p className="section-subheading">With thousands of resources and tools, find the best way to excel in your studies</p>
        
        <div className="section-cta-wrapper">
          <button className="section-cta-btn">Dive right in</button>
        </div>

        <div className="features-grid-landing">
          <div className="feature-card-landing">
            <div className="feature-header">
              <div className="feature-icon">
                <img src={smartResourcesIcon} alt="Smart Resources" className="feature-icon-img" />
              </div>
              <h3 className="feature-title">Smart Resources</h3>
            </div>
            <p className="feature-description">Access organized lecture materials, notes, and study resources by module and semester. Browse through comprehensive PDFs, video tutorials, past papers, and quick revision notes. Everything you need is categorized and easily searchable to help you find exactly what you're looking for.</p>
            <button className="feature-btn">Explore Now</button>
          </div>
          
          <div className="feature-card-landing">
            <div className="feature-header">
              <div className="feature-icon">
                <img src={studyPlansIcon} alt="Study Plans" className="feature-icon-img" />
              </div>
              <h3 className="feature-title">Study Plans</h3>
            </div>
            <p className="feature-description">Create personalized study schedules with smart milestones and progress tracking. Set daily goals, track your completion rate, and stay motivated with visual progress indicators. Our intelligent system helps you organize your study time effectively and ensures you cover all topics before exams.</p>
            <button className="feature-btn">Explore Now</button>
          </div>
          
          <div className="feature-card-landing">
            <div className="feature-header">
              <div className="feature-icon">
                <img src={liveClassesIcon} alt="Live Classes" className="feature-icon-img" />
              </div>
              <h3 className="feature-title">Live Classes</h3>
            </div>
            <p className="feature-description">Join interactive sessions and revision events with peers and mentors. Participate in real-time discussions, ask questions, and collaborate with fellow students. Our live classes cover difficult topics, exam preparation strategies, and provide expert guidance to boost your understanding.</p>
            <button className="feature-btn">Explore Now</button>
          </div>
          
          <div className="feature-card-landing">
            <div className="feature-header">
              <div className="feature-icon">
                <img src={mcqPracticeIcon} alt="MCQ Practice" className="feature-icon-img" />
              </div>
              <h3 className="feature-title">MCQ Practice</h3>
            </div>
            <p className="feature-description">Test your knowledge with curated multiple-choice questions and instant feedback. Practice with module-specific quizzes, timed tests, and get detailed explanations for each answer. Track your performance over time and identify areas that need more focus to improve your exam readiness.</p>
            <button className="feature-btn">Explore Now</button>
          </div>
        </div>
      </section>

      {/* Help Center Section */}
      <section className="help-section" id="help-center">
        <h2 className="section-heading">Help Center</h2>
        <p className="section-subheading">Get the support you need</p>
        
        <div className="help-grid">
          <div className="help-card">
            <h3>📖 Getting Started</h3>
            <p>Learn how to set up your account and navigate the platform</p>
          </div>
          <div className="help-card">
            <h3>💬 Community Support</h3>
            <p>Connect with other students and share knowledge</p>
          </div>
          <div className="help-card">
            <h3>📧 Contact Us</h3>
            <p>Reach out to our support team for assistance</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" id="faq">
        <h2 className="section-heading">Frequently Asked Questions</h2>
        
        <div className="faq-container">
          <div className="faq-item">
            <h3 className="faq-question">Is UniLearnHub free to use?</h3>
            <p className="faq-answer">Yes! UniLearnHub is completely free for all students.</p>
          </div>
          
          <div className="faq-item">
            <h3 className="faq-question">How do I upload resources?</h3>
            <p className="faq-answer">After signing in, navigate to the Resources section and click the upload button to share your materials.</p>
          </div>
          
          <div className="faq-item">
            <h3 className="faq-question">Can I create custom study plans?</h3>
            <p className="faq-answer">Absolutely! Our Study Plans feature allows you to create personalized schedules tailored to your needs.</p>
          </div>
          
          <div className="faq-item">
            <h3 className="faq-question">How do live classes work?</h3>
            <p className="faq-answer">Live classes are interactive sessions where you can learn with peers and instructors in real-time.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Start Learning?</h2>
        <p>Join thousands of students already using UniLearnHub</p>
        <Link to="/signup" className="btn-cta">Create Your Account</Link>
      </section>
    </div>
  );
};

export default Dashboard;
