import React from 'react';

const ProtectedPlaceholder = ({ title, description }) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Protected Section</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-4 max-w-2xl text-slate-600">{description}</p>
      </div>
    </section>
  );
};

export default ProtectedPlaceholder;
