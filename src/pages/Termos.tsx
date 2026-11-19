import { ArrowLeft, FileCheck, Shield, Scale } from "lucide-react";
import { Link } from "react-router-dom";

export default function Termos() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Topo */}
      <header className="bg-[#010E38] text-white py-6 px-4 sm:px-8 border-b-4 border-[#EBB52C]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#010E38] border border-[#EBB52C]/40 flex items-center justify-center p-1">
              <img src="/logo-emblema.png?v=6" alt="JURI+ TECH" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                JURI+ TECH — Sistema ERP para Advogados
              </h1>
              <p className="text-xs text-slate-300">
                Termos de Uso e Serviço
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="text-xs font-semibold text-[#EBB52C] hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Sistema</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 flex-1 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#EBB52C] bg-[#010E38] px-3 py-1 rounded-full">
              Termos Oficiais
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#010E38] mt-3">
              Termos de Uso do JURI+ TECH
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Bem-vindo ao <strong>JURI+ TECH — Sistema ERP para Advogados</strong>. Ao acessar e utilizar esta plataforma de gestão para escritórios de advocacia, você concorda expressamente com os seguintes termos e condições.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#EBB52C]" />
              1. Objeto do Serviço
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              O <strong>JURI+ TECH</strong> é uma plataforma SaaS (Software as a Service) voltada ao gerenciamento de processos, clientes, prazos, documentos e fluxos financeiros para advogados e escritórios jurídicos.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#EBB52C]" />
              2. Integrações de Terceiros (Google Workspace, Google Drive e Google Docs)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              O usuário pode opcionalmente conectar sua conta do Google Workspace / Google Cloud para facilitar o anexo e criação de documentos. O uso dessas integrações é facultativo e obedece aos termos de serviço e políticas de dados do Google LLC, garantindo que o JURI+ TECH apenas interaja com arquivos explicitamente selecionados ou criados através da plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#EBB52C]" />
              3. Responsabilidade e Sigilo Profissional
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              O usuário é o único responsável pelo conteúdo, veracidade e sigilo das informações e documentos inseridos na plataforma, mantendo estrito respeito às prerrogativas éticas e de sigilo da OAB e da legislação aplicável.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-base font-bold text-[#010E38]">
              4. Dúvidas e Suporte
            </h3>
            <p className="text-sm text-slate-600">
              Para esclarecimentos ou dúvidas sobre estes termos de serviço, contate:{" "}
              <a href="mailto:ogrupovendamais@gmail.com" className="font-semibold text-[#010E38] underline">
                ogrupovendamais@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} JURI+ TECH — Sistema ERP para Advogados. Todos os direitos reservados.
      </footer>
    </div>
  );
}
