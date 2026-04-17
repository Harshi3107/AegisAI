import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Triangle, WalletCards } from 'lucide-react';
import { getEnvironmentalLogs, getClaims, getJobStatus, simulateEvent, createOrder, verifyPayment, getProfile } from '../../services/api';
import { simulateRain as aiSimulateRain, simulateHeatwave as aiSimulateHeatwave, simulateAQI as aiSimulateAQI, simulateFlood as aiSimulateFlood, getTriggerName } from '../../services/aiClaimService';

const PLAN_METRICS = {
  Low: {
    basic: { weekly: 70, perRide: 0.5, maxEvent: 400, maxWeekly: 800, payouts: { rain: 200, heat: 150, aqi: 150, flood: 400 } },
    standard: { weekly: 100, perRide: 0.7, maxEvent: 600, maxWeekly: 1200, payouts: { rain: 300, heat: 200, aqi: 200, flood: 600 } },
    premium: { weekly: 150, perRide: 1.0, maxEvent: 1000, maxWeekly: 2000, payouts: { rain: 400, heat: 300, aqi: 300, flood: 1000 } }
  },
  High: {
    essential: { weekly: 80, perRide: 0.6, maxEvent: 350, maxWeekly: 800, payouts: { rain: 200, heat: 150, aqi: 150, flood: 350 } },
    standard: { weekly: 120, perRide: 0.85, maxEvent: 700, maxWeekly: 1400, payouts: { rain: 350, heat: 250, aqi: 250, flood: 700 } },
    premium: { weekly: 180, perRide: 1.25, maxEvent: 1200, maxWeekly: 2400, payouts: { rain: 500, heat: 350, aqi: 350, flood: 1200 } }
  }
};

const statusBadges = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: <Triangle size={14} /> },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> },
  REVIEW: { label: 'Review', color: 'bg-amber-100 text-amber-700', icon: <AlertTriangle size={14} /> },
  SUSPICIOUS: { label: 'Suspicious', color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14} /> }
};

const TRIGGER_TO_PAYOUT_KEY = {
  highRain: 'rain',
  highAQI: 'aqi',
  heatSpike: 'heat'
};

const PLAN_PAYOUT_DISPLAY = {
  Low: [
    { plan: 'Basic', weekly: 70, payouts: { rain: 200, heat: 150, aqi: 150, flood: 400 } },
    { plan: 'Standard', weekly: 100, payouts: { rain: 300, heat: 200, aqi: 200, flood: 600 } },
    { plan: 'Premium', weekly: 150, payouts: { rain: 400, heat: 300, aqi: 300, flood: 1000 } }
  ],
  High: [
    { plan: 'Essential', weekly: 80, payouts: { rain: 200, heat: 150, aqi: 150, flood: 350 } },
    { plan: 'Standard', weekly: 120, payouts: { rain: 350, heat: 250, aqi: 250, flood: 700 } },
    { plan: 'Premium', weekly: 180, payouts: { rain: 500, heat: 350, aqi: 350, flood: 1200 } }
  ]
};

