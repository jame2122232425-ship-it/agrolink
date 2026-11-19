import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sprout,
  UserRound,
} from 'lucide-react';
import { apiService, MarketCounty } from '../../services/apiService';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC<{ mode: AuthMode }> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [county, setCounty] = useState('');
  const [counties, setCounties] = useState<MarketCounty[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(false);
  const [countyLoadError, setCountyLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isRegister = mode === 'register';

  useEffect(() => {
    if (!isRegister) return undefined;

    let active = true;
    const controller = new AbortController();
    setCountiesLoading(true);
    apiService.getMarketCounties(controller.signal)
      .then((availableCounties) => {
        if (!active) return;
        if (availableCounties.length !== 47) {
          setCountyLoadError('All 47 counties could not be loaded. Please try again later.');
          return;
        }
        setCounties(availableCounties);
        setCountyLoadError('');
      })
      .catch((loadError: unknown) => {
        if (active) {
          setCountyLoadError(
            loadError instanceof Error
              ? loadError.message
              : 'County options could not be loaded. Please try again later.',
          );
        }
      })
      .finally(() => {
        if (active) setCountiesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isRegister]);

  const nextPath = searchParams.get('next');
  const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//')
    ? nextPath
    : '/dashboard';
  const fieldClassName =
    'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#16A34A] focus:bg-white focus:ring-4 focus:ring-emerald-100/80 disabled:cursor-not-allowed disabled:opacity-60';
  const labelClassName = 'mb-2 block text-xs font-semibold tracking-wide text-slate-700';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await apiService.register({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          password,
          password_confirm: passwordConfirm,
          farmer_profile: { county },
        });
      }

      await apiService.login(email.trim(), password);
      window.dispatchEvent(new Event('agrolink-authenticated'));
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not complete your request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7f2]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="relative hidden min-h-screen w-[43%] flex-col justify-between overflow-hidden bg-[#123d27] px-12 py-10 text-white lg:flex xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(134,239,172,0.22),transparent_38%),radial-gradient(ellipse_at_95%_85%,rgba(22,163,74,0.32),transparent_42%)]" />
          <div className="absolute -bottom-40 -left-36 h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="absolute -bottom-24 -left-20 h-[27rem] w-[27rem] rounded-full border border-white/10" />
          <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-emerald-200 ring-1 ring-white/15">
              <Sprout className="h-6 w-6" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              Agro<span className="text-emerald-300">Link</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-lg py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              One farmer. One platform.
            </span>
            <h1 className="mt-7 font-display text-4xl font-bold leading-[1.14] tracking-tight xl:text-5xl">
              {isRegister ? 'Build a stronger future for your farm.' : 'Good to have you back.'}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-emerald-50/75">
              {isRegister
                ? 'Bring your farm records together and connect with the agricultural support you need to grow.'
                : 'Sign in to pick up where you left off and keep your farm information close at hand.'}
            </p>
            <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Your farm data stays yours</p>
                <p className="mt-1 text-[11px] text-emerald-100/60">Secure access, built for farmers.</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-emerald-100/55">
            AgroLink · Practical tools for better farming
          </p>
        </aside>

        <section className="relative flex min-h-screen flex-1 flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg py-2 text-xs font-semibold text-slate-500 transition hover:text-[#14532D]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 font-display text-base font-bold text-[#14532D] lg:hidden">
              <Sprout className="h-5 w-5" />
              AgroLink
            </Link>
            <p className="hidden text-xs text-slate-400 sm:block">
              {isRegister ? 'Already a member?' : 'New to AgroLink?'}{' '}
              <Link
                to={isRegister ? '/login' : '/register'}
                className="font-semibold text-[#14532D] hover:underline"
              >
                {isRegister ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center py-9">
            <div className="w-full max-w-[480px]">
              <div className="mb-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#16A34A]">
                  Farmer account
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.15rem]">
                  {isRegister ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isRegister
                    ? 'A few details to get your farm workspace ready.'
                    : 'Sign in to continue to your farm workspace.'}
                </p>
              </div>

              {error && (
                <div
                  className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
                  role="alert"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {isRegister && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClassName}>First name <span className="text-red-600">*</span></span>
                        <span className="relative block">
                          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            required
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            className={fieldClassName}
                            placeholder="Your first name"
                          />
                        </span>
                      </label>
                      <label className="block">
                        <span className={labelClassName}>Last name <span className="text-red-600">*</span></span>
                        <span className="relative block">
                          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            required
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            className={fieldClassName}
                            placeholder="Your last name"
                          />
                        </span>
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClassName}>Phone number <span className="text-red-600">*</span></span>
                        <span className="relative block">
                          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            required
                            type="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className={fieldClassName}
                            placeholder="+254 7XX XXX XXX"
                          />
                        </span>
                      </label>
                      <label className="block">
                        <span className={labelClassName}>County <span className="text-red-600">*</span></span>
                        <span className="relative block">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <select
                            required
                            autoComplete="address-level1"
                            value={county}
                            onChange={(event) => setCounty(event.target.value)}
                            disabled={countiesLoading || Boolean(countyLoadError)}
                            className={`${fieldClassName} appearance-none pr-3`}
                          >
                            <option value="">
                              {countiesLoading ? 'Loading counties…' : 'Select county'}
                            </option>
                            {counties.map((countyOption) => (
                              <option key={countyOption.id} value={countyOption.name}>
                                {countyOption.name}
                              </option>
                            ))}
                          </select>
                        </span>
                        {countyLoadError && (
                          <span className="mt-1.5 block text-xs text-red-700" role="alert">
                            {countyLoadError}
                          </span>
                        )}
                      </label>
                    </div>
                  </>
                )}

                <label className="block">
                  <span className={labelClassName}>Email address{isRegister && <span className="text-red-600"> *</span>}</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={fieldClassName}
                      placeholder="you@example.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className={labelClassName}>Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type={passwordVisible ? 'text' : 'password'}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${fieldClassName} pr-12`}
                      placeholder={isRegister ? 'Create a password' : 'Enter your password'}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                      {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                {isRegister && (
                  <label className="block">
                    <span className={labelClassName}>Confirm password</span>
                    <span className="relative block">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type={passwordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                        className={fieldClassName}
                        placeholder="Enter your password again"
                      />
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || (isRegister && (countiesLoading || Boolean(countyLoadError)))}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(20,83,45,0.18)] transition hover:bg-[#0f3f2c] hover:shadow-[0_10px_22px_rgba(20,83,45,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Please wait…'
                    : isRegister
                      ? 'Create farmer account'
                      : 'Sign in to AgroLink'}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500 sm:hidden">
                {isRegister ? 'Already have an account?' : 'New to AgroLink?'}{' '}
                <Link
                  to={isRegister ? '/login' : '/register'}
                  className="font-semibold text-[#14532D] hover:underline"
                >
                  {isRegister ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
              <p className="mt-7 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-700/70" />
                Your account is managed securely by AgroLink.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
