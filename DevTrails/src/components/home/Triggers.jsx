import { CloudRain, Thermometer, Wind, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import parameterImg from "./ParametricTrigger.jpeg";


export default function Triggers() {
  const triggers = [
    { title: "Heavy Rainfall", value: "> 50mm / hour", icon: <CloudRain size={20} />, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Severe Heatwave", value: "> 45°C", icon: <Thermometer size={20} />, color: "text-red-500", bg: "bg-red-50" },
    { title: "Hazardous AQI", value: "AQI > 300", icon: <Wind size={20} />, color: "text-slate-500", bg: "bg-slate-100" },
    { title: "Govt. Disruptions", value: "Curfews/Lockdowns", icon: <AlertTriangle size={20} />, color: "text-amber-500", bg: "bg-amber-50" }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Transparent Triggers</h2>
          <p className="text-slate-500 mb-10 leading-relaxed">
            Unlike traditional insurance that relies on human adjusters to approve claims, AegisAI uses <span className="font-bold text-slate-900">Parametric Triggers</span>. When public data sources confirm a bad event, everyone in that zone gets paid instantly.
          </p>

          <div className="space-y-4">
            {triggers.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                    {item.icon}
                  </div>
                  <span className="font-bold text-slate-900">{item.title}</span>
                </div>
                <span className={cn("text-sm font-black uppercase tracking-wider", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <img 
            src={parameterImg}
            className="rounded-[40px] shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -z-10 inset-0 bg-orange-500/10 blur-[100px] rounded-full" />
        </div>
      </div>
    </section>
  );
}
