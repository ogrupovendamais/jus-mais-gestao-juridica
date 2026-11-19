import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacidade() {
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
                Política de Privacidade & Proteção de Dados
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
              Em vigor a partir de 2026
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#010E38] mt-3">
              Política de Privacidade
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Esta política descreve como o aplicativo <strong>JURI+ TECH — Sistema ERP para Advogados</strong> coleta, utiliza, armazena e protege suas informações ao utilizar nossos serviços e integrações.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#EBB52C]" />
              1. Informações que Coletamos
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              O <strong>JURI+ TECH</strong> coleta apenas as informações estritamente necessárias para a prestação de serviços de gestão para escritórios de advocacia e departamentos jurídicos, incluindo:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 pl-2">
              <li>Dados cadastrais de identificação (nome, e-mail institucional e telefone);</li>
              <li>Dados de processos, atendimentos, prazos e clientes cadastrados pelo próprio usuário;</li>
              <li>Informações de autenticação necessárias para manter sua sessão segura.</li>
            </ul>
          </section>

          <section className="space-y-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-5">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              2. Integração com APIs do Google (Google Drive e Google Docs)
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              O aplicativo utiliza as APIs oficiais do <strong>Google Drive</strong> e <strong>Google Docs</strong> (escopo restrito <code>drive.file</code>) com as seguintes finalidades exclusivas:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-2 pl-2">
              <li>
                <strong>Seleção e Vinculação de Arquivos:</strong> Permitir que o usuário visualize e vincule arquivos do seu próprio Google Drive a processos e clientes gerenciados no JURI+ TECH.
              </li>
              <li>
                <strong>Criação de Documentos Padrão:</strong> Criar minutas e modelos jurídicos (como procurações e contratos) diretamente na conta Google Docs do usuário quando expressamente solicitado.
              </li>
              <li>
                <strong>Não Compartilhamento:</strong> O JURI+ TECH <strong>NÃO</strong> compartilha, transfere ou vende dados obtidos através das APIs do Google para terceiros, ferramentas de publicidade ou corretores de dados.
              </li>
              <li>
                <strong>Inteligência Artificial:</strong> Nenhum dado obtido através das APIs do Google é utilizado para treinar ou aprimorar modelos de inteligência artificial ou aprendizado de máquina generalizados.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#EBB52C]" />
              3. Armazenamento e Segurança dos Dados
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Todos os dados trafegados entre seu navegador e nossos servidores são protegidos por criptografia de ponta a ponta (HTTPS / TLS 1.3). As credenciais de tokens de acesso OAuth são armazenadas com segurança no navegador do usuário e em banco de dados protegido com Row Level Security (RLS).
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#EBB52C]" />
              4. Seus Direitos (LGPD)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), você possui o direito de solicitar a qualquer momento o acesso, a correção, a anonimização ou a exclusão completa dos seus dados pessoais e a revogação de acessos a contas de terceiros como o Google.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-base font-bold text-[#010E38]">
              5. Contato e Encarregado de Dados
            </h3>
            <p className="text-sm text-slate-600">
              Para dúvidas, suporte ou solicitações relacionadas a esta Política de Privacidade, entre em contato com nosso time pelo e-mail:{" "}
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
