export default function HowItWorks() {
  const steps = [
    { step: "01", title: "Subscribe", desc: "Sign up in 60 seconds. Premium is deducted automatically per-ride (just ₹0.50)." },
    { step: "02", title: "Monitor", desc: "Our AI continuously tracks hyper-local weather and AQI data in your zone." },
    { step: "03", title: "Trigger", desc: "If conditions breach thresholds (e.g., Rain >50mm), the policy is triggered." },
    { step: "04", title: "Payout", desc: "Money is instantly deposited directly to your UPI ID. No questions asked." }
  ];

  return (
    <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-extrabold mb-4">How AegisAI Works</h2>
          <p className="text-slate-400">Zero paperwork. Zero claims to file. 100% automated.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-12 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-[2px] bg-slate-800 -z-10" />

          {steps.map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(249,115,22,0.1)] group-hover:border-orange-500 transition-colors">
                <span className="text-2xl font-black text-orange-500">{item.step}</span>
              </div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-orange-500/5 blur-[120px]" />
    </section>
  );
}
