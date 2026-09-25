"use client";

import { useEffect, useState, use } from "react";
import Navbar from "@/components/Navbar";
import InvoiceForm from "@/components/InvoiceForm";
import { Invoice } from "@/lib/types";

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.invoice) setInvoice(d.invoice);
      })
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 text-center text-slate-400">
          Memuat data invoice...
        </main>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 text-center text-rose-500 font-semibold">
          Invoice tidak ditemukan.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvoiceForm initialData={invoice} isEdit={true} />
      </main>
    </div>
  );
}
