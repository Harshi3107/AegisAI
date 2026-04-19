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
  heatSpike: 'heat',
  flood: 'flood'
};

const SIMULATION_CONFIG = {
  highRain: {
    emoji: '🌧️',
    statusLabel: 'Rain',
    run: aiSimulateRain,
    triggerType: 'rain',
    value: 75,
    threshold: 50
  },
  heatSpike: {
    emoji: '🔥',
    statusLabel: 'Heatwave',
    run: aiSimulateHeatwave,
    triggerType: 'heat',
    value: 48,
    threshold: 42
  },
  highAQI: {
    emoji: '💨',
    statusLabel: 'AQI',
    run: aiSimulateAQI,
    triggerType: 'aqi',
    value: 470,
    threshold: 350
  },
  flood: {
    emoji: '🌊',
    statusLabel: 'Flood',
    run: aiSimulateFlood,
    triggerType: 'flood',
    value: 1,
    threshold: 1
  }
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
  const userRisk = selectedRisk || userProfile?.risk || 'Low';
  
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

  // Use selectedDemoPlan for demo mode, fall back to profile plan for live mode
  const effectiveRisk = selectedDemoPlan.region || userRisk;
  const planKey = selectedDemoPlan.plan || selectedPlan || userProfile?.plan;
  const activePlan = planKey ? PLAN_METRICS[effectiveRisk]?.[planKey] : null;
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

  const runSimulation = async (simulationType) => {
    if (!activePlan) {
      setStatusMessage('Please select a plan first.');
      return;
    }

    const simulation = SIMULATION_CONFIG[simulationType];
    if (!simulation) {
      setStatusMessage('Unknown simulation type.');
      return;
    }

    setSelectedSimulation(simulationType);
    setStatusMessage(`${simulation.emoji} Evaluating claim...`);

    try {
      let aiWarning = '';
      const payoutKey = TRIGGER_TO_PAYOUT_KEY[simulationType];
      const demoPayout = Number(activePlan?.payouts?.[payoutKey] || 0);

      // Keep backend simulation log behavior consistent in demo.
      // If backend DB is temporarily unavailable, continue demo claim evaluation.
      try {
        await simulateEvent(simulationType, lat, lng);
      } catch (backendError) {
        console.warn('Simulation backend sync skipped:', backendError?.message);
      }

      try {
        const response = await simulation.run();
        const result = response?.data;
        if (result?.status !== 'APPROVED') {
          aiWarning = ' AI marked it ineligible, but demo payout table applied.';
        }
      } catch (aiError) {
        aiWarning = ' AI service unavailable, demo payout table applied.';
      }

      // Demo behavior: always apply configured payout for selected plan + simulation.
      setDemoWalletBalance((prev) => Number((prev + demoPayout).toFixed(2)));
      setDemoClaims((prev) => [
        {
          _id: `demo-${Date.now()}`,
          trigger_type: simulation.triggerType,
          value: simulation.value,
          threshold: simulation.threshold,
          payout: demoPayout,
          status: 'PAID',
          plan: planKey,
          risk: effectiveRisk,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);

      setLastClaimMessage(`Claim updated for ${planName} (${effectiveRisk} risk). ₹${demoPayout} credited.`);

      await fetchData();
      setStatusMessage(`${simulation.statusLabel} simulation complete.${aiWarning}`);
    } catch (error) {
      console.error(`${simulationType} simulation failed`, error);
      setStatusMessage(`Error: ${error.message}`);
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

    const planDetails = claim.plan && claim.risk ? ` (${claim.risk} ${claim.plan} plan)` : '';
    return `${metricName} ${value} exceeded threshold ${threshold} -> ₹${payout} payout triggered automatically${planDetails}.`;
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
        : selectedSimulation === 'flood'
          ? 'Flood'
        : null;

  const shownClaims = [...demoClaims, ...claims].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

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
                    onClick={() => runSimulation('highRain')}
                    className="rounded-xl px-4 py-2 font-medium transition bg-cyan-600 text-white hover:bg-cyan-500">
                    🌧️ Simulate Rain
                  </button>
                  <button
                    onClick={() => runSimulation('heatSpike')}
                    className="rounded-xl px-4 py-2 font-medium transition bg-cyan-600 text-white hover:bg-cyan-500">
                    🔥 Simulate Heatwave
                  </button>
                  <button
                    onClick={() => runSimulation('highAQI')}
                    className="rounded-xl px-4 py-2 font-medium transition bg-cyan-600 text-white hover:bg-cyan-500">
                    💨 Simulate AQI
                  </button>
                  <button
                    onClick={() => runSimulation('flood')}
                    className="rounded-xl px-4 py-2 font-medium transition bg-cyan-600 text-white hover:bg-cyan-500">
                    🌊 Simulate Flood
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">{statusMessage || 'Click a simulation button to test the AI claim evaluation.'}</p>
                {selectedDemoPlan.plan && (
                  <p className="mt-2 text-xs text-slate-600">
                    Selected plan: <strong>{planName}</strong> | Region: <strong>{effectiveRisk}</strong>
                    {simulationReadableName && activePlan && (
                      <> | Expected {simulationReadableName} payout: <strong>₹{selectedSimulationPayout}</strong></>
                    )}
                  </p>
                )}
                {lastClaimMessage && <p className="mt-2 text-sm text-emerald-700 font-semibold">{lastClaimMessage}</p>}
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
