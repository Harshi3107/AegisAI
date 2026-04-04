import { useEffect, useState } from 'react';
import { Users, ClipboardList, DollarSign, ShieldCheck, AlertTriangle, AlertCircle, Triangle, MapPin } from 'lucide-react';
import { getEnvironmentalLogs, getClaims, getJobStatus, simulateEvent } from '../../services/api';

const DEMO_LOCATIONS = [
  { id: 'guntur', name: 'Guntur, Andhra Pradesh', lat: 16.5833, lng: 80.4667, region: 'AP', baseMultiplier: 1.0 },
  { id: 'hyderabad', name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867, region: 'TG', baseMultiplier: 1.1 },
  { id: 'bangalore', name: 'Bangalore, Karnataka', lat: 12.9716, lng: 77.5946, region: 'KA', baseMultiplier: 0.95 },
  { id: 'mumbai', name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777, region: 'MH', baseMultiplier: 1.2 },
  { id: 'delhi', name: 'Delhi, NCR', lat: 28.7041, lng: 77.1025, region: 'DL', baseMultiplier: 1.15 },
  { id: 'kolkata', name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639, region: 'WB', baseMultiplier: 1.05 }
];

export default function AdminDashboard({ onBack, demoMode, setDemoMode }) {
  const [logs, setLogs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(DEMO_LOCATIONS[0]);
  const [demoClaims, setDemoClaims] = useState([]);
  const [chartRange, setChartRange] = useState('week');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, claimsRes, jobRes] = await Promise.all([
        getEnvironmentalLogs(),
        getClaims(),
        getJobStatus()
      ]);
      setLogs(logsRes?.data || []);
      setClaims(claimsRes?.data || []);
      setJobStatus(jobRes?.data || null);
      setStatusMessage('Data refreshed');
    } catch (error) {
      console.error('Admin fetchData error', error);
      setStatusMessage('Error fetching data: ' + error.message);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const simulate = async (type) => {
    setStatusMessage('Simulating event...');
    try {
      await simulateEvent(type, selectedLocation.lat, selectedLocation.lng);
      
      // Calculate payout based on location and event type
      const basePayout = type === 'highRain' ? 300 : type === 'highAQI' ? 250 : 200;
      const regionPayout = Math.round(basePayout * selectedLocation.baseMultiplier);
      
      // Add demo claim
      setDemoClaims((prev) => [
        {
          _id: `demo-${Date.now()}`,
          trigger_type: type === 'highRain' ? 'rain' : type === 'highAQI' ? 'aqi' : 'heat',
          location: selectedLocation.name,
          region: selectedLocation.region,
          payout: regionPayout,
          status: 'PAID',
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      
      await new Promise((resolve) => setTimeout(resolve, 2200));
      await fetchData();
      setStatusMessage(`Simulation ${type} completed. Region: ${selectedLocation.region} • Payout: ₹${regionPayout}`);
    } catch (error) {
      console.error('Simulation failed', error);
      setStatusMessage(`Simulation failed: ${error.message}`);
    }
  };

  const allClaims = [...claims, ...demoClaims];
  const totalPayoutPending = allClaims.reduce((sum, c) => sum + (c.status === 'PENDING' ? (c.payout || 0) : 0), 0);
  const totalPayoutCompleted = allClaims.reduce((sum, c) => sum + (c.status === 'PAID' ? (c.payout || 0) : 0), 0);
  const totalPool = 500000; // Demo total pool
  const completedClaimsCount = allClaims.filter(c => c.status === 'PAID').length;
  const pendingClaimsCount = allClaims.filter(c => c.status === 'PENDING').length;
  
  // Calculate claims in last week
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekClaimsCount = allClaims.filter(c => new Date(c.createdAt) >= sevenDaysAgo).length;
  
  // Get unique regions from claims this week
  const activeRegions = Array.from(
    new Set(allClaims
      .filter(c => new Date(c.createdAt) >= sevenDaysAgo)
      .map(c => c.region || 'N/A'))
  ).join(', ') || 'None';
  
  const chartData = {
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      premiumFlow: [2500, 1500, 9800, 4000, 4800, 3800, 4300],
      claimPayout: [4000, 3000, 2000, 2800, 1900, 2400, 3500]
    },
    month: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      premiumFlow: [22000, 34000, 28000, 31000],
      claimPayout: [17000, 22000, 19000, 25000]
    }
  };

  const activeChart = chartData[chartRange];
  const chartMaxValue = Math.max(...activeChart.premiumFlow, ...activeChart.claimPayout, 1000);
  const yMax = Math.ceil(chartMaxValue / 2500) * 2500;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const chartWidth = 900;
  const chartHeight = 340;
  const margin = { top: 18, right: 22, bottom: 42, left: 52 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const toX = (index) => margin.left + (index * innerWidth) / (activeChart.labels.length - 1 || 1);
  const toY = (value) => margin.top + (1 - value / yMax) * innerHeight;

  const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

  const makeSmoothLinePath = (values) => {
    if (!values.length) return '';
    const points = values.map((value, index) => ({ x: toX(index), y: toY(value) }));
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const controlX = (p0.x + p1.x) / 2;
      path += ` C ${controlX} ${p0.y}, ${controlX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return path;
  };

  const makeAreaPath = (values) => {
    const linePath = makeSmoothLinePath(values);
    if (!linePath) return '';
    const startX = toX(0);
    const endX = toX(values.length - 1);
    const baseY = margin.top + innerHeight;
    return `${linePath} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
  };

  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    }
    return `₹${value}`;
  };

  const handleChartMouseMove = (event) => {
    const svgRect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - svgRect.left;
    const xInViewBox = (relativeX / svgRect.width) * chartWidth;
    const labelCount = activeChart.labels.length;
    const rawIndex = Math.round(((xInViewBox - margin.left) / innerWidth) * (labelCount - 1));
    const safeIndex = Math.max(0, Math.min(labelCount - 1, rawIndex));
    setHoveredIndex(safeIndex);
  };

  const handleChartLeave = () => {
    setHoveredIndex(null);
  };

  const hoverLabel = hoveredIndex !== null ? activeChart.labels[hoveredIndex] : null;
  const hoverPremium = hoveredIndex !== null ? activeChart.premiumFlow[hoveredIndex] : null;
  const hoverPayout = hoveredIndex !== null ? activeChart.claimPayout[hoveredIndex] : null;
  const hoverX = hoveredIndex !== null ? toX(hoveredIndex) : 0;
  const hoverPremiumY = hoveredIndex !== null ? toY(hoverPremium) : 0;
  const hoverPayoutY = hoveredIndex !== null ? toY(hoverPayout) : 0;
  const tooltipWidth = 94;
  const tooltipHeight = 94;
  const tooltipX = hoveredIndex !== null
    ? Math.min(Math.max(hoverX + 14, margin.left + 8), chartWidth - margin.right - tooltipWidth)
    : 0;
  const tooltipY = hoveredIndex !== null
    ? Math.min(
      Math.max(Math.min(hoverPremiumY, hoverPayoutY) - tooltipHeight / 2, margin.top + 8),
      margin.top + innerHeight - tooltipHeight - 8
    )
    : 0;

  useEffect(() => {
    setHoveredIndex(null);
  }, [chartRange]);

  const metrics = [
    { title: 'Total Pool', value: `₹${(totalPool / 1000).toFixed(0)}K`, icon: <DollarSign size={20} className="text-blue-500" />, bg: 'bg-blue-50', color: 'text-blue-500' },
    { title: 'Pending Claims', value: String(pendingClaimsCount), icon: <AlertTriangle size={20} className="text-orange-500" />, bg: 'bg-orange-50', color: 'text-orange-500' },
    { title: 'Completed Claims', value: String(completedClaimsCount), icon: <ClipboardList size={20} className="text-green-500" />, bg: 'bg-green-50', color: 'text-green-500' },
    { title: 'Payouts Completed', value: `₹${totalPayoutCompleted.toFixed(0)}`, icon: <ShieldCheck size={20} className="text-cyan-500" />, bg: 'bg-cyan-50', color: 'text-cyan-500' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Dashboard (Demo)</h1>
            <p className="text-slate-500 mt-2">Regional claims analytics, simulation panel, and payout insights.</p>
          </div>
          <button onClick={onBack} className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl hover:bg-slate-100 font-bold">Back to Home</button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{item.title}</h3>
                <div className={`${item.bg} p-2 rounded-lg`}>{item.icon}</div>
              </div>
              <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl font-bold text-slate-900">Financial Model Overview</h2>
              <select
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 font-medium focus:outline-none focus:border-orange-400"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartLeave}
            >
              <defs>
                <linearGradient id="premiumAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="payoutAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {yTicks.map((tickValue) => (
                <g key={tickValue}>
                  <line
                    x1={margin.left}
                    x2={chartWidth - margin.right}
                    y1={toY(tickValue)}
                    y2={toY(tickValue)}
                    stroke="#e2e8f0"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={margin.left - 10}
                    y={toY(tickValue) + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatYAxis(Math.round(tickValue))}
                  </text>
                </g>
              ))}

              <path d={makeAreaPath(activeChart.premiumFlow)} fill="url(#premiumAreaGradient)" />
              <path d={makeAreaPath(activeChart.claimPayout)} fill="url(#payoutAreaGradient)" />

              <path d={makeSmoothLinePath(activeChart.premiumFlow)} fill="none" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round" />
              <path d={makeSmoothLinePath(activeChart.claimPayout)} fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />

              {hoveredIndex !== null && (
                <>
                  <line
                    x1={hoverX}
                    x2={hoverX}
                    y1={margin.top}
                    y2={margin.top + innerHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />

                  <circle cx={hoverX} cy={hoverPremiumY} r="5" fill="#ea580c" stroke="#fff" strokeWidth="2" />
                  <circle cx={hoverX} cy={hoverPayoutY} r="5" fill="#111827" stroke="#fff" strokeWidth="2" />

                  <g transform={`translate(${tooltipX}, ${tooltipY})`} style={{ filter: 'drop-shadow(0 8px 16px rgba(15, 23, 42, 0.16))' }}>
                    <rect width={tooltipWidth} height={tooltipHeight} rx="14" fill="#ffffff" stroke="#e2e8f0" />
                    <text x="14" y="30" className="fill-slate-700 text-[10px] font-semibold">{hoverLabel}</text>
                    <text x="14" y="54" className="fill-orange-600 text-[12px] font-bold">{formatCurrency(hoverPremium)}</text>
                    <text x="14" y="78" className="fill-slate-900 text-[12px] font-bold">{formatCurrency(hoverPayout)}</text>
                  </g>
                </>
              )}

              {activeChart.labels.map((label, index) => (
                <text
                  key={label}
                  x={toX(index)}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="fill-slate-500 text-[12px]"
                >
                  {label}
                </text>
              ))}
            </svg>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Claims Last Week</h3>
              <p className="text-3xl font-black text-blue-500">{weekClaimsCount}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Active Regions (This Week)</h3>
              <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-lg">{activeRegions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Simulation Panel</h2>
            <button onClick={() => setDemoMode(!demoMode)} className="rounded-xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 font-medium">{demoMode ? 'Exit Demo' : 'Enter Demo'}</button>
          </div>

          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Select Location for Simulation
            </label>
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const loc = DEMO_LOCATIONS.find(l => l.id === e.target.value);
                setSelectedLocation(loc);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500">
              {DEMO_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-2">Region: <strong>{selectedLocation.region}</strong> • Payout Multiplier: <strong>{selectedLocation.baseMultiplier}x</strong></p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {['highRain', 'highAQI', 'heatSpike'].map((eventType) => {
              const basePayout = eventType === 'highRain' ? 300 : eventType === 'highAQI' ? 250 : 200;
              const regionPayout = Math.round(basePayout * selectedLocation.baseMultiplier);
              return (
                <button
                  key={eventType}
                  onClick={() => simulate(eventType)}
                  disabled={!demoMode}
                  className={`rounded-xl px-4 py-2 font-medium transition ${demoMode ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  Simulate {eventType === 'highRain' ? 'High Rain' : eventType === 'highAQI' ? 'High AQI' : 'Heat Spike'} • <strong>₹{regionPayout}</strong>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-slate-600">{statusMessage || 'Enable demo mode to run simulations. Payouts vary by region.'}</p>
          <p className="mt-2 text-xs text-slate-500">Selected Region: <strong>{selectedLocation.name}</strong> • After simulation, system refreshes metrics automatically.</p>
        </div>

        <p className="text-xs text-slate-500">Job status next run: {jobStatus?.nextRun ? new Date(jobStatus.nextRun).toLocaleString() : 'N/A'}</p>
        {loading && <p className="text-sm text-blue-500">Refreshing data...</p>}
      </div>
    </div>
  );
}
