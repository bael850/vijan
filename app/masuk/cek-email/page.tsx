import { cekEmail } from "@/content/pages";

export default function CekEmailPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl mb-4">{cekEmail.title}</h1>
        <p className="text-neutral-400 leading-relaxed">{cekEmail.body}</p>
      </div>
    </main>
  );
}
