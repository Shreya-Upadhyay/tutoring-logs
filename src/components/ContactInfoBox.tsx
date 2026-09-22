export default function ContactInfoBox() {
  return (
    <div className="card p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Contact Information
      </h2>
      <div className="space-y-1 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Bloomfield Public Library</p>
        <p>90 Broad Street, Bloomfield, NJ 07003</p>
        <p>
          <a href="mailto:info@lvaep.org" className="text-brand-600 hover:underline">
            info@lvaep.org
          </a>
        </p>
        <p>
          <a href="tel:+19735666200" className="text-brand-600 hover:underline">
            (973) 566-6200 x216
          </a>
        </p>
      </div>
    </div>
  );
}
