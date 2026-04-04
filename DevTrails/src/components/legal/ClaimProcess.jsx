export default function ClaimProcess() {
  return (
    <section className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-slate-200">
        <h1 className="text-4xl font-extrabold mb-4">Claim Process</h1>
        <p className="text-slate-600 mb-6">AegisAI provides parametric claims based on objective trigger conditions (e.g., rain volume, AQI, temperature). Claim payments are automatic and near-instant.</p>

        <h2 className="text-2xl font-bold mt-6 mb-2">1. Trigger Verification</h2>
        <p className="text-slate-600">Our system monitors public weather and environmental feeds. When configured thresholds are confirmed for your region, a trigger event is recorded.</p>

        <h2 className="text-2xl font-bold mt-6 mb-2">2. Policy Eligibility</h2>
        <p className="text-slate-600">Coverage is active only after successful onboarding and premium payment. User location must match boundaries of the chosen risk zone.</p>

        <h2 className="text-2xl font-bold mt-6 mb-2">3. Payout Calculation</h2>
        <p className="text-slate-600">Payout amounts are determined by your plan’s max coverage (per-event and weekly), with standard reductions based on existing payouts.</p>

        <h2 className="text-2xl font-bold mt-6 mb-2">4. Payment</h2>
        <p className="text-slate-600">Once a trigger is approved, the claim is routed to your registered UPI/wallet and typically completes within 24 hours.</p>

        <h2 className="text-2xl font-bold mt-6 mb-2">5. Dispute & Support</h2>
        <p className="text-slate-600">If you believe a claim was incorrectly processed, contact support immediately with ride logs and location data.</p>

        <p className="mt-8 text-sm text-slate-400">Last updated: April 2026</p>
      </div>
    </section>
  );
}
