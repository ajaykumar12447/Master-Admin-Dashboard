import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ApplicationService } from '@/lib/types';
import { ServiceApplicationForm } from '@/components/ServiceApplicationForm';

const SERVICES: ApplicationService[] = ['pan', 'voter_id'];

export function ServiceApplicationSection() {
  const { t } = useI18n();
  const [service, setService] = useState<ApplicationService>('pan');
  const labels: Record<ApplicationService, string> = { pan: t.site.panTab, voter_id: t.site.voterTab };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">{t.site.applyTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.site.applyBody}</p>
      </div>
      <div role="tablist" className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {SERVICES.map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            aria-selected={service === item}
            onClick={() => setService(item)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              service === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {labels[item]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="card-surface p-6 sm:p-8">
        <ServiceApplicationForm key={service} service={service} />
      </div>
    </div>
  );
}
