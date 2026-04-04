export default function PrivacyPolicy() {
  return (
    <section className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-slate-200">
        <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-6">
          At AegisAI, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose personal information when you use our platform.
        </p>

        <h2 className="text-2xl font-bold mt-6 mb-2">1. Information We Collect</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>Personal details (name, phone number, email, address, etc.).</li>
          <li>Usage and analytics data to improve our services.</li>
          <li>Device and location data for risk assessments and payouts.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-6 mb-2">2. How We Use Data</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>Provide and improve insurance products.</li>
          <li>Process claims and verify eligibility against parametric triggers.</li>
          <li>Support account management, security, and fraud prevention.</li>
          <li>Send personalized alerts and policy updates.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-6 mb-2">3. Data Sharing</h2>
        <p className="text-slate-600">
          We do not sell personal information. We may share data with service providers, regulatory bodies, and partners for claims automation, KYC verification, and compliance.
        </p>

        <h2 className="text-2xl font-bold mt-6 mb-2">4. Your Rights</h2>
        <p className="text-slate-600">
          You may request access, correction, or deletion of your personal data by contacting support. We also respect opt-out preferences for marketing communications.
        </p>

        <p className="mt-8 text-sm text-slate-400">Last updated: April 2026</p>
      </div>
    </section>
  );
}
