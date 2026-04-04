import { Shield, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function Navbar({ isScrolled, mobileMenuOpen, setMobileMenuOpen, view, handleGoHome, handleGetCovered, handleGoAbout, handleGoDashboard, handleGoAccount, handleGoAdmin, handleGoUserDash, handleGoSignin, userName, onLogout, demoMode, setDemoMode }) {
  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleGoHome}>
            <div className="bg-orange-500 p-1.5 rounded-lg shadow-lg shadow-orange-200">
              <Shield className="text-white" size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight">Aegis<span className="text-orange-500">AI</span></span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={handleGoHome} className={cn("text-sm font-medium transition-colors", view === 'home' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>Home</button>
            <button onClick={handleGoAbout} className={cn("text-sm font-medium transition-colors", view === 'about' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>About</button>
            {userName ? (
              <>
                <button onClick={handleGoAccount} className={cn("text-sm font-medium transition-colors", view === 'account' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>My Account</button>
                <button onClick={handleGoDashboard} className={cn("text-sm font-medium transition-colors", view === 'dashboard' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>User Dashboard</button>
                <button onClick={handleGoAdmin} className={cn("text-sm font-medium transition-colors", view === 'admin' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>Admin Demo</button>
                <button onClick={() => setDemoMode(!demoMode)} className="text-sm font-medium text-indigo-500 hover:text-indigo-700">{demoMode ? 'Demo On' : 'Demo Off'}</button>
                <button onClick={onLogout} className="text-sm font-medium text-red-500 hover:text-red-700">Logout</button>
              </>
            ) : (
              <>
                <button onClick={handleGoSignin} className={cn("text-sm font-medium transition-colors", view === 'signin' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>Sign In</button>
                <button onClick={handleGoUserDash} className={cn("text-sm font-medium transition-colors", view === 'dashboard' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>User Demo</button>
                <button onClick={handleGoAdmin} className={cn("text-sm font-medium transition-colors", view === 'admin' ? "text-orange-500" : "text-slate-600 hover:text-orange-500")}>Admin Demo</button>
                <button 
                  onClick={handleGetCovered}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  Get Covered
                </button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[60] bg-white p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <Shield className="text-orange-500" size={28} />
                <span className="text-2xl font-bold">AegisAI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={28} />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              <button onClick={() => { handleGoHome(); setMobileMenuOpen(false); }} className={cn("text-xl font-bold text-left", view === 'home' ? "text-orange-500" : "")}>Home</button>
              <button onClick={() => { handleGoAbout(); setMobileMenuOpen(false); }} className={cn("text-xl font-bold text-left", view === 'about' ? "text-orange-500" : "")}>About</button>
              {userName ? (
                <>
                  <button onClick={() => { handleGoAccount(); setMobileMenuOpen(false); }} className={cn("text-xl font-bold text-left", view === 'account' ? "text-orange-500" : "")}>My Account</button>
                  <button onClick={() => { handleGoDashboard(); setMobileMenuOpen(false); }} className={cn("text-xl font-bold text-left", view === 'dashboard' ? "text-orange-500" : "")}>Dashboard</button>
                  <button onClick={() => { setDemoMode(!demoMode); setMobileMenuOpen(false); }} className="text-xl font-bold text-left text-indigo-600">{demoMode ? 'Demo mode on' : 'Demo mode off'}</button>
                  <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="text-xl font-bold text-left text-red-500">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => { handleGoSignin(); setMobileMenuOpen(false); }} className={cn("text-xl font-bold text-left", view === 'signin' ? "text-orange-500" : "")}>Sign In</button>
                  <button 
                    onClick={() => { handleGetCovered(); setMobileMenuOpen(false); }}
                    className="bg-slate-900 text-white w-full py-4 rounded-2xl text-lg font-bold mt-4"
                  >
                    Get Covered
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
