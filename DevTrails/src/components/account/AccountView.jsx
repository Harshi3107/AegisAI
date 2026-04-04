import { User, MapPin, ShieldCheck, Wallet, Phone, Mail, Building2, BadgeIndianRupee } from 'lucide-react';

const PLAN_DETAILS = {
  Low: {
    basic: { name: 'Basic', weekly: 70, perRide: 0.5, maxEvent: 400, maxWeekly: 800, payouts: { rain: 200, heat: 150, aqi: 150, flood: 400 } },
    standard: { name: 'Standard', weekly: 100, perRide: 0.7, maxEvent: 600, maxWeekly: 1200, payouts: { rain: 300, heat: 200, aqi: 200, flood: 600 } },
    premium: { name: 'Premium', weekly: 150, perRide: 1.0, maxEvent: 1000, maxWeekly: 2000, payouts: { rain: 400, heat: 300, aqi: 300, flood: 1000 } }
  },
  High: {
    essential: { name: 'Essential', weekly: 80, perRide: 0.6, maxEvent: 350, maxWeekly: 800, payouts: { rain: 200, heat: 150, aqi: 150, flood: 350 } },
    standard: { name: 'Standard', weekly: 120, perRide: 0.85, maxEvent: 700, maxWeekly: 1400, payouts: { rain: 350, heat: 250, aqi: 250, flood: 700 } },
    premium: { name: 'Premium', weekly: 180, perRide: 1.25, maxEvent: 1200, maxWeekly: 2400, payouts: { rain: 500, heat: 350, aqi: 350, flood: 1200 } }
  }
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
    <div className="rounded-lg bg-white p-2 border border-slate-200 text-slate-600">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-900 break-all">{value || 'N/A'}</p>
    </div>
  </div>
);

export default function AccountView({ userProfile, selectedPlan, selectedRisk, onBack, onLogout }) {
  const risk = selectedRisk || userProfile?.risk || 'Low';
  const planKey = selectedPlan || userProfile?.plan || 'standard';
  const plan = PLAN_DETAILS[risk]?.[planKey] || PLAN_DETAILS.Low.standard;

  const fullName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.name || userProfile?.username || 'User';
  const displayUsername = userProfile?.username || userProfile?.email?.split('@')?.[0] || userProfile?.firstName || 'N/A';

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Your Account</p>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">Welcome, {fullName}</h1>
              <p className="text-slate-500 mt-2">Your profile, location, and policy details are ready.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onBack} className="px-5 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-700">Home</button>
              <button onClick={onLogout} className="px-5 py-3 rounded-xl bg-red-500 text-white font-bold">Logout</button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black text-slate-900 mb-4">Profile Details</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <DetailRow icon={User} label="Username" value={displayUsername} />
              <DetailRow icon={User} label="Full Name" value={fullName} />
              <DetailRow icon={Mail} label="Email" value={userProfile?.email} />
              <DetailRow icon={Phone} label="Phone" value={userProfile?.phone} />
              <DetailRow icon={Building2} label="Company" value={userProfile?.company} />
              <DetailRow icon={MapPin} label="Location" value={userProfile?.location?.city || userProfile?.city} />
              <DetailRow icon={ShieldCheck} label="Risk Region" value={`${risk} Risk`} />
              <DetailRow icon={Wallet} label="Policy ID" value={userProfile?.policyId} />
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="text-xl font-black text-slate-900 mb-4">Plan Summary</h2>
            <div className="space-y-3">
              <div className="rounded-xl bg-white border border-orange-100 p-3">
                <p className="text-xs text-slate-500">Plan</p>
                <p className="text-lg font-black text-slate-900">{plan.name}</p>
              </div>
              <div className="rounded-xl bg-white border border-orange-100 p-3">
                <p className="text-xs text-slate-500">Weekly Premium</p>
                <p className="text-lg font-black text-slate-900">Rs.{plan.weekly}</p>
              </div>
              <div className="rounded-xl bg-white border border-orange-100 p-3">
                <p className="text-xs text-slate-500">Per Ride</p>
                <p className="text-lg font-black text-slate-900">Rs.{plan.perRide}</p>
              </div>
              <div className="rounded-xl bg-white border border-orange-100 p-3">
                <p className="text-xs text-slate-500">Coverage</p>
                <p className="text-sm font-bold text-slate-900">Max event: Rs.{plan.maxEvent}</p>
                <p className="text-sm font-bold text-slate-900">Weekly cap: Rs.{plan.maxWeekly}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">Trigger Payout Details</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">High Rain</p>
              <p className="text-2xl font-black text-blue-600">Rs.{plan.payouts.rain}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Heat Spike</p>
              <p className="text-2xl font-black text-amber-600">Rs.{plan.payouts.heat}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">High AQI</p>
              <p className="text-2xl font-black text-cyan-600">Rs.{plan.payouts.aqi}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Flood</p>
              <p className="text-2xl font-black text-emerald-600">Rs.{plan.payouts.flood}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 flex items-center gap-2">
            <BadgeIndianRupee size={16} className="text-orange-500" />
            Keep enough wallet balance and stay active to receive automatic payouts during trigger events.
          </div>
        </div>
      </div>
    </div>
  );
}
