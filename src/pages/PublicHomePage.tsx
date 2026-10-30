import { ShieldCheck, Headphones, ClipboardCheck, Ticket, MessageSquareText, Info, ExternalLink, Fingerprint } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Link } from '@/lib/router';
import { HelplineForm } from '@/components/HelplineForm';
import { ServiceApplicationSection } from '@/components/ServiceApplicationSection';

const UIDAI_URL = 'https://uidai.gov.in';

const HERO_IMAGE =
  'https://images.pexels.com/photos/7709255/pexels-photo-7709255.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const FEATURES = [
  { icon: ClipboardCheck, titleKey: 'feature1Title', bodyKey: 'feature1Body' },
  { icon: Ticket, titleKey: 'feature2Title', bodyKey: 'feature2Body' },
  { icon: MessageSquareText, titleKey: 'feature3Title', bodyKey: 'feature3Body' },
] as const;

export function PublicHomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-teal-300">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold">{t.appName}</span>
          </a>
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-3">
            <a href="#features" className="hidden min-h-[44px] items-center rounded-lg px-3 text-slate-700 hover:bg-slate-100 sm:flex">
              {t.site.navServices}
            </a>
            <a href="#apply" className="flex min-h-[44px] items-center rounded-lg px-3 text-slate-700 hover:bg-slate-100">
              {t.site.navApply}
            </a>
            <a href="#helpline" className="flex min-h-[44px] items-center rounded-lg px-3 text-slate-700 hover:bg-slate-100">
              {t.site.navHelpline}
            </a>
            <Link to="/login" className="flex min-h-[44px] items-center rounded-lg border border-slate-300 px-3 text-slate-700 hover:bg-slate-50">
              {t.site.adminSignIn}
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">{t.site.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{t.site.heroBody}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#helpline"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-teal-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <Headphones className="h-4 w-4" aria-hidden="true" />
                {t.site.heroCta}
              </a>
              <a
                href={UIDAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition duration-200 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                <Fingerprint className="h-4 w-4" aria-hidden="true" />
                {t.site.aadhaarLogin}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t.site.aadhaarNote}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" loading="eager" />
          </div>
        </section>

        <section id="features" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-2xl font-bold text-slate-900">{t.site.featuresTitle}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
                <article key={titleKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{t.site[titleKey]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.site[bodyKey]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <ServiceApplicationSection />
        </section>

        <section id="helpline" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{t.site.helplineTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.site.helplineBody}</p>
          </div>
          <div className="card-surface p-6 sm:p-8">
            <HelplineForm />
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t.site.demoNote}
          </p>
        </section>
      </main>
    </div>
  );
}
