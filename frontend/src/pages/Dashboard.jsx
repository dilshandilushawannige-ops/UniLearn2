import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import arrow1 from '../assets/arrow1.png';
import schoolGroupNarrow from '../assets/school-group-narrow.png';
import computerGroup from '../assets/computer-group.png';
import smartResourcesIcon from '../assets/SmartResources.png';
import studyPlansIcon from '../assets/StudyPlans.png';
import liveClassesIcon from '../assets/LiveClasses.png';
import mcqPracticeIcon from '../assets/MCQPractice.png';
import helpGettingStarted from '../assets/help-getting-started.png';
import helpUsingPlatform from '../assets/help-using-platform.png';
import helpProfile from '../assets/help-profile.png';
import helpTools from '../assets/help-tools.png';
import helpAdmin from '../assets/help-admin.png';
import helpTips from '../assets/help-tips.png';
import SignupModal from '../components/SignupModal';
import LoginModal from '../components/LoginModal';

const Dashboard = () => {
  const [typedText, setTypedText] = React.useState('');
  const [showSignupModal, setShowSignupModal] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [openFaqIndex, setOpenFaqIndex] = React.useState(0);

  React.useEffect(() => {
    const word = 'UniLearnHub';
    let index = 0;
    let isDeleting = false;
    let timer;

    const typeLoop = () => {
      if (!isDeleting) {
        setTypedText(word.substring(0, index + 1));
        index++;
        if (index === word.length) {
          isDeleting = true;
          timer = setTimeout(typeLoop, 2500); // Wait 2.5s before deleting
        } else {
          timer = setTimeout(typeLoop, 150); // Typing speed
        }
      } else {
        setTypedText(word.substring(0, index - 1));
        index--;
        if (index === 0) {
          isDeleting = false;
          timer = setTimeout(typeLoop, 800); // Wait before re-typing
        } else {
          timer = setTimeout(typeLoop, 75); // Deleting speed
        }
      }
    };

    timer = setTimeout(typeLoop, 500);
    return () => clearTimeout(timer);
  }, []);

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
              <span className="hero-brand">
                {typedText}
                <span className="typing-cursor">|</span>
              </span>
            </h1>
            <p className="hero-description">
              A unified platform for resources, study plans, and progress tracking. Designed for the academic excellence of SLIIT students.
            </p>
            <div className="hero-cta">
              <button
                onClick={() => setShowSignupModal(true)}
                className="btn-hero-primary"
                style={{ border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Get Started
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="btn-hero-secondary"
                style={{ border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Login
              </button>
            </div>
          </div>
          <div className="hero-right">
            <img src={heroImage} alt="Student learning" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="features-section-wrapper">
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
      </div>

      {/* Promo Banner Section */}
      <section className="promo-banner-section">
        <div className="promo-banner-container">
          <img src={schoolGroupNarrow} alt="" className="promo-banner-path promo-path-left" />

          <div className="promo-banner-content">
            <h2 className="promo-banner-heading">UniLearnHub for SLIIT Students</h2>
            <p className="promo-banner-subheading">
              Our comprehensive, standards-aligned platform empowers students and mentors to build essential academic skills in computing, business, engineering, and more through curated resources and smart study tools.
            </p>
            <button className="promo-banner-btn">Find out more</button>
          </div>

          <img src={computerGroup} alt="" className="promo-banner-path promo-path-right" />
        </div>
      </section>

      {/* Help Center Section */}
      <section className="help-section" id="help-center">
        <h2 className="section-heading">How can we help?</h2>
        <p className="section-subheading" style={{ marginBottom: '3.5rem' }}>
          Explore our guides, tips, and resources designed to help you make the most out of UniLearnHub.
        </p>

        <div className="help-grid">
          <div className="help-card">
            <img src={helpGettingStarted} alt="Getting started" className="help-card-icon" />
            <h3 className="help-card-title">Getting started</h3>
            <p className="help-card-desc">Welcome to UniLearnHub! Nice to see you here. Let's get started!</p>
          </div>

          <div className="help-card">
            <img src={helpUsingPlatform} alt="Using UniLearnHub" className="help-card-icon" />
            <h3 className="help-card-title">Using UniLearnHub</h3>
            <p className="help-card-desc">From resources to study plans, learn how UniLearnHub works from top to bottom.</p>
          </div>

          <div className="help-card">
            <img src={helpProfile} alt="Your profile & preferences" className="help-card-icon" />
            <h3 className="help-card-title">Your profile &amp; preferences</h3>
            <p className="help-card-desc">Adjust your profile and preferences to make UniLearnHub work just for you.</p>
          </div>

          <div className="help-card">
            <img src={helpTools} alt="Add tools to your studies" className="help-card-icon" />
            <h3 className="help-card-title">Add tools to your studies</h3>
            <p className="help-card-desc">Connect, simplify and automate. Discover the power of our study tools.</p>
          </div>

          <div className="help-card">
            <img src={helpAdmin} alt="Study group administration" className="help-card-icon" />
            <h3 className="help-card-title">Study group administration</h3>
            <p className="help-card-desc">Want to learn more about setting up your study group? Look no further!</p>
          </div>

          <div className="help-card">
            <img src={helpTips} alt="Tips, tricks & more" className="help-card-icon" />
            <h3 className="help-card-title">Tips, tricks &amp; more</h3>
            <p className="help-card-desc">Tips and tools for beginners and experts alike.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" id="faq">
        <div className="faq-layout">
          {/* Left Column */}
          <div className="faq-left">
            <div className="faq-badge">
              <span className="faq-badge-icon">#</span> Frequently asked questions
            </div>
            <h2 className="faq-heading-large">
              Frequently asked
              <span className="faq-heading-highlight">questions</span>
            </h2>
            <p className="faq-left-desc">
              Choose a plan that fits your study needs and schedule. No hidden barriers, no surprises—just straightforward access to powerful learning resources.
            </p>
          </div>

          {/* Right Column (Accordion) */}
          <div className="faq-right">
            {[
              {
                q: "What is UniLearnHub?",
                a: "UniLearnHub is an all-in-one educational platform designed to simplify learning, manage study resources securely, and track your progress in real-time."
              },
              {
                q: "How does UniLearnHub work?",
                a: "We curate lecture materials, quizzes, and live classes into easy-to-use study plans, ensuring you stay focused and organized."
              },
              {
                q: "Is UniLearnHub totally free for students?",
                a: "Yes! Core features of the platform are free for all students, ensuring education remains accessible to everyone."
              },
              {
                q: "Can UniLearnHub integrate with other tools?",
                a: "You can easily export your schedules to Google Calendar or connect external notetaking apps through our integrations hub."
              }
            ].map((faq, idx) => (
              <div key={idx} className={`faq-item-modern ${openFaqIndex === idx ? 'open' : ''}`}>
                <button 
                  className="faq-question-btn" 
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                >
                  {faq.q}
                  <span className="faq-icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                {openFaqIndex === idx && (
                  <div className="faq-answer-modern">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer Section */}
      <footer className="footer-section">
        <div className="footer-container">
          {/* Brand & Socials Column */}
          <div className="footer-col footer-brand-col">
            <h2 className="footer-logo">UniLearnHub™</h2>
            <p className="footer-desc">
              We offer a wide range of academic resources to meet all your needs, from quick revision materials to comprehensive study plans.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-icon">
                {/* Instagram Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" className="social-icon">
                {/* Facebook Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="#" className="social-icon">
                {/* X/Twitter Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="4" x2="20" y2="20"></line><line x1="20" y1="4" x2="4" y2="20"></line></svg>
              </a>
              <a href="#" className="social-icon">
                {/* YouTube Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
            </div>
          </div>

          {/* Links Column */}
          <div className="footer-col footer-links-col">
            <h3 className="footer-heading">Extra links</h3>
            <ul className="footer-list">
              <li><a href="#">Home</a></li>
              <li><a href="#">Resources</a></li>
              <li><a href="#">Study Plans</a></li>
              <li><a href="#">Live Classes</a></li>
              <li><a href="#">About Us</a></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="footer-col footer-contact-col">
            <h3 className="footer-heading">Contact</h3>
            <ul className="footer-list footer-contact-list">
              <li>SLIIT Campus</li>
              <li>Malabe, Sri Lanka</li>
              <li><a href="mailto:contact@unilearnhub.com">contact@unilearnhub.com</a></li>
              <li>+94 77 123 4567</li>
            </ul>
          </div>
        </div>
      </footer>

      {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }} />}
    </div>
  );
};

export default Dashboard;
