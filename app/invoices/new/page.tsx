import Navbar from "@/components/Navbar";
import InvoiceForm from "@/components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvoiceForm />
      </main>
    </div>
  );
}
