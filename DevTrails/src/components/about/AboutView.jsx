import { motion } from 'motion/react';
import { Shield, TrendingDown, Clock, CheckCircle2, Brain, Zap, Lock, Database, Globe, ArrowRight, BarChart3, Layers, Cpu, Code2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const InsightCard = ({ quote, author, location, tag }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit mb-6">
      {tag}
    </div>
    <p className="text-slate-600 italic mb-8 leading-relaxed">&quot;{quote}&quot;</p>
    <div>
      <p className="font-bold text-slate-900 text-sm">{author}</p>
      <p className="text-slate-400 text-xs">{location}</p>
    </div>
  </div>
);

const ParameterItem = ({ icon: Icon, title, description, color = "orange" }) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-50 hover:border-slate-100 transition-colors group">
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
      color === "orange" ? "bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white" : "bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"
    )}>
      <Icon size={20} />
    </div>
    <div>
      <h4 className="font-bold text-slate-900 text-sm leading-tight">{title}</h4>
      {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
    </div>
  </div>
);

const AIModuleCard = ({ icon: Icon, title, description, iconColor }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", iconColor)}>
      <Icon size={24} />
    </div>
    <h4 className="font-black text-slate-900 mb-3">{title}</h4>
    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
  </div>
);

export default function AboutView({ onGetCovered }) {
  return (
    <div className="pt-20 bg-white">
      {/* Hero Section */}
      <section className="bg-slate-950 py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-orange-500 font-black uppercase tracking-[0.3em] text-xs mb-6"
          >
            Our Mission
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight"
          >
            Protecting India&apos;s <br /> Gig Economy Workers
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto text-center"
          >
            <span className="block mb-3 text-slate-300">
              AI-powered parametric micro-insurance web application for delivery partners.
            </span>
            <span className="block">
              Millions of delivery partners lose 20–30% of their weekly income due to weather disruptions. AegisAI uses AI and parametric insurance to change that — one ₹0.50 deduction at a time.
            </span>
          </motion.p>
        </div>
      </section>

      {/* Interview Insights */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Interview Insights</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              AI-powered parametric micro-insurance web application for delivery partners.
              <br />
              We spoke directly with delivery partners across Zomato, Swiggy, Amazon, and Zepto to understand their pain points.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <InsightCard 
              tag="Income loss during rain"
              quote="When it rains heavily, I cannot work and my earnings drop. There is no compensation."
              author="Delivery Partner"
              location="Mumbai (Swiggy)"
            />
            <InsightCard 
              tag="Demand for simple insurance"
              quote="If there was simple insurance protecting weekly income, I would use it without hesitation."
              author="Delivery Partner"
              location="Delhi (Zomato)"
            />
            <InsightCard 
              tag="Need for automation"
              quote="Insurance should be simple and automatic for gig workers — we cannot manage paperwork."
              author="Delivery Partner"
              location="Bengaluru (Blinkit)"
            />
          </div>

          <div className="bg-slate-900 rounded-[40px] p-12 text-white">
            <h3 className="text-center text-xl font-black mb-12">Key Interview Findings</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-black text-orange-500 mb-2">20-30%</p>
                <p className="text-xs text-slate-400 leading-relaxed">Weekly income lost during heavy rain events</p>
              </div>
              <div>
                <p className="text-4xl font-black text-orange-500 mb-2">0%</p>
                <p className="text-xs text-slate-400 leading-relaxed">Workers with existing income protection insurance</p>
              </div>
              <div>
                <p className="text-4xl font-black text-orange-500 mb-2">3-5 days</p>
                <p className="text-xs text-slate-400 leading-relaxed">Average earnings disruption per monsoon week</p>
              </div>
              <div>
                <p className="text-4xl font-black text-orange-500 mb-2">100%</p>
                <p className="text-xs text-slate-400 leading-relaxed">Workers want simple, automatic insurance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parameters Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-6">Insurance Eligibility Parameters</h2>
            <p className="text-slate-500 mb-12 leading-relaxed">
              AegisAI ensures only active, genuine delivery partners receive coverage. Eligibility is verified automatically — no paperwork required.
            </p>
            <div className="space-y-4">
              <ParameterItem icon={Shield} title="Active delivery partner account" description="Zomato / Swiggy / Blinkit / Zepto / Amazon" />
              <ParameterItem icon={Clock} title="Worker must be logged into the delivery platform during the disruption" />
              <ParameterItem icon={Globe} title="Worker location must be within the affected delivery zone" />
              <ParameterItem icon={BarChart3} title="Minimum weekly working hours requirement met" />
              <ParameterItem icon={Lock} title="Verified mobile device and GPS access confirmed" />
              <ParameterItem icon={Zap} title="Valid UPI or payment method registered for instant payouts" />
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-6">AI Risk Analysis Parameters</h2>
            <p className="text-slate-500 mb-12 leading-relaxed">
              The AI engine analyzes multiple real-time and historical signals to calculate a risk score and set the weekly premium dynamically.
            </p>
            <div className="space-y-4">
              <ParameterItem color="slate" icon={Layers} title="Historical weather disruptions in the delivery zone" />
              <ParameterItem color="slate" icon={Cpu} title="Environmental risk levels — pollution and heat conditions" />
              <ParameterItem color="slate" icon={TrendingDown} title="Delivery demand patterns in the operating zone" />
              <ParameterItem color="slate" icon={CheckCircle2} title="Worker activity consistency on the platform" />
              <ParameterItem color="slate" icon={BarChart3} title="Past claim history of the worker" />
              <ParameterItem color="slate" icon={Globe} title="Probability of disruptions within a specific zone" />
              <ParameterItem color="slate" icon={Database} title="Average income patterns of the worker" />
              <ParameterItem color="slate" icon={Code2} title="Delivery platform downtime frequency" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Integration */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-4">AI Integration</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Every step of the AegisAI pipeline is powered by machine learning — from risk scoring to fraud detection.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <AIModuleCard 
              icon={Brain}
              title="Risk Scoring"
              description="AI analyzes weather patterns, pollution levels, and disruption history to calculate a risk score for each delivery zone. High-risk zones are flagged for elevated premiums."
              iconColor="bg-purple-50 text-purple-500"
            />
            <AIModuleCard 
              icon={BarChart3}
              title="Dynamic Premium Calculation"
              description="The system determines a weekly premium based on the AI risk score and the individual worker's delivery activity — ensuring fairness and financial sustainability."
              iconColor="bg-orange-50 text-orange-500"
            />
            <AIModuleCard 
              icon={Globe}
              title="Disruption Monitoring"
              description="Real-time environmental data — rainfall, temperature, AQI — is continuously monitored through external APIs to detect delivery disruptions the moment they occur."
              iconColor="bg-blue-50 text-blue-500"
            />
            <AIModuleCard 
              icon={Shield}
              title="Fraud Detection"
              description="AI identifies suspicious activities like GPS spoofing, duplicate claims, platform inactivity during claimed disruptions, and anomalous payout patterns."
              iconColor="bg-red-50 text-red-500"
            />
            <AIModuleCard 
              icon={Zap}
              title="Automated Claim Trigger"
              description="When a disruption threshold is crossed and eligibility is confirmed, the claim is automatically triggered and payment is released instantly — no human review needed."
              iconColor="bg-yellow-50 text-yellow-500"
            />
            <AIModuleCard 
              icon={CheckCircle2}
              title="Credibility Scoring"
              description="Each worker maintains a credibility score based on their platform history, claim frequency, and GPS consistency. Higher scores unlock faster payouts and better coverage."
              iconColor="bg-green-50 text-green-500"
            />
          </div>
        </div>
      </section>

      {/* Fraud Prevention */}
      <section className="py-32 px-6 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl font-black mb-8">Fraud Prevention & Detection</h2>
              <p className="text-slate-400 mb-12 leading-relaxed text-lg">
                AegisAI incorporates multiple verification layers to detect and prevent fraudulent activity — keeping premiums low for honest workers.
              </p>
              <div className="space-y-4">
                {[
                  "Verification using trusted external data sources (weather and pollution APIs)",
                  "GPS-based location validation within the affected zone",
                  "Verification of delivery platform activity during disruption periods",
                  "Duplicate claim detection using unique event identifiers",
                  "AI-based anomaly detection for suspicious claim patterns",
                  "Secure logging and audit trails for monitoring and investigation"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-orange-500 flex-shrink-0" size={20} />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Lock, title: "GPS Validation", desc: "Worker must be physically in the disrupted zone" },
                { icon: Shield, title: "Anomaly Detection", desc: "AI flags unusual claim frequency or patterns" },
                { icon: Database, title: "Audit Trails", desc: "Every event is logged and immutably recorded" },
                { icon: Globe, title: "External Verification", desc: "Weather / AQI data from trusted public APIs" }
              ].map((card, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-colors">
                  <card.icon className="text-orange-500 mb-6" size={24} />
                  <h4 className="font-bold mb-2 text-sm">{card.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Future Scope */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Future Scope</h2>
            <p className="text-slate-500">AegisAI is building towards a fully autonomous, trustless insurance ecosystem for India&apos;s gig economy.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Database, title: "Blockchain-based Claim Transparency", desc: "Every trigger event and payout will be recorded on a public blockchain ledger — providing immutable audit trails and building trust with workers, regulators, and platform partners. Workers can independently verify that every payout was fair and timely." },
              { icon: Brain, title: "Dynamic AI Pricing Models", desc: "Advanced machine learning models will continuously learn from real-time risk data — weather patterns, platform demand fluctuations, and macro disruptions — enabling truly personalized, dynamic premium pricing that reflects actual risk exposure." },
              { icon: Globe, title: "Platform API Integrations", desc: "Direct integrations with Zomato, Swiggy, Blinkit, Amazon Flex APIs to automatically verify worker activity, delivery counts, and login status — eliminating manual verification entirely." },
              { icon: Globe, title: "Regional Language Support", desc: "AegisAI will support Hindi, Tamil, Telugu, Kannada, Bengali and other regional languages to reach workers who are more comfortable in their native tongue — expanding financial inclusion across India." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-orange-500 mb-8">
                  <item.icon size={24} />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-4">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-32 px-6 bg-orange-500 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-black mb-8">Join AegisAI Today</h2>
          <p className="text-xl text-orange-100 mb-12 leading-relaxed">
            Be part of India&apos;s first AI-powered parametric micro-insurance network for gig delivery partners.
          </p>
          <button 
            onClick={onGetCovered}
            className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-orange-900/20 flex items-center gap-3 mx-auto"
          >
            Get Covered Now <ArrowRight size={24} />
          </button>
        </div>
      </section>
    </div>
  );
}