export default function DashboardView({ onBack, onLogout, selectedPlan, selectedRisk, userProfile, demoMode, setDemoMode, setUserProfile }) {
  const risk = selectedRisk || userProfile?.risk || 'Low';
  
  const [logs, setLogs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [jobStatus, setJobStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [lastClaimMessage, setLastClaimMessage] = useState('');
  const [demoWalletBalance, setDemoWalletBalance] = useState(1000);
  const [demoClaims, setDemoClaims] = useState([]);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [selectedDemoPlan, setSelectedDemoPlan] = useState({ region: null, plan: null });
  const [claimResult, setClaimResult] = useState(null);

  // Use selectedDemoPlan for demo mode, fall back to profile plan for live mode
  const planKey = selectedDemoPlan.plan || selectedPlan || userProfile?.plan;
  const activePlan = planKey ? PLAN_METRICS[risk]?.[planKey] : null;
  const planName = planKey ? planKey.charAt(0).toUpperCase() + planKey.slice(1) : 'No plan selected';

  const location = userProfile?.location;
  const lat = location?.lat || 19.0760;
  const lng = location?.lng || 72.8777;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, claimsRes, jobRes] = await Promise.all([
        getEnvironmentalLogs(lat, lng, userProfile?.location?.city || ''),
        getClaims(),
        getJobStatus()
      ]);
      setLogs(logsRes?.data || []);
      setClaims(claimsRes?.data || []);
      setJobStatus(jobRes?.data || null);
      setStatusMessage('Live data loaded');
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      setStatusMessage(`Failed to fetch dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demoMode && userProfile && Number(userProfile.wallet_balance || 0) < 1000) {
      const updatedProfile = { ...userProfile, wallet_balance: 1000 };
      setUserProfile(updatedProfile);
      localStorage.setItem('aegis_user_profile', JSON.stringify(updatedProfile));
    }
  }, [demoMode, userProfile, setUserProfile]);

  useEffect(() => {
    if (demoMode && demoWalletBalance < 1000) {
      setDemoWalletBalance(1000);
    }
  }, [demoMode, demoWalletBalance]);

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Razorpay SDK failed to load.'));
    document.body.appendChild(script);
  });

  const handleWithdraw = async () => {
    setTransactionMessage('Initiating withdrawal...');

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setTransactionMessage('Enter a valid withdrawal amount.');
      return;
    }

    if (!userProfile) {
      setTransactionMessage('User not loaded.');
      return;
    }

    if (amount > userProfile.wallet_balance) {
      setTransactionMessage('Withdrawal amount exceeds wallet balance.');
      return;
    }

    try {
      await loadRazorpayScript();

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error('Razorpay key is not configured (VITE_RAZORPAY_KEY_ID)');
      }

      const orderRes = await createOrder(amount);
      const orderId = orderRes?.data?.order_id;

      if (!orderId) {
        throw new Error('Failed to create payment order.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'AegisAI Wallet Withdrawal',
        description: `Withdraw ₹${amount} from wallet`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount
            });

            if (verifyRes.success) {
              setTransactionMessage(`✔️ Withdrawal successful. New wallet balance: ₹${verifyRes.data.wallet_balance}`);
              const profile = await getProfile();
              if (profile?.data) setUserProfile(profile.data);
              await fetchData();
            } else {
              setTransactionMessage('Payment verification failed.');
            }
          } catch (verifyError) {
            console.error('verify error', verifyError);
            setTransactionMessage(`Verification error: ${verifyError.message}`);
          }
        },
        prefill: {
          name: userProfile.name || userProfile.firstName || '',
          email: userProfile.email || ''
        },
        theme: { color: '#3b82f6' },
        modal: { ondismiss: () => setTransactionMessage('Payment flow canceled.') }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('withdraw error', error);
      setTransactionMessage(`Withdrawal setup failed: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // auto refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const simulate = async (type) => {
    if (!activePlan) {
      setStatusMessage('Please select a plan first.');
      return;
    }
    if (!demoMode) {
      setStatusMessage('Please enable Demo Mode first.');
      return;
    }
    
    setStatusMessage('Simulating event...');
    setSelectedSimulation(type);
    try {
      await simulateEvent(type, lat, lng);

      const payoutKey = TRIGGER_TO_PAYOUT_KEY[type] || 'rain';
      const demoPayout = Number(activePlan?.payouts?.[payoutKey] || 0);

      setDemoWalletBalance((prev) => Number((prev + demoPayout).toFixed(2)));
      setDemoClaims((prev) => [
        {
          _id: `demo-${Date.now()}`,
          trigger_type: payoutKey,
          value: type === 'highRain' ? 75 : type === 'highAQI' ? 470 : 48,
          threshold: type === 'highRain' ? 50 : type === 'highAQI' ? 350 : 42,
          payout: demoPayout,
          status: 'PAID',
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);

      await new Promise((resolve) => setTimeout(resolve, 2200));
      await fetchData();
      setLastClaimMessage(`Okay, you got claim. ₹${demoPayout} credited for this simulation.`);
      setStatusMessage(`Simulation ${type} completed. Okay, you got claim.`);
    } catch (error) {
      console.error('Simulation failed', error);
      setStatusMessage(`Simulation failed: ${error.message}`);
    }
  };

  // New simulation functions for AI backend
  const simulateRain = async () => {
    setStatusMessage('🌧️ Evaluating claim...');
    setClaimResult(null);
    try {
      const response = await aiSimulateRain();
      setClaimResult(response.data);
      setStatusMessage('Claim evaluation complete');
    } catch (error) {
      console.error('Rain simulation failed', error);
      setStatusMessage(`Error: ${error.message}`);
      setClaimResult({ error: error.message });
    }
  };

  const simulateHeatwave = async () => {
    setStatusMessage('🔥 Evaluating claim...');
    setClaimResult(null);
    try {
      const response = await aiSimulateHeatwave();
      setClaimResult(response.data);
      setStatusMessage('Claim evaluation complete');
    } catch (error) {
      console.error('Heatwave simulation failed', error);
      setStatusMessage(`Error: ${error.message}`);
      setClaimResult({ error: error.message });
    }
  };

  const simulateAQI = async () => {
    setStatusMessage('💨 Evaluating claim...');
    setClaimResult(null);
    try {
      const response = await aiSimulateAQI();
      setClaimResult(response.data);
      setStatusMessage('Claim evaluation complete');
    } catch (error) {
      console.error('AQI simulation failed', error);
      setStatusMessage(`Error: ${error.message}`);
      setClaimResult({ error: error.message });
    }
  };

  const simulateFlood = async () => {
    setStatusMessage('🌊 Evaluating claim...');
    setClaimResult(null);
    try {
      const response = await aiSimulateFlood();
      setClaimResult(response.data);
      setStatusMessage('Claim evaluation complete');
    } catch (error) {
      console.error('Flood simulation failed', error);
      setStatusMessage(`Error: ${error.message}`);
      setClaimResult({ error: error.message });
    }
  };

  const explainClaim = (claim) => {
    const triggerMap = {
      rain: 'Rainfall',
      heat: 'Temperature',
      aqi: 'AQI',
      flood: 'Rainfall (Flood)'
    };
    const metricName = triggerMap[claim.trigger_type] || claim.trigger_type;
    const value = claim.value;
    const threshold = claim.threshold;
    const payout = claim.payout ?? 0;

    return `${metricName} ${value} exceeded threshold ${threshold} → ₹${payout} payout triggered automatically.`;
  };

  const demoSteps = [
    'Normal state',
    'Trigger event',
    'Claim auto-generated',
    'Fraud detection (if repeated)'
  ];

  const displayedWalletBalance = demoMode
    ? Number((userProfile?.wallet_balance ?? demoWalletBalance)).toFixed(2)
    : Number(userProfile?.wallet_balance || 0).toFixed(2);

  const selectedSimulationPayoutKey = selectedSimulation ? TRIGGER_TO_PAYOUT_KEY[selectedSimulation] || 'rain' : null;
  const selectedSimulationPayout = selectedSimulation && activePlan
    ? Number(activePlan?.payouts?.[selectedSimulationPayoutKey] || 0)
    : 0;
  const simulationReadableName = selectedSimulation === 'highRain'
    ? 'High Rain'
    : selectedSimulation === 'highAQI'
      ? 'High AQI'
      : selectedSimulation === 'heatSpike'
        ? 'Heat Spike'
        : null;

  const shownClaims = claims.length ? claims : demoClaims;

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">AEGIS AI Dashboard</h1>
            <p className="text-slate-500 mt-2">Real-time parametric insurance monitoring for your policy.</p>
            <p className="text-slate-600 mt-1">Policy ID: <strong>{userProfile?.policyId || 'N/A'}</strong></p>
            {demoMode && (
              <div className="mt-2 rounded-lg bg-orange-100 border border-orange-300 p-3 text-orange-800 font-semibold">
                DEMO MODE ACTIVE — Simulated environmental conditions
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDemoMode(!demoMode)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">{demoMode ? 'Exit Demo' : 'Enter Demo'}</button>
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-white border border-slate-200">Back</button>
            <button onClick={onLogout} className="px-4 py-2 rounded-xl bg-red-500 text-white">Logout</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Live System Status</p>
            <p className="text-sm font-semibold text-slate-700">Monitoring environment automatically every 5 minutes</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Demo mode</p>
            <p className="text-sm font-semibold text-slate-700">{demoMode ? 'enabled' : 'disabled'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Env logs</p>
            <p className="text-xl font-bold text-slate-900">{logs.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Claims</p>
            <p className="text-xl font-bold text-slate-900">{claims.length}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Plan Selection</h2>
            <div className="mb-4 p-4 rounded-xl border border-slate-300 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700 mb-3">Choose your plan to proceed with simulations:</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-bold text-emerald-900 mb-3">Low-Risk Plans</p>
                  <div className="space-y-2">
                    {PLAN_PAYOUT_DISPLAY.Low.map((row) => (
                      <button
                        key={row.plan}
                        onClick={() => setSelectedDemoPlan({ region: 'Low', plan: row.plan.toLowerCase() })}
                        className={`w-full rounded-lg border-2 p-2 text-left transition ${
                          selectedDemoPlan.region === 'Low' && selectedDemoPlan.plan === row.plan.toLowerCase()
                            ? 'border-emerald-600 bg-emerald-100'
                            : 'border-emerald-200 bg-white hover:border-emerald-400'
                        }`}>
                        <p className="font-semibold text-sm text-emerald-900">{row.plan} (₹{row.weekly}/week)</p>
                        <p className="text-xs text-emerald-700">Rain ₹{row.payouts.rain} | Heat ₹{row.payouts.heat} | AQI ₹{row.payouts.aqi} | Flood ₹{row.payouts.flood}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-900 mb-3">High-Risk Plans</p>
                  <div className="space-y-2">
                    {PLAN_PAYOUT_DISPLAY.High.map((row) => (
                      <button
                        key={row.plan}
                        onClick={() => setSelectedDemoPlan({ region: 'High', plan: row.plan.toLowerCase() })}
                        className={`w-full rounded-lg border-2 p-2 text-left transition ${
                          selectedDemoPlan.region === 'High' && selectedDemoPlan.plan === row.plan.toLowerCase()
                            ? 'border-amber-600 bg-amber-100'
                            : 'border-amber-200 bg-white hover:border-amber-400'
                        }`}>
                        <p className="font-semibold text-sm text-amber-900">{row.plan} (₹{row.weekly}/week)</p>
                        <p className="text-xs text-amber-700">Rain ₹{row.payouts.rain} | Heat ₹{row.payouts.heat} | AQI ₹{row.payouts.aqi} | Flood ₹{row.payouts.flood}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-3">Simulation Controls</h2>
            {!selectedDemoPlan.plan ? (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 mb-4">
                <p className="text-sm font-semibold text-yellow-800">⚠️ Please select a plan above to enable simulations</p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={simulateRain}
                    className="rounded-xl px-4 py-2 font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition">
                    🌧️ Simulate Rain
                  </button>
                  <button
                    onClick={simulateHeatwave}
                    className="rounded-xl px-4 py-2 font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition">
                    🔥 Simulate Heatwave
                  </button>
                  <button
                    onClick={simulateAQI}
                    className="rounded-xl px-4 py-2 font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition">
                    💨 Simulate AQI
                  </button>
                  <button
                    onClick={simulateFlood}
                    className="rounded-xl px-4 py-2 font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition">
                    🌊 Simulate Flood
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">{statusMessage || 'Click a simulation button to test the AI claim evaluation.'}</p>
                {claimResult && !claimResult.error && (
                  <div className={`mt-4 rounded-xl border p-4 ${claimResult.status === 'APPROVED' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <h3 className="text-lg font-bold mb-3">🚀 Claim Evaluation Result</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Status:</span>
                        <span className={`font-bold ${claimResult.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                          {claimResult.status === 'APPROVED' ? '✅ APPROVED' : '❌ REJECTED'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Risk Score:</span>
                        <span className="font-semibold text-slate-900">{claimResult.risk_score?.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Zone:</span>
                        <span className="font-semibold text-slate-900">{claimResult.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Fraud Score:</span>
                        <span className="font-semibold text-slate-900">{claimResult.fraud_score?.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Trigger Type:</span>
                        <span className="font-semibold text-slate-900">{getTriggerName(claimResult.trigger_type)}</span>
                      </div>
                      {claimResult.status === 'APPROVED' && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-green-700 font-bold">✔️ Payout Eligible</p>
                          <p className="text-xs text-green-600 mt-1">Your claim has been automatically approved based on parametric triggers.</p>
                        </div>
                      )}
                      {claimResult.status === 'REJECTED' && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-red-700 font-bold">❌ No Payout</p>
                          <p className="text-xs text-red-600 mt-1">No valid trigger detected for this environmental event.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {claimResult?.error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={20} className="text-red-600" />
                      <span className="font-bold text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-700">{claimResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="self-start h-fit rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Demo Flow Helper</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
              {demoSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Wallet</h2>
            <p className="text-sm text-slate-700">Current wallet balance: <span className="font-bold">₹{displayedWalletBalance}</span></p>
            {demoMode && <p className="mt-1 text-xs font-semibold text-emerald-700">Demo balance seeded at ₹1000</p>}
            {demoMode && <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><WalletCards size={12} /> Claims will credit this wallet using plan payout table.</p>}
            <div className="mt-3 space-y-2">
              <input
                type="number"
                id="withdrawAmount"
                name="withdrawAmount"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Withdraw amount"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                onClick={handleWithdraw}
                disabled={!demoMode}
                className={`w-full rounded-lg px-4 py-2 font-semibold ${demoMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
                Withdraw via Razorpay Test
              </button>
              {transactionMessage && <p className="text-sm text-slate-600">{transactionMessage}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Claims</h2>
          <div className="space-y-3">
            {shownClaims.length === 0 ? (
              <p className="text-sm text-slate-500">No claims yet. To receive a claim payout, keep enough wallet balance, click Enter Demo, and run a simulation.</p>
            ) : shownClaims.map((claim) => {
              const badge = statusBadges[claim.status] || statusBadges.PENDING;
              const isReview = claim.status === 'REVIEW';
              const isSuspicious = claim.status === 'SUSPICIOUS';
              return (
                <div key={claim._id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{claim.trigger_type?.toUpperCase() || 'CLAIM'}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${badge.color}`}>
                      {badge.icon}{badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{explainClaim(claim)}</p>
                  {isReview && (
                    <p className="mt-2 rounded-lg bg-amber-100 border border-amber-200 p-2 text-xs text-amber-700">⚠️ Review required: potential risk of fraud.</p>
                  )}
                  {isSuspicious && (
                    <p className="mt-2 rounded-lg bg-red-100 border border-red-200 p-2 text-xs text-red-700">🚨 High Fraud Risk — Manual Review Required</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Environment Feed</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {logs.length === 0 ? (
              <div className="col-span-full rounded-lg border border-slate-200 p-3 text-xs text-slate-500">No environmental logs yet.</div>
            ) : logs.slice(0, 6).map((log) => (
              <div key={log._id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                <div className="text-sm font-semibold text-slate-800">{log.location?.city || 'unknown'}</div>
                <div className="text-xs text-slate-600">Rain: {log.rainfall}mm, Temp: {log.temperature}°C, AQI: {log.aqi}</div>
                <div className="text-xs text-slate-700">Risk: {(log.risk_score * 100).toFixed(1)}% {log.is_simulated ? '(Simulated)' : ''}</div>
              </div>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Refreshing data ...</p>}
        {jobStatus && <p className="text-xs text-slate-400">Cron status next run: {new Date(jobStatus.nextRun).toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
