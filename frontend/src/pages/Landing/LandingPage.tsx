import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  Leaf,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sprout,
  Tractor,
} from 'lucide-react';

const featureCards = [
  {
    icon: Leaf,
    title: 'Crop intelligence',
    description:
      'Track crop health, disease trends, and seasonal risks from one clear dashboard.',
  },
  {
    icon: CloudSun,
    title: 'Smart weather',
    description:
      'See rainfall and forecast alerts that help you plan spraying, irrigation, and harvest timing.',
  },
  {
    icon: MessageSquareText,
    title: 'Farmer support',
    description:
      'Share field updates, request guidance, and keep every case moving with documented follow-ups.',
  },
  {
    icon: BarChart3,
    title: 'Market signals',
    description:
      'Monitor commodity prices and opportunities so you can make timely decisions with confidence.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Register your farm',
    text: 'Create your profile, add parcels, and connect your crops, livestock, and field history.',
  },
  {
    number: '02',
    title: 'Monitor and act',
    text: 'Use irrigation, crop, and livestock insights to respond quickly to risk, demand, and performance.',
  },
  {
    number: '03',
    title: 'Grow with support',
    text: 'Access expert guidance, market updates, and institutional workflows from a single system.',
  },
];

const testimonials = [
  {
    title: 'Farm records',
    description: 'Keep essential details about farms, crops, and livestock together.',
  },
  {
    title: 'Case follow-up',
    description: 'Submit agricultural concerns and keep updates connected to each case.',
  },
  {
    title: 'Shared support',
    description: 'Connect farmers and authorized agricultural teams through one workflow.',
  },
];

const stats = [
  { value: 'Farm', label: 'records' },
  { value: 'Crop', label: 'observations' },
  { value: 'Case', label: 'follow-up' },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="AgroLink home">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14532D] text-lg font-bold text-[#86EFAC] shadow-lg shadow-emerald-200/60">
              A
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-slate-900">
                Agro<span className="text-[#16A34A]">Link</span>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="transition hover:text-slate-900">How it works</a>
            <a href="#impact" className="transition hover:text-slate-900">Impact</a>
            <a href="#pricing" className="transition hover:text-slate-900">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#14532D] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-[#0f3f2c]"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(134,239,172,0.25),transparent_30%),linear-gradient(135deg,#f8fafc_0%,#f0fdf4_42%,#f8fafc_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(22,163,74,0.12),transparent_24%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#14532D] shadow-sm">
                <Sprout className="h-3.5 w-3.5" />
                One platform for farming support
              </div>

              <h1 className="max-w-xl font-display text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Grow smarter,
                <span className="text-[#14532D]"> respond faster</span>,
                and keep every farm moving.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                AgroLink helps farmers, field teams, and staff coordinate crop health, livestock care,
                weather planning, and expert support from one simple workspace.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16A34A] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-[#15803d]"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  Explore features
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#16A34A]" /> Trusted by field teams
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-[#16A34A]" /> Built for Kenyan agricultural workflows
                </span>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-emerald-200/60 blur-3xl" />
              <div className="absolute -right-6 bottom-10 h-32 w-32 rounded-full bg-lime-200/60 blur-3xl" />

              <div className="relative w-full max-w-xl rounded-[32px] border border-slate-200 bg-white/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <div className="rounded-[28px] bg-slate-900 p-4 text-white shadow-inner shadow-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Farmer workspace</p>
                      <h2 className="mt-2 text-2xl font-bold">Your farm, connected</h2>
                    </div>
                    <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Ready to begin
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {stats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                        <div className="text-xl font-bold text-white">{stat.value}</div>
                        <div className="mt-1 text-[11px] text-slate-300">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-lime-400/10 p-4 ring-1 ring-emerald-400/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-100">Crop observations</p>
                        <p className="mt-2 text-2xl font-black text-white">Track and review</p>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200">
                        <Tractor className="h-7 w-7" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <CloudSun className="h-4 w-4" /> Weather
                      </div>
                      <div className="mt-3 text-lg font-bold text-white">Weather planning</div>
                      <div className="text-xs text-slate-300">Forecasts when configured</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <MessageSquareText className="h-4 w-4" /> Support
                      </div>
                      <div className="mt-3 text-lg font-bold text-white">Case follow-up</div>
                      <div className="text-xs text-slate-300">Keep updates connected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#16A34A]">
              Why farmers choose AgroLink
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Field operations, evidence, and expert support in one place.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#14532D]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                How it works
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                From field observation to coordinated action.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="text-sm font-semibold text-emerald-300">{step.number}</div>
                  <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="impact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[32px] bg-[#14532D] p-8 text-white shadow-xl shadow-emerald-200/50">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Impact
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white">
                Better visibility for every decision on the farm.
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  'Rapid issue tracking for crops and livestock',
                  'Clear coordination between farmers and field teams',
                  'Documented case management with evidence and follow-up',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-emerald-50">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#14532D]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-slate-100 py-20">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#16A34A]">
                  Ready to begin?
                </p>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Make better farm decisions with AgroLink.
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14532D] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-[#0f3f2c]"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  Talk to sales
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14532D] text-sm font-bold text-[#86EFAC]">
              A
            </div>
            <span className="font-semibold text-slate-800">AgroLink</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#features" className="transition hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="transition hover:text-slate-900">How it works</a>
            <a href="#impact" className="transition hover:text-slate-900">Impact</a>
          </div>

          <p>© 2026 AgroLink. Built for resilient agricultural support.</p>
        </div>
      </footer>
    </div>
  );
};
