import { motion } from 'motion/react';
import { Zap, ArrowRight, Thermometer } from 'lucide-react';
import deliveryImg from "./DeliveryImage.jpeg";


export default function Hero({ onGetCovered }) {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-sm font-bold mb-8 border border-orange-100">
            <Zap size={14} fill="currentColor" />
            Instant Parametric Payouts
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] text-slate-900 mb-6">
            Don&apos;t let weather <br />
            <span className="text-orange-500">disrupt your income.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
            Gig delivery workers lose up to 30% of their earnings during heavy rain, heatwaves, and pollution spikes. <span className="font-bold text-slate-700">AegisAI</span> is the first AI-powered parametric insurance that pays you instantly when conditions get tough.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onGetCovered}
              className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
            >
              Get Covered Now <ArrowRight size={20} />
            </button>
            <button 
              onClick={onGetCovered}
              className="bg-white text-slate-900 border-2 border-slate-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Sign Up
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Floating Notification */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -top-6 -left-6 z-20 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 max-w-xs"
          >
            <div className="bg-red-50 p-3 rounded-xl text-red-500">
              <Thermometer size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heatwave Detected</p>
              <p className="font-bold text-slate-900">Payout Triggered</p>
            </div>
          </motion.div>

          <div className="relative rounded-[40px] overflow-hidden shadow-2xl">
            <img 
              src={deliveryImg} 
              alt="Delivery worker in city" 
              className="w-full aspect-square object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Background Decoration */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-50 rounded-full blur-[120px] opacity-50" />
        </motion.div>
      </div>
    </section>
  );
}
