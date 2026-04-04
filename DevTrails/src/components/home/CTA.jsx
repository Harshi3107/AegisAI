export default function CTA({ onRegister }) {
  return (
    <section className="py-24 px-6 bg-orange-500 text-white text-center relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <h2 className="text-5xl font-black mb-6 leading-tight">Ready to protect your earnings?</h2>
        <p className="text-xl text-orange-100 mb-12">Join thousands of gig workers who are already covered against weather disruptions.</p>
        <button 
          onClick={onRegister}
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-black/20"
        >
          Register for AegisAI Now
        </button>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      </div>
    </section>
  );
}
