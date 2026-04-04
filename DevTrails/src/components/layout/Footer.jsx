import { Shield } from 'lucide-react';

export default function Footer({ handleGoHome, handleGoAbout, handleGetCovered, handlePrivacyPolicy, handleTermsOfService, handleClaimProcess }) {
  return (
    <footer className="bg-slate-900 text-white pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={handleGoHome}>
              <Shield className="text-orange-500" size={32} />
              <span className="text-3xl font-bold">AegisAI</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              AI-powered parametric micro-insurance for gig delivery workers. Protecting your income against weather disruptions and unforeseen events.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Platform</h4>
            <ul className="space-y-4 text-slate-400">
              <li><button onClick={handleGoHome} className="hover:text-orange-500 transition-colors">Home</button></li>
              <li><button onClick={handleGoAbout} className="hover:text-orange-500 transition-colors">About & Mission</button></li>
              <li><button onClick={handleGetCovered} className="hover:text-orange-500 transition-colors">Sign Up</button></li>
              <li><button onClick={handleGetCovered} className="hover:text-orange-500 transition-colors">Get Covered</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Legal</h4>
            <ul className="space-y-4 text-slate-400">
              <li><button onClick={handlePrivacyPolicy} className="hover:text-orange-500 transition-colors">Privacy Policy</button></li>
              <li><button onClick={handleTermsOfService} className="hover:text-orange-500 transition-colors">Terms of Service</button></li>
              <li><button onClick={handleClaimProcess} className="hover:text-orange-500 transition-colors">Claim Process</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-sm">© 2026 AegisAI Insurance Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="text-slate-500 text-sm font-medium">Built for the gig economy.</p>
        </div>
      </div>
    </footer>
  );
}
