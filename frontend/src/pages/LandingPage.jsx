import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useFadeIn } from '../hooks/useFadeIn';

/* ---------- inline icons ---------- */
const Icon = {
  bolt:    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  brain:   (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>),
  shield:  (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  bell:    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  upload:  (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
  log:     (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>),
  arrow:   (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
};

const FEATURES = [
  { icon: Icon.bolt,   title: 'Real-Time Tracking',           desc: 'Centralized dashboard with live status updates across all incidents.' },
  { icon: Icon.brain,  title: 'Smart Priority Classification',desc: 'AWS Lambda auto-evaluates ticket urgency from category + description.' },
  { icon: Icon.shield, title: 'Role-Based Access',            desc: 'Cognito-backed authentication with granular admin and user permissions.' },
  { icon: Icon.bell,   title: 'Instant Notifications',        desc: 'SNS-powered email alerts for ticket creation, assignment, and resolution.' },
  { icon: Icon.upload, title: 'Secure File Attachments',      desc: 'Upload screenshots and logs directly to S3 with presigned URLs.' },
  { icon: Icon.log,    title: 'Audit Trail',                  desc: 'Every ticket action logged with who, what, and when for full compliance.' },
];

const STEPS = [
  { n: 1, title: 'User Raises Ticket',         desc: 'With optional file attachments stored in S3.' },
  { n: 2, title: 'Lambda Classifies Priority', desc: 'Network outages auto-route to High priority.' },
  { n: 3, title: 'Admin Assigns and Tracks',   desc: 'Real-time dashboard for triage and resolution.' },
  { n: 4, title: 'SNS Notifies Stakeholders',  desc: 'Email on every ticket state change.' },
];

const SERVICES = [
  ['Amazon Cognito',      'JWT-based auth with role groups (Admins / Users).'],
  ['Amazon DynamoDB',     'Single-digit-ms ticket store with GSIs for fast queries.'],
  ['AWS Lambda',          'Serverless classifier reshapes priority from context.'],
  ['Amazon S3',           'Encrypted attachment storage via presigned URLs.'],
  ['Amazon SNS',          'Fan-out notifications by email and beyond.'],
  ['Amazon EC2 + Nginx',  'React SPA + Express API behind a single IAM-secured host.'],
  ['Amazon API Gateway',  'Public, throttled REST endpoint for the classifier.'],
  ['AWS CloudWatch',      'Centralized logs from Lambda + EC2 application.'],
];

/* ---------- nav ---------- */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm'
          : 'bg-white/0 border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">N</div>
          <span className="text-lg font-semibold text-slate-900 tracking-tight">NimbusDesk</span>
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#features" className="hidden sm:inline px-3 py-2 text-sm text-slate-600 hover:text-slate-900">Features</a>
          <a href="#how"      className="hidden sm:inline px-3 py-2 text-sm text-slate-600 hover:text-slate-900">How it works</a>
          <a href="#architecture" className="hidden sm:inline px-3 py-2 text-sm text-slate-600 hover:text-slate-900">Architecture</a>
          <Link
            to="/login"
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Sign In
          </Link>
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            Get Started {Icon.arrow}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 lg:min-h-screen lg:flex lg:items-center bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      {/* decorative blob */}
      <div aria-hidden className="absolute -top-32 -right-24 w-[480px] h-[480px] bg-indigo-200/40 rounded-full blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-slate-200/40 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
          Cloud-Native Incident Management
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
          Resolve incidents faster.<br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Built on AWS.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
          A lightweight, real-time ticketing system for IT support teams.
          Role-based access, priority classification, and instant notifications —
          all powered by serverless AWS infrastructure.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            Sign In {Icon.arrow}
          </Link>
          <a
            href="#architecture"
            className="inline-flex items-center px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium"
          >
            View Architecture
          </a>
        </div>

        <div className="mt-10">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Deployed on AWS
          </p>
          <div className="flex items-center justify-center flex-wrap gap-2">
            {['DynamoDB', 'Lambda', 'Cognito', 'S3', 'SNS', 'EC2', 'API Gateway'].map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- features ---------- */
function Features() {
  const fade = useFadeIn();
  return (
    <section id="features" ref={fade.ref} className={`py-20 ${fade.className}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Everything you need to stay ahead of incidents
          </h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Designed for small IT teams, but built on the same primitives that power the largest workloads on AWS.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */
function HowItWorks() {
  const fade = useFadeIn();
  return (
    <section id="how" ref={fade.ref} className={`py-20 bg-slate-50 ${fade.className}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">How it works</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">From a single click to a fully classified, assigned, and notified ticket.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* connecting line — desktop only */}
          <div aria-hidden className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" />
          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="relative z-10 mx-auto w-14 h-14 rounded-full bg-indigo-600 text-white text-lg font-semibold flex items-center justify-center shadow-md ring-4 ring-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- architecture diagram ---------- */
function ArchBox({ x, y, w, h, label, sub, accent = false }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={10}
        fill={accent ? '#eef2ff' : '#ffffff'}
        stroke={accent ? '#6366f1' : '#cbd5e1'}
        strokeWidth="1.5"
      />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 6 : h / 2 + 4)} textAnchor="middle"
            fontSize="13" fontWeight="600" fill="#0f172a" fontFamily="Inter, sans-serif">
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle"
              fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, dashed = false }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#94a3b8" strokeWidth="1.5"
      markerEnd="url(#arrowhead)"
      strokeDasharray={dashed ? '4 4' : undefined}
    />
  );
}

function Architecture() {
  const fade = useFadeIn();
  return (
    <section id="architecture" ref={fade.ref} className={`py-20 ${fade.className}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Architecture</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">End-to-end serverless and managed AWS services.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-10 overflow-x-auto">
          <svg viewBox="0 0 900 380" className="w-full h-auto" role="img" aria-label="NimbusDesk architecture diagram">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Browser */}
            <ArchBox x={20}  y={150} w={140} h={70} label="Browser" sub="React SPA" />
            <Arrow   x1={160} y1={185} x2={210} y2={185} />

            {/* EC2 with Nginx + Express */}
            <ArchBox x={210} y={120} w={170} h={130} label="EC2 (Nginx)" sub="Express API" accent />

            {/* Cognito (auth side) */}
            <ArchBox x={210} y={20}  w={170} h={60}  label="Amazon Cognito" sub="JWT auth" />
            <Arrow   x1={295} y1={80}  x2={295} y2={120} dashed />

            {/* DynamoDB */}
            <ArchBox x={430} y={30}  w={170} h={60}  label="DynamoDB" sub="Tickets · Users" />
            <Arrow   x1={380} y1={155} x2={430} y2={70} />

            {/* S3 */}
            <ArchBox x={430} y={110} w={170} h={60}  label="Amazon S3" sub="Attachments" />
            <Arrow   x1={380} y1={175} x2={430} y2={140} />

            {/* Lambda */}
            <ArchBox x={430} y={190} w={170} h={60}  label="AWS Lambda" sub="Classifier" accent />
            <Arrow   x1={380} y1={210} x2={430} y2={220} />

            {/* API Gateway -> Lambda (public alt path) */}
            <ArchBox x={430} y={270} w={170} h={60}  label="API Gateway" sub="POST /classify" />
            <Arrow   x1={515} y1={270} x2={515} y2={250} dashed />

            {/* SNS */}
            <ArchBox x={650} y={190} w={170} h={60}  label="Amazon SNS" sub="Notifications" />
            <Arrow   x1={600} y1={220} x2={650} y2={220} />

            {/* Email */}
            <ArchBox x={650} y={270} w={170} h={60}  label="Email Inbox" sub="Stakeholders" />
            <Arrow   x1={735} y1={250} x2={735} y2={270} />

            {/* CloudWatch — bottom */}
            <ArchBox x={650} y={30}  w={170} h={60}  label="CloudWatch" sub="Logs · Metrics" />
            <Arrow   x1={600} y1={60} x2={650} y2={60} dashed />
            <Arrow   x1={515} y1={190} x2={735} y2={90} dashed />
          </svg>

          <div className="text-xs text-slate-400 text-center mt-4">
            Solid lines: synchronous calls · Dashed lines: auth / async / observability
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 mt-10">
          {SERVICES.map(([name, role]) => (
            <div key={name} className="flex items-start gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{name}</div>
                <div className="text-sm text-slate-600">{role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA banner ---------- */
function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
      <div aria-hidden className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Ready to take control of your incidents?
        </h2>
        <p className="mt-3 text-indigo-100 text-lg">Sign in to your NimbusDesk workspace.</p>
        <Link
          to="/login"
          className="mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-semibold shadow-lg"
        >
          Sign In Now {Icon.arrow}
        </Link>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">N</div>
            <span className="text-lg font-semibold text-white tracking-tight">NimbusDesk</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">Cloud-native incident management.</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">Project</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#architecture" className="hover:text-white">Architecture</a></li>
            <li><a href="#features"     className="hover:text-white">Features</a></li>
            <li><Link to="/login"       className="hover:text-white">Sign In</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">Built for</div>
          <p className="text-sm leading-relaxed">
            Cloud Computing — CSI/SE/SS ZG527<br />
            BITS Pilani · Group 9
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-slate-500">
          © 2026 NimbusDesk · Built on AWS · Mumbai region
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-700">
      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <Architecture />
      <CtaBanner />
      <Footer />
    </div>
  );
}
