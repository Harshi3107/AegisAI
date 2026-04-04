import { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import { getProfile, loginUser, registerUser } from './services/api';
import HowItWorks from './components/home/HowItWorks';
import Triggers from './components/home/Triggers';
import CTA from './components/home/CTA';
import OnboardingView from './components/onboarding/OnboardingView';
import DashboardView from './components/dashboard/DashboardView';
import AdminDashboard from './components/dashboard/AdminDashboard';
import AccountView from './components/account/AccountView';
import AboutView from './components/about/AboutView';
import SigninView from './components/auth/SigninView';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import ClaimProcess from './components/legal/ClaimProcess';
import ErrorBoundary from './components/misc/ErrorBoundary';

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home', 'onboarding', 'signin', 'about', 'account', 'dashboard', 'privacy', 'terms', 'claim'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState('Low');
  const [userProfile, setUserProfile] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    const storedPlan = localStorage.getItem('aegis_selected_plan');
    const storedRisk = localStorage.getItem('aegis_selected_risk');
    const storedUser = localStorage.getItem('aegis_user_profile');

    if (storedPlan) {
      setSelectedPlan(storedPlan);
    }
    if (storedRisk) {
      setSelectedRisk(storedRisk);
    }
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserProfile(parsed);
      } catch (error) {
        console.warn('Invalid user profile data in localStorage', error);
      }
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetCovered = () => {
    setSelectedPlan(null);
    setSelectedRisk('Low');
    setView('onboarding');
    window.scrollTo(0, 0);
  };

  const refreshUserProfile = async () => {
    try {
      const res = await getProfile();
      if (res?.data) {
        setUserProfile(res.data);
      }
    } catch (error) {
      console.warn('Refresh user profile failed', error);
    }
  };

  const handleGoHome = () => {
    setView('home');
    window.scrollTo(0, 0);
  };

  const handleGoAbout = () => {
    setView('about');
    window.scrollTo(0, 0);
  };

  const handleGoSignin = () => {
    setView('signin');
    window.scrollTo(0, 0);
  };

  const handleGoDashboard = (plan = null, risk = 'Low') => {
    setView('dashboard');
    if (plan) {
      setSelectedPlan(plan);
      localStorage.setItem('aegis_selected_plan', plan);
    }
    setSelectedRisk(risk || 'Low');
    localStorage.setItem('aegis_selected_risk', risk || 'Low');
    window.scrollTo(0, 0);
  };

  const handleGoAccount = () => {
    setView('account');
    window.scrollTo(0, 0);
  };

  const handleGoAdmin = () => {
    setView('admin');
    window.scrollTo(0, 0);
  };

  const handleGoUserDash = () => {
    setView('dashboard');
    window.scrollTo(0, 0);
  };

  const persistSession = (saveProfile, destination = 'dashboard') => {
    let existingProfile = null;
    const storedUser = localStorage.getItem('aegis_user_profile');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const incomingUsername = profile?.username?.toLowerCase();
        const storedUsername = parsed?.username?.toLowerCase();
        const incomingPhone = profile?.phone;
        const storedPhone = parsed?.phone;

        if ((incomingUsername && storedUsername && incomingUsername === storedUsername) || (incomingPhone && storedPhone && incomingPhone === storedPhone)) {
          existingProfile = parsed;
        }
      } catch (error) {
        console.warn('Could not parse stored user profile for merge', error);
      }
    }

    const profilePatch = Object.fromEntries(
      Object.entries(saveProfile || {}).filter(([, value]) => value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== ''))
    );

    const policyId = profilePatch.policyId || existingProfile?.policyId || `AEGIS-${Math.floor(100000 + Math.random() * 900000)}`;
    const mergedProfile = {
      ...(existingProfile || {}),
      ...profilePatch,
      policyId,
      plan: profilePatch.plan || existingProfile?.plan || 'standard',
      risk: profilePatch.risk || existingProfile?.risk || 'Low'
    };
    setUserProfile(mergedProfile);
    setSelectedPlan(mergedProfile.plan);
    setSelectedRisk(mergedProfile.risk);

    localStorage.setItem('aegis_user_profile', JSON.stringify(mergedProfile));
    localStorage.setItem('aegis_selected_plan', mergedProfile.plan);
    localStorage.setItem('aegis_selected_risk', mergedProfile.risk);

    if (destination === 'account') {
      handleGoAccount();
      return;
    }

    handleGoDashboard(mergedProfile.plan, mergedProfile.risk);
  };

  const handleRegister = async (profile, destination = 'dashboard') => {
    try {
      const response = await registerUser({
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
        username: profile?.username,
        email: profile?.email,
        password: profile?.password,
        phone: profile?.phone,
        company: profile?.company,
        city: profile?.city,
        plan: profile?.plan,
        risk: profile?.risk,
        upi: profile?.upi,
        policyId: profile?.policyId
      });

      if (response?.data?.token) {
        localStorage.setItem('aegis_auth_token', response.data.token);
      }

      const user = response?.data?.user;
      if (user) {
        persistSession(user, destination);
      } else {
        persistSession(profile, destination);
      }
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const handleSignin = async (credentials, destination = 'dashboard') => {
    try {
      const identifier = String(credentials?.identifier || '').trim();
      const password = credentials?.password;
      const payload = { password };

      if (identifier.includes('@')) {
        payload.email = identifier;
      } else if (/^\d{10}$/.test(identifier)) {
        payload.phone = identifier;
      } else {
        payload.username = identifier;
      }

      const response = await loginUser(payload);
      if (response?.data?.token) {
        localStorage.setItem('aegis_auth_token', response.data.token);
      }

      if (response?.data?.user) {
        persistSession(response.data.user, destination);
        await refreshUserProfile();
        return;
      }

      throw new Error('Login response missing user profile');
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    setSelectedPlan(null);
    setSelectedRisk('Low');
    setView('home');
    localStorage.removeItem('aegis_user_profile');
    localStorage.removeItem('aegis_selected_plan');
    localStorage.removeItem('aegis_selected_risk');
    localStorage.removeItem('aegis_auth_token');
    window.scrollTo(0, 0);
  };

  const handleGoPrivacy = () => { setView('privacy'); window.scrollTo(0, 0); };
  const handleGoTerms = () => { setView('terms'); window.scrollTo(0, 0); };
  const handleGoClaim = () => { setView('claim'); window.scrollTo(0, 0); };
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
        <Navbar 
        isScrolled={isScrolled} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        view={view} 
        handleGoHome={handleGoHome} 
        handleGetCovered={handleGetCovered} 
        handleGoAbout={handleGoAbout}
        handleGoDashboard={() => handleGoDashboard(selectedPlan, selectedRisk)}
        handleGoAccount={handleGoAccount}
        handleGoAdmin={handleGoAdmin}
        handleGoUserDash={handleGoUserDash}
        handleGoSignin={handleGoSignin}
        userName={userProfile ? (userProfile.firstName || userProfile.username) : null}
        onLogout={handleLogout}
      />

      {view === 'home' && (
        <>
          <Hero onGetCovered={handleGetCovered} />
          <HowItWorks />
          <Triggers />
          <CTA onRegister={handleGetCovered} />
        </>
      )}

      {view === 'onboarding' && (
        <OnboardingView 
          onBack={handleGoHome}
          onComplete={(profile) => handleRegister(profile, 'account')}
        />
      )}

      {view === 'signin' && (
        <SigninView
          onSignIn={(credentials) => handleSignin(credentials, 'account')}
          onBack={handleGoHome}
          onSignup={handleGetCovered}
        />
      )}

      {view === 'dashboard' && (
        <DashboardView 
          onBack={handleGoHome}
          onLogout={handleLogout}
          selectedPlan={selectedPlan} 
          selectedRisk={selectedRisk} 
          userProfile={userProfile}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          setUserProfile={setUserProfile}
        />
      )}

      {view === 'account' && (
        <AccountView
          userProfile={userProfile}
          selectedPlan={selectedPlan}
          selectedRisk={selectedRisk}
          onBack={handleGoHome}
          onLogout={handleLogout}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard 
          onBack={handleGoHome} 
          demoMode={demoMode} 
          setDemoMode={setDemoMode}
        />
      )}

      {view === 'about' && (
        <AboutView onGetCovered={handleGetCovered} />
      )}

      {view === 'privacy' && <PrivacyPolicy />}
      {view === 'terms' && <TermsOfService />}
      {view === 'claim' && <ClaimProcess />}

      <Footer 
        handleGoHome={handleGoHome}
        handleGoAbout={handleGoAbout}
        handleGetCovered={handleGetCovered}
        handlePrivacyPolicy={handleGoPrivacy}
        handleTermsOfService={handleGoTerms}
        handleClaimProcess={handleGoClaim}
      />
    </div>
  </ErrorBoundary>
  );
}
