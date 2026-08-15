import Link from "next/link";
import { menuItems, tarefasMock } from "@/lib/mockData";

export default function HomePage() {
  const pendentes = tarefasMock.filter((t) => t.estado === "Pendente");

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-sm text-[#6B6B76]">Boa tarde,</p>
        <h1 className="text-2xl font-medium">Nuno</h1>
      </div>

      <Link
        href="/tarefas"
        className="block rounded-xl bg-brand-500 text-white p-5 mb-8 hover:bg-brand-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-50">As minhas tarefas</p>
            <p className="text-3xl font-medium mt-1">{pendentes.length} pendentes</p>
          </div>
          <span className="text-2xl">→</span>
        </div>
      </Link>

      <p className="text-sm text-[#6B6B76] mb-3">Menus</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl bg-white border border-[#E7E6F0] p-4 hover:border-brand-400 transition-colors"
          >
            <p className="font-medium text-sm">{item.label}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
