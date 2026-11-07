import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  HandCoins,
  HardDrive,
  HelpCircle,
  Home,
  KeyRound,
  LifeBuoy,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { classificacaoLabel } from "@/lib/classificacoes";
import { NICHOS } from "@/lib/nichos";
import { STATUS_PROCESSO } from "@/lib/statusProcesso";

// Manual do Usuário. As regras descritas aqui são as mesmas aplicadas pelo banco (RLS) —
// ao mudar uma permissão, atualize também este texto.

type Perfil = "gestao" | "controladoria" | "juridico" | "financeiro";

const PERFIS: { id: Perfil; nome: string; quem: string }[] = [
  { id: "gestao", nome: "Gestão Administrativa", quem: "Dra. Keila e Laura" },
  { id: "controladoria", nome: "Parceiro Jurídico Técnico", quem: "controle de prazos" },
  { id: "juridico", nome: "Parceiro Jurídico OAB", quem: "advogados" },
  { id: "financeiro", nome: "Assistente Financeiro(a)", quem: "boletos e financeiro" },
];

const perfilDoUsuario = (role: string | null, classificacao: string | null): Perfil => {
  if (role === "master" || role === "desenvolvedor") return "gestao";
  if (classificacao === "parceiro_juridico_tecnico") return "controladoria";
  if (classificacao === "assistente_financeiro") return "financeiro";
  return "juridico";
};

// ✔ = pode | texto = pode, com limite | "—" = não pode
const MATRIZ: { area: string; acao: string; v: Record<Perfil, string> }[] = [
  { area: "Clientes", acao: "Ver clientes", v: { gestao: "Todos", controladoria: "Todos (consulta)", juridico: "Só a sua carteira", financeiro: "Todos (cadastro)" } },
  { area: "Clientes", acao: "Cadastrar cliente / abrir nicho", v: { gestao: "✔", controladoria: "✔", juridico: "✔", financeiro: "✔" } },
  { area: "Clientes", acao: "Editar cadastro", v: { gestao: "Todos", controladoria: "Só a sua carteira", juridico: "Só a sua carteira", financeiro: "Só os que cadastrou" } },
  { area: "Clientes", acao: "Excluir cliente", v: { gestao: "✔", controladoria: "Só se for responsável por todos os nichos dele", juridico: "Só se for responsável por todos os nichos dele", financeiro: "—" } },
  { area: "Clientes", acao: "Anotações e questionário", v: { gestao: "Todos", controladoria: "Só a sua carteira", juridico: "Só a sua carteira", financeiro: "—" } },
  { area: "Processos", acao: "Ver processos", v: { gestao: "Todos", controladoria: "Todos (consulta)", juridico: "Só a sua carteira", financeiro: "—" } },
  { area: "Processos", acao: "Cadastrar / editar / excluir", v: { gestao: "Todos", controladoria: "Só a sua carteira", juridico: "Só a sua carteira", financeiro: "—" } },
  { area: "Audiências", acao: "Ver audiências", v: { gestao: "Todas", controladoria: "Todas (consulta)", juridico: "Carteira + as que é responsável", financeiro: "—" } },
  { area: "Audiências", acao: "Cadastrar / editar", v: { gestao: "Todas", controladoria: "Só a sua carteira", juridico: "Só a sua carteira", financeiro: "—" } },
  { area: "Tarefas", acao: "Ver tarefas", v: { gestao: "Todas", controladoria: "Todas (consulta)", juridico: "As que lançou ou é responsável", financeiro: "As que lançou ou é responsável" } },
  { area: "Tarefas", acao: "Mover / editar", v: { gestao: "Todas", controladoria: "As que lançou ou é responsável", juridico: "As que lançou ou é responsável", financeiro: "As que lançou ou é responsável" } },
  { area: "Tarefas", acao: "Excluir tarefa", v: { gestao: "Todas", controladoria: "Só as que lançou", juridico: "Só as que lançou", financeiro: "Só as que lançou" } },
  { area: "Documentos", acao: "Ver / enviar arquivos", v: { gestao: "Todos", controladoria: "Pastas da sua carteira", juridico: "Pastas da sua carteira", financeiro: "—" } },
  { area: "Documentos", acao: "Modelos de Documentos", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "—" } },
  { area: "Agenda", acao: "Ver compromissos", v: { gestao: "Todos", controladoria: "Todos", juridico: "Todos", financeiro: "Todos" } },
  { area: "Agenda", acao: "Editar / excluir compromisso", v: { gestao: "Todos", controladoria: "Só os seus", juridico: "Só os seus", financeiro: "Só os seus" } },
  { area: "Financeiro", acao: "Ver lançamentos", v: { gestao: "Todos", controladoria: "Os que lançou ou em que é parceiro", juridico: "Os que lançou ou em que é parceiro", financeiro: "Todos" } },
  { area: "Financeiro", acao: "Lançar / editar", v: { gestao: "Todos", controladoria: "Só os que lançou", juridico: "Só os que lançou", financeiro: "Todos" } },
  { area: "Financeiro", acao: "Excluir lançamento", v: { gestao: "Todos", controladoria: "Só os que lançou", juridico: "Só os que lançou", financeiro: "Só os que lançou" } },
  { area: "Honorários", acao: "Enviar proposta de honorários", v: { gestao: "✔", controladoria: "Sua carteira", juridico: "Sua carteira", financeiro: "—" } },
  { area: "Honorários", acao: "Aprovar ou devolver proposta", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "—" } },
  { area: "Honorários", acao: "Registrar boletos emitidos", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "✔" } },
  { area: "Gestão", acao: "Minha Comissão", v: { gestao: "—", controladoria: "✔", juridico: "✔", financeiro: "—" } },
  { area: "Gestão", acao: "Relatórios", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "✔" } },
  { area: "Gestão", acao: "Equipe e convites", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "—" } },
  { area: "Gestão", acao: "Backup (baixar para pen drive)", v: { gestao: "✔", controladoria: "—", juridico: "—", financeiro: "—" } },
];

const RESUMO_PERFIL: Record<Perfil, { pode: string[]; naoPode: string[] }> = {
  gestao: {
    pode: [
      "Ver e alterar tudo no sistema, de todos os usuários e nichos.",
      "Filtrar painéis e listas por nicho e por responsável.",
      "Aprovar ou devolver propostas de honorários (Esteira de Honorários).",
      "Convidar usuários, definir a classificação de cada um e manter a Equipe.",
      "Subir e desativar Modelos de Documentos.",
      "Excluir qualquer lançamento, tarefa, recado, anotação ou compromisso.",
    ],
    naoPode: [
      "Nada é bloqueado para a Gestão. Exclusões ficam registradas no log de auditoria.",
    ],
  },
  controladoria: {
    pode: [
      "Tudo o que um Parceiro Jurídico OAB faz na própria carteira de clientes.",
      "Consultar processos, audiências e tarefas de TODOS (controle de prazos).",
      "Ver a lista de todos os clientes.",
    ],
    naoPode: [
      "Editar processos, audiências ou tarefas de clientes fora da sua carteira (é só consulta).",
      "Ver documentos, anotações ou financeiro de clientes fora da sua carteira.",
      "Aprovar honorários, acessar Equipe ou Relatórios.",
    ],
  },
  juridico: {
    pode: [
      "Cadastrar clientes e abrir nichos (você entra automaticamente como responsável).",
      "Ver e trabalhar os clientes dos nichos em que é responsável principal ou parceiro secundário.",
      "Cadastrar processos, audiências, documentos e anotações da sua carteira.",
      "Enviar proposta de honorários para aprovação.",
      "Acompanhar seus valores em Minha Comissão.",
    ],
    naoPode: [
      "Ver clientes, processos, documentos ou anotações de nichos em que você não é responsável.",
      "Ver lançamentos financeiros em que você não é autor nem parceiro.",
      "Excluir tarefas que outra pessoa lançou (só quem lançou ou a Gestão).",
      "Aprovar honorários, acessar Equipe ou Relatórios.",
    ],
  },
  financeiro: {
    pode: [
      "Ver e editar todo o Financeiro, alterar status (Pendente/Pago/Atrasado).",
      "Registrar os boletos emitidos das propostas aprovadas (gera as parcelas no Financeiro).",
      "Consultar o cadastro de todos os clientes e cadastrar clientes novos.",
      "Acessar Relatórios.",
    ],
    naoPode: [
      "Ver processos, audiências, documentos e anotações dos clientes.",
      "Excluir lançamentos que outra pessoa lançou (só a Gestão).",
      "Aprovar a distribuição de honorários (só a Gestão).",
    ],
  },
};

type Secao = { id: string; titulo: string; icone: ReactNode; conteudo: ReactNode };

const Passos = ({ children }: { children: ReactNode }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>;
const Lista = ({ children }: { children: ReactNode }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>;
const Sub = ({ children }: { children: ReactNode }) => <h4 className="font-semibold text-foreground mt-4 mb-1">{children}</h4>;
const Atencao = ({ children }: { children: ReactNode }) => (
  <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm mt-3">
    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    <div>{children}</div>
  </div>
);
const Limites = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm mt-3">
    <p className="font-semibold flex items-center gap-1 mb-1"><ShieldCheck className="h-4 w-4 text-primary" /> Quem pode o quê</p>
    <ul className="list-disc pl-5 space-y-1">{children}</ul>
  </div>
);

const SECOES: Secao[] = [
  {
    id: "acesso",
    titulo: "Primeiro acesso, senha e perfil",
    icone: <KeyRound className="h-5 w-5" />,
    conteudo: (
      <>
        <Sub>Primeiro acesso</Sub>
        <Passos>
          <li>A Gestão envia um convite pela aba <strong>Equipe</strong>. O convite vale por <strong>7 dias</strong>.</li>
          <li>Abra o link do convite, confira o e-mail, crie sua senha e entre.</li>
          <li>Seu acesso (o que você vê e pode fazer) vem da <strong>classificação</strong> escolhida no convite.</li>
        </Passos>
        <Sub>Esqueci a senha</Sub>
        <Passos>
          <li>Na tela de login, clique em <strong>Esqueci minha senha</strong> e informe seu e-mail.</li>
          <li>Abra o e-mail recebido (veja também o spam) e defina a nova senha.</li>
          <li>Logado, você também pode trocar a senha em <strong>Configurações › Segurança</strong>.</li>
        </Passos>
        <Sub>Seu nome no sistema</Sub>
        <p>
          Os nomes seguem o padrão de compliance: <strong>Nome + iniciais do meio + Sobrenome final</strong> (ex.: Laura B G Mota).
          O sistema abrevia sozinho a partir do nome completo do card na Equipe. Nome errado? Peça à Gestão para corrigir o card.
        </p>
        <Atencao>
          Convite expirado ou link que "não funciona": peça à Gestão para <strong>excluir o convite e enviar outro</strong> na aba Equipe.
          Use sempre o mesmo e-mail do convite.
        </Atencao>
      </>
    ),
  },
  {
    id: "nichos",
    titulo: "Como funciona a carteira (nichos e responsáveis)",
    icone: <Users className="h-5 w-5" />,
    conteudo: (
      <>
        <p>
          Cada cliente é cadastrado <strong>uma única vez pelo CPF/CNPJ</strong>. Para cada área de atuação é aberto um <strong>nicho</strong>
          (ex.: Direito Trabalhista), com um <strong>Responsável principal</strong> e, se precisar, <strong>Parceiros secundários</strong>.
        </p>
        <Lista>
          <li>Você só vê processos, audiências, documentos e anotações dos <strong>nichos em que é responsável</strong> (principal ou secundário).</li>
          <li>Entre nichos do mesmo cliente, só os <strong>dados cadastrais</strong> são compartilhados. Um parceiro do Trabalhista não vê os documentos do Previdenciário.</li>
          <li>Precisa trabalhar num cliente que não aparece para você? Peça ao responsável principal (ou à Gestão) para incluir você como <strong>parceiro secundário</strong> no nicho.</li>
        </Lista>
        <p className="mt-2 text-xs text-muted-foreground">Nichos disponíveis: {NICHOS.map((n) => n.replace("DIREITO ", "")).join(", ").toLowerCase()}.</p>
      </>
    ),
  },
  {
    id: "dashboard",
    titulo: "Dashboard",
    icone: <Home className="h-5 w-5" />,
    conteudo: (
      <>
        <p>Tela inicial. Não precisa cadastrar nada aqui: os números se atualizam com o uso do sistema.</p>
        <Lista>
          <li><strong>Gestão:</strong> indicadores do escritório e o <strong>Painel por Nicho</strong> (clientes, processos ativos, arquivados e atrasados), com filtro por nicho e responsável.</li>
          <li><strong>Demais perfis:</strong> painel pessoal com o que está a receber e o que já recebeu.</li>
        </Lista>
      </>
    ),
  },
  {
    id: "clientes",
    titulo: "Clientes",
    icone: <Users className="h-5 w-5" />,
    conteudo: (
      <>
        <Sub>Cadastrar cliente (sempre comece pelo CPF/CNPJ)</Sub>
        <Passos>
          <li>Clique em <strong>Novo Cliente</strong> e digite o CPF ou CNPJ.</li>
          <li><strong>Se já existir cadastro</strong>, aparece "Cliente já cadastrado". Clique em <strong>Abrir nicho e complementar cadastro</strong>: não crie outro cliente.</li>
          <li><strong>Se não existir</strong>, escolha o nicho e clique em <strong>Continuar cadastro</strong>.</li>
          <li>Preencha os dados (nome, contatos, endereço, estado civil, filiação, RG). Quanto mais completo, melhor saem os documentos gerados.</li>
          <li>Em <strong>Nichos e Responsáveis</strong>, confira o responsável principal e os parceiros secundários. Clique em <strong>Salvar</strong>.</li>
        </Passos>
        <p className="mt-2">Ao salvar, o sistema cria automaticamente a pasta do cliente em Documentos (01_DOCUMENTOS_PESSOAIS, 02_PROVAS_E_EXTRATOS, 03_PECAS_PROCESSUAIS, 04_CONTRATO_DE_HONORARIOS e FINANCEIRO_E_FISCAL), gera os documentos dos modelos ativos e oferece a <strong>proposta de honorários</strong>.</p>
        <Sub>Dentro do cliente (⋯ › Visualizar / Editar)</Sub>
        <Lista>
          <li><strong>Abrir novo nicho para este cliente:</strong> mesmo cliente, outra área.</li>
          <li><strong>Honorários:</strong> envia a proposta de honorários para aprovação (veja "Esteira de Honorários").</li>
          <li><strong>Gerar documentos:</strong> gera de novo contrato/procuração a partir dos modelos ativos, com os dados atuais do cadastro.</li>
          <li><strong>Encerrar:</strong> encerra o atendimento daquele nicho sem apagar o histórico.</li>
          <li><strong>Contatos Complementares (Recados):</strong> parentes ou terceiros para contato.</li>
          <li><strong>Arquivos do Cliente:</strong> clique no nome do arquivo para visualizar.</li>
        </Lista>
        <Sub>Anotações e questionário inicial</Sub>
        <Lista>
          <li>Bloco de notas por nicho. Toda alteração fica registrada.</li>
          <li><strong>Copiar para enviar no WhatsApp:</strong> copia as perguntas do questionário. O cliente responde e você usa <strong>Colar respostas do WhatsApp</strong> para preencher sozinho.</li>
        </Lista>
        <Sub>Planilhas (Excel)</Sub>
        <p>Importa ou exporta a lista de clientes em Excel.</p>
        <Limites>
          <li>Cada um vê só a sua carteira. A Gestão vê todos; Parceiros Jurídicos Técnicos e Assistente Financeira consultam todos.</li>
          <li>Excluir cliente: Gestão, ou quem for responsável por <strong>todos</strong> os nichos dele. Excluir apaga também os documentos dele.</li>
          <li>Anotação: só quem escreveu (ou a Gestão) exclui.</li>
        </Limites>
        <Atencao>
          "CPF/CNPJ já cadastrado" ao salvar: o cliente já existe, talvez na carteira de outra pessoa. Use <strong>Novo Cliente</strong>, digite o CPF e escolha <strong>Abrir nicho</strong> — você passa a ter acesso a esse cliente no seu nicho.
        </Atencao>
      </>
    ),
  },
  {
    id: "processos",
    titulo: "Processos",
    icone: <Briefcase className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li>Clique em <strong>Novo Processo</strong>.</li>
          <li>Em <strong>Cliente / Nicho</strong>, escolha o cliente e a área (obrigatório).</li>
          <li>Informe o <strong>número</strong> (pode ficar em branco enquanto não protocolado), o <strong>Assunto Principal</strong> (ex.: Horas extras) e os detalhes.</li>
          <li>Escolha o <strong>Status</strong>, a <strong>Prioridade</strong>, o <strong>Responsável Principal (A)</strong> e, se houver, o <strong>Co-Responsável (B)</strong>.</li>
        </Passos>
        <p className="mt-2">Use os filtros de <strong>Área</strong> e <strong>Status</strong> e a busca por número ou cliente.</p>
        <p className="mt-2 text-xs text-muted-foreground">Status disponíveis: {STATUS_PROCESSO.join(" · ")}. "Arquivado" encerra o processo.</p>
        <Limites>
          <li>Você vê e edita os processos que cadastrou, em que é Responsável A/B, ou dos nichos da sua carteira.</li>
          <li>O Parceiro Jurídico Técnico consulta todos, mas só edita os da carteira. Assistente Financeira não acessa processos.</li>
        </Limites>
        <Atencao>"Já existe um processo com este número": ele já está cadastrado. Busque pelo número; se não aparecer para você, está em outra carteira — fale com a Gestão.</Atencao>
      </>
    ),
  },
  {
    id: "audiencias",
    titulo: "Audiências",
    icone: <Calendar className="h-5 w-5" />,
    conteudo: (
      <>
        <Sub>Cadastrar (o jeito mais rápido)</Sub>
        <Passos>
          <li>Clique em <strong>Nova Audiência</strong>.</li>
          <li>Copie o evento inteiro do Google Agenda, cole em <strong>Colar do Google Agenda</strong> e clique em <strong>Preencher automaticamente</strong>. Partes, data, hora, link, tipo e nº do processo são lidos sozinhos.</li>
          <li>Confira o <strong>Cliente / Nicho</strong> sugerido (ou busque pelo nome/CPF, ou use o botão de busca ao lado).</li>
          <li>Complete o que faltar e clique em <strong>Salvar</strong>.</li>
        </Passos>
        <Sub>Campos obrigatórios (travas)</Sub>
        <p>
          Todos os campos marcados com * são obrigatórios: partes, cliente/nicho, nº do processo, data, hora, fuso, local/vara, link, tipo, status e responsável.
          Se faltar algo, o sistema não salva, mostra a lista do que falta e leva você até o campo. Audiência só presencial: marque <strong>Audiência sem link</strong>.
        </p>
        <Sub>Fuso horário</Sub>
        <p>O padrão é o horário de <strong>Mato Grosso</strong> (escritório). Se a hora veio da intimação de outra região, escolha o fuso dela: o sistema mostra a conversão para o horário de MT.</p>
        <Sub>Tarefa automática</Sub>
        <Lista>
          <li>Ao salvar, é criada uma tarefa para o responsável na data da audiência. Use <strong>Ver tarefa</strong> na lista para abri-la.</li>
          <li>Mudou data, responsável ou cliente da audiência? A tarefa é atualizada junto. Status "Realizada" ou "Cancelada" conclui a tarefa.</li>
        </Lista>
        <Sub>Na lista</Sub>
        <Lista>
          <li><strong>Registrada em … por … · X dias de antecedência:</strong> quando a audiência foi lançada no ERP. Lance assim que o judiciário marcar.</li>
          <li><strong>Pendente: …</strong> (selo vermelho): faltam dados. Abra em <strong>Editar</strong> e complete.</li>
          <li><strong>Anotações do cliente</strong> (menu ⋯): abre o bloco de notas do cliente para preparar a audiência.</li>
        </Lista>
        <Limites>
          <li>Você vê as audiências que lançou, em que é responsável, ou da sua carteira. O Parceiro Jurídico Técnico consulta todas.</li>
        </Limites>
      </>
    ),
  },
  {
    id: "tarefas",
    titulo: "Tarefas",
    icone: <Clock className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li>Clique em <strong>Nova Tarefa</strong>, descreva o que precisa ser feito, escolha a data, a prioridade e o responsável.</li>
          <li>Acompanhe no <strong>Quadro Kanban</strong> (Pendente · Em Andamento · Concluída): <strong>arraste o cartão</strong> para mudar o status. Prefere lista? Use o botão <strong>Lista</strong>.</li>
          <li>Clique na tarefa para ver o texto completo e deixar <strong>recados</strong> (ficam com nome e horário).</li>
        </Passos>
        <p className="mt-2">Filtros: prioridade, responsável (inclusive "Atribuídas a mim") e busca por descrição, responsável ou <strong>nome do cliente</strong>.</p>
        <p className="mt-2">Algumas tarefas são criadas sozinhas: audiências e a Esteira de Honorários (aprovar proposta, gerar boletos, corrigir proposta devolvida).</p>
        <Limites>
          <li>Você vê as tarefas que lançou ou de que é responsável. O Parceiro Jurídico Técnico consulta todas; a Gestão vê e altera todas.</li>
          <li>Mover/editar: quem lançou, o responsável ou a Gestão.</li>
          <li><strong>Excluir: só quem lançou</strong> a tarefa (ou a Gestão). Recado: só quem escreveu (ou a Gestão) apaga.</li>
        </Limites>
      </>
    ),
  },
  {
    id: "documentos",
    titulo: "Documentos",
    icone: <FileText className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li>Entre na pasta do nicho › cliente › subpasta (ex.: 01_DOCUMENTOS_PESSOAIS).</li>
          <li>Clique em <strong>Fazer Upload</strong> para enviar arquivos, ou <strong>Nova Pasta</strong> para organizar.</li>
          <li><strong>Clique no nome do arquivo</strong> (ou ⋯ › Visualizar) para abrir sem baixar: PDF, imagens, Word (.docx) e textos. Outros formatos: use <strong>Baixar</strong>.</li>
        </Passos>
        <Sub>Modelos de Documentos (Gestão)</Sub>
        <Passos>
          <li>Monte o modelo no Word (.docx) e escreva os campos entre chaves onde entram os dados do cliente:
            <code className="block mt-1 text-xs bg-muted p-2 rounded">
              {"{nome} {cpf} {rg} {estado_civil} {nome_mae} {nome_pai} {logradouro} {numero} {bairro} {cidade} {uf} {endereco} {email} {telefone} {nicho}"}
            </code>
          </li>
          <li>Em Documentos, clique em <strong>Modelos de Documentos</strong> e envie o arquivo.</li>
          <li>A partir daí, todo cliente novo recebe o documento preenchido na pasta dele (Documentos › nicho › cliente). Para clientes antigos, use <strong>Gerar documentos</strong> no nicho do cliente.</li>
        </Passos>
        <Atencao>
          Nunca suba como modelo um documento já preenchido com dados de um cliente: ele seria copiado para todos os clientes novos.
          Campo saiu vazio no documento gerado? Esse dado está em branco no cadastro — complete o cliente e clique em <strong>Gerar documentos</strong> de novo.
        </Atencao>
        <Limites>
          <li>Pastas de nicho (ex.: DIREITO TRABALHISTA) aparecem para todos; as pastas de cliente, só para os responsáveis do nicho e a Gestão.</li>
          <li>Excluir arquivo: quem enviou, os responsáveis do nicho ou a Gestão. Assistente Financeira não acessa documentos.</li>
        </Limites>
      </>
    ),
  },
  {
    id: "agenda",
    titulo: "Agenda",
    icone: <CalendarDays className="h-5 w-5" />,
    conteudo: (
      <>
        <Lista>
          <li>Mostra audiências, tarefas e compromissos juntos. Troque entre <strong>Dia</strong>, <strong>Semana</strong> e <strong>Mês</strong>; <strong>Hoje</strong> volta para a data atual.</li>
          <li><strong>Novo compromisso:</strong> título, início, local, descrição e fuso horário.</li>
          <li><strong>Somente os meus / Compromissos de todos</strong>: alterna entre a sua agenda e a do escritório.</li>
          <li>Horários são exibidos no horário de Mato Grosso; o fuso original aparece entre parênteses.</li>
        </Lista>
        <Limites>
          <li>Todos veem os compromissos de todos. Editar/excluir: só quem criou (ou a Gestão).</li>
        </Limites>
      </>
    ),
  },
  {
    id: "financeiro",
    titulo: "Financeiro",
    icone: <DollarSign className="h-5 w-5" />,
    conteudo: (
      <>
        <Sub>Lançar</Sub>
        <Passos>
          <li>Clique em <strong>Adicionar Lançamento</strong> e escolha o tipo: Receita (honorários), Acordo Judicial (com rateio), Honorários Sucumbenciais ou Despesa.</li>
          <li>Informe cliente, descrição, valor, vencimento e forma de recebimento.</li>
          <li>Acordo: defina repasse ao cliente, comissão dos parceiros 1, 2 e 3 e reserva. A calculadora mostra quanto fica para cada um.</li>
          <li><strong>Parcelamento:</strong> informe o número de parcelas. As datas caem sempre em <strong>dia útil</strong> (fins de semana e feriados bancários são pulados) e podem ser ajustadas uma a uma antes de salvar.</li>
        </Passos>
        <Sub>Acompanhar</Sub>
        <Lista>
          <li>Filtre por <strong>cliente</strong> e por situação (pendentes, atrasados, pagos). Clientes com várias parcelas aparecem agrupados: clique para abrir a lista.</li>
          <li>Gestão e Assistente Financeira: clique no status para marcar como Pago/Atrasado.</li>
          <li><strong>Planilhas (Excel):</strong> importa ou exporta lançamentos.</li>
        </Lista>
        <Limites>
          <li>Gestão e Assistente Financeira veem e editam tudo. Os demais veem os lançamentos que fizeram ou em que aparecem como parceiro.</li>
          <li>Quem lançou pode corrigir ou excluir o próprio lançamento a qualquer momento. Excluir lançamento de outra pessoa: só a Gestão.</li>
        </Limites>
        <Atencao>Clicou em salvar e nada aconteceu? Espere a mensagem de confirmação — o botão fica bloqueado durante o envio para não duplicar. Lançamento duplicado: exclua o repetido.</Atencao>
      </>
    ),
  },
  {
    id: "esteira",
    titulo: "Esteira de Honorários (proposta › aprovação › boletos)",
    icone: <HandCoins className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li><strong>Responsável pelo cliente:</strong> no cliente, em Nichos e Responsáveis, clique em <strong>Honorários</strong> (ou aceite a proposta oferecida ao cadastrar). Informe valor total, entrada, parcelas, 1º vencimento, forma de pagamento, distribuição entre parceiros e reserva. Confira a <strong>Prévia dos boletos</strong> (datas editáveis, sempre em dia útil) e envie.</li>
          <li><strong>Gestão (Dra. Keila):</strong> recebe uma tarefa. No Financeiro › Esteira de Honorários, clique em <strong>Aprovar distribuição</strong> ou <strong>Devolver</strong> com o motivo.</li>
          <li><strong>Devolvida:</strong> o responsável recebe uma tarefa com o motivo, clica em <strong>Corrigir e reenviar</strong>.</li>
          <li><strong>Assistente Financeira:</strong> recebe a tarefa, emite os boletos no banco e clica em <strong>Registrar boletos emitidos</strong>, anexando os PDFs. As parcelas entram no Financeiro já com a divisão de cada parceiro, e os PDFs ficam na pasta FINANCEIRO_E_FISCAL do cliente.</li>
        </Passos>
        <Limites>
          <li>Excluir proposta: quem criou, enquanto aguarda aprovação ou foi devolvida; a Gestão, a qualquer momento. Lançamentos já gerados no Financeiro são mantidos.</li>
        </Limites>
      </>
    ),
  },
  {
    id: "comissao",
    titulo: "Minha Comissão e Relatórios",
    icone: <Wallet className="h-5 w-5" />,
    conteudo: (
      <>
        <Lista>
          <li><strong>Minha Comissão</strong> (parceiros): quanto você tem a receber no mês, o que já recebeu, o que está atrasado e o histórico completo.</li>
          <li><strong>Relatórios</strong> (Gestão e Assistente Financeira): DRE, fluxo de caixa mensal, comissões por parceiro, repasses a clientes, distribuição por área. Escolha o período (30 dias, 90 dias, 6 meses ou todo o histórico).</li>
        </Lista>
      </>
    ),
  },
  {
    id: "mensagens",
    titulo: "Mensagens (WhatsApp)",
    icone: <MessageSquare className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li>Em <strong>Mensagens</strong>, escolha o cliente, o processo e um modelo de mensagem.</li>
          <li>Confira a <strong>Pré-visualização</strong> e clique em <strong>Enviar via WhatsApp</strong>: o WhatsApp abre com o texto pronto para o número do cliente.</li>
          <li>Crie seus modelos em <strong>Configurações › Modelos de Mensagem</strong>, usando variáveis como [nome_cliente] e [numero_processo].</li>
        </Passos>
        <Atencao>WhatsApp não abriu no número certo? Confira o telefone/celular no cadastro do cliente (DDD + número).</Atencao>
      </>
    ),
  },
  {
    id: "equipe",
    titulo: "Equipe e convites (Gestão)",
    icone: <UserCheck className="h-5 w-5" />,
    conteudo: (
      <>
        <Passos>
          <li>Em <strong>Equipe › Acesso à Plataforma</strong>, convide pelo e-mail e escolha a <strong>classificação</strong> — ela define o acesso (veja a tabela abaixo).</li>
          <li>Acompanhe o convite: Pendente, Aceito ou Expirado (7 dias). Expirou? Exclua e convide de novo.</li>
          <li>Para mudar o acesso de alguém, altere a classificação da conta. Cargo e departamento do card acompanham sozinhos.</li>
          <li>Nos cards de <strong>Membros da Equipe</strong>, mantenha o <strong>nome completo</strong>: dele sai o nome abreviado usado no sistema.</li>
        </Passos>
      </>
    ),
  },
  {
    id: "backup",
    titulo: "Backup no pen drive / HD externo (Gestão)",
    icone: <HardDrive className="h-5 w-5" />,
    conteudo: (
      <>
        <p>O sistema faz sozinho um <strong>backup completo todo dia às 02:00</strong> e guarda os 7 últimos no servidor. Para ter uma cópia fora do servidor:</p>
        <Passos>
          <li>Na primeira vez, defina a <strong>senha do backup</strong> na mesma tela (mín. 8 caracteres) e anote em local seguro, fora do pen drive.</li>
          <li>Conecte o pen drive ou HD externo no computador.</li>
          <li>Vá em <strong>Configurações › Backup e Segurança</strong>. Se quiser a cópia mais atual, clique antes em <strong>Gerar backup agora</strong> (leva cerca de 1 minuto).</li>
          <li>Clique em <strong>Salvar no PC / pen drive</strong>, escolha o pen drive/HD na janela que abrir e salve. (Em navegadores sem essa janela, o arquivo vai para Downloads: copie para o pen drive.)</li>
        </Passos>
        <Sub>Como abrir o backup</Sub>
        <p>O arquivo é protegido com criptografia AES-256. Instale o <strong>7-Zip</strong> (gratuito, 7-zip.org), clique com o botão direito no arquivo › <strong>7-Zip › Extrair</strong> e digite a senha. O Windows sozinho não abre esse tipo de arquivo.</p>
        <Sub>O que tem no arquivo (.zip)</Sub>
        <Lista>
          <li><strong>planilhas/</strong>: clientes, nichos, processos, audiências, tarefas, financeiro, honorários, anotações, agenda e equipe — abrem no Excel.</li>
          <li><strong>documentos/</strong>: todos os arquivos, nas mesmas pastas do sistema (Nicho › Cliente › Pasta).</li>
          <li><strong>modelos/</strong> e <strong>banco/</strong> (cópia técnica para o suporte restaurar o sistema, se preciso).</li>
        </Lista>
        <Atencao>
          Recomendado: baixar <strong>uma vez por semana</strong> e manter 2 pen drives/HDs alternados. O arquivo tem dados pessoais (LGPD):
          guarde em local seguro, não envie por e-mail/WhatsApp e apague cópias antigas. Todo download fica registrado.
        </Atencao>
      </>
    ),
  },
  {
    id: "matriz",
    titulo: "Tabela de acessos por perfil",
    icone: <ShieldCheck className="h-5 w-5" />,
    conteudo: null, // renderizada à parte
  },
  {
    id: "problemas",
    titulo: "Resolva sozinho: problemas comuns",
    icone: <LifeBuoy className="h-5 w-5" />,
    conteudo: (
      <div className="space-y-3">
        {[
          ["A tela está diferente do manual ou um botão novo não aparece.", "Atualize a página (F5 ou Ctrl+F5). O sistema é atualizado com frequência e o navegador pode estar mostrando a versão anterior."],
          ["Não encontro um cliente, processo ou documento.", "Você só vê os nichos em que é responsável. Confira se está na sua carteira. Se deveria estar, peça ao responsável principal ou à Gestão para incluir você como parceiro secundário no nicho."],
          ["\"CPF/CNPJ já cadastrado\".", "O cliente já existe. Use Novo Cliente › digite o CPF › Abrir nicho e complementar cadastro. Não cadastre outro."],
          ["\"Sem permissão para salvar neste cliente/nicho\" ou \"sem permissão\".", "A ação é de outro perfil ou de outra carteira (veja a tabela de acessos). Se você deveria ter acesso, peça à Gestão para ajustar o nicho ou sua classificação."],
          ["Não consigo excluir uma tarefa.", "Só quem lançou a tarefa (ou a Gestão) exclui. Se ela é sua por responsabilidade, mude o status para Concluída."],
          ["A audiência não salva.", "Algum campo obrigatório está vazio. Leia a lista no aviso vermelho; o sistema leva você até o primeiro campo pendente."],
          ["Não acho a tarefa da audiência.", "Na lista de Audiências, clique em Ver tarefa. Em Tarefas, busque pelo nome do cliente ou filtre por responsável."],
          ["O documento gerado veio com campos em branco.", "O dado está vazio no cadastro do cliente. Complete o cadastro e clique em Gerar documentos no nicho."],
          ["O arquivo não abre na visualização.", "Formatos como planilhas e .doc antigos não têm pré-visualização: use Baixar. Se um PDF não abrir, use Nova aba."],
          ["Lançamento ficou duplicado.", "Quem lançou pode excluir o repetido (menu ⋯ › Excluir). Para não duplicar, clique em salvar uma vez e aguarde a confirmação."],
          ["Parcela caiu num feriado ou fim de semana.", "As datas são ajustadas para o próximo dia útil automaticamente. Para outra data, edite a parcela antes de salvar."],
          ["Esqueci a senha / não consigo entrar.", "Use Esqueci minha senha na tela de login. Convite vencido: peça um novo à Gestão."],
          ["O horário da audiência parece errado.", "Confira o Fuso horário no cadastro da audiência. O sistema sempre mostra o horário de Mato Grosso; o fuso original aparece entre parênteses."],
        ].map(([p, r]) => (
          <div key={p} className="rounded-md border p-3">
            <p className="font-medium flex gap-2"><HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />{p}</p>
            <p className="text-muted-foreground mt-1 pl-6">{r}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "suporte",
    titulo: "Quando chamar o Suporte Técnico",
    icone: <LifeBuoy className="h-5 w-5" />,
    conteudo: (
      <>
        <p>Chame o suporte só depois de conferir este manual e atualizar a página. Questões de acesso (incluir alguém num nicho, convite, classificação) são resolvidas pela <strong>Gestão</strong>, não pelo suporte.</p>
        <Sub>Para ser atendido mais rápido</Sub>
        <Passos>
          <li>Clique em <strong>Suporte Técnico</strong> no menu lateral.</li>
          <li>Diga <strong>em qual tela</strong> estava, <strong>o que clicou</strong> e <strong>a mensagem que apareceu</strong> (copie o texto exato).</li>
          <li>Informe o cliente/processo envolvido e, se possível, mande um print da tela.</li>
        </Passos>
      </>
    ),
  },
];

export default function Ajuda() {
  const { role, classificacao } = useAuth();
  const meuPerfil = perfilDoUsuario(role, classificacao);
  const [busca, setBusca] = useState("");
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [visiveis, setVisiveis] = useState<string[] | null>(null);

  // A busca procura no texto renderizado de cada seção
  useEffect(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return setVisiveis(null);
    setVisiveis(
      SECOES.filter((s) => (refs.current[s.id]?.textContent || "").toLowerCase().includes(termo)).map((s) => s.id)
    );
  }, [busca]);

  const resumo = RESUMO_PERFIL[meuPerfil];
  const nomePerfil = classificacaoLabel(classificacao) || PERFIS.find((p) => p.id === meuPerfil)?.nome;
  const indice = useMemo(() => SECOES.map((s) => ({ id: s.id, titulo: s.titulo })), []);

  const ir = (id: string) => document.getElementById(`ajuda-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const matriz = (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Área</th>
            <th className="text-left p-2">Ação</th>
            {PERFIS.map((p) => (
              <th key={p.id} className={`text-left p-2 ${p.id === meuPerfil ? "bg-primary/10" : ""}`}>
                {p.nome}
                {p.id === meuPerfil && <span className="block text-[10px] font-normal text-primary">seu perfil</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIZ.map((l, i) => (
            <tr key={i} className="border-b border-border/50 align-top">
              <td className="p-2 text-muted-foreground">{l.area}</td>
              <td className="p-2 font-medium">{l.acao}</td>
              {PERFIS.map((p) => (
                <td key={p.id} className={`p-2 ${p.id === meuPerfil ? "bg-primary/5" : ""} ${l.v[p.id] === "—" ? "text-muted-foreground" : ""}`}>
                  {l.v[p.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-5xl animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual do Usuário</h1>
          <p className="text-muted-foreground mt-1">Tudo o que você precisa para usar o Jus+ (JusMais) sem depender do suporte.</p>
        </div>
        <Button onClick={() => window.print()} className="print:hidden">
          <Download className="mr-2 h-4 w-4" />
          Salvar como PDF
        </Button>
      </div>

      <div className="relative mb-6 print:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Busque uma dúvida: ex. excluir tarefa, boleto, senha, nicho, fuso..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {visiveis && (
          <p className="text-xs text-muted-foreground mt-1">
            {visiveis.length ? `${visiveis.length} seção(ões) encontrada(s).` : "Nada encontrado. Tente outra palavra ou veja \"Problemas comuns\"."}
          </p>
        )}
      </div>

      {!visiveis && (
        <>
          <Card className="mb-6 border-primary/30 print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <ShieldCheck className="h-5 w-5 text-primary" /> Seu acesso
                <Badge variant="outline">{nomePerfil}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="font-semibold mb-1">Você pode</p>
                <ul className="space-y-1">
                  {resumo.pode.map((t) => (
                    <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Você não pode</p>
                <ul className="space-y-1">
                  {resumo.naoPode.map((t) => (
                    <li key={t} className="flex gap-2"><XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />{t}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 mb-6 print:hidden">
            {indice.map((s) => (
              <Button key={s.id} variant="outline" size="sm" className="h-7 text-xs" onClick={() => ir(s.id)}>
                {s.titulo}
              </Button>
            ))}
          </div>
        </>
      )}

      <div className="space-y-6 pb-20 print:space-y-4">
        {SECOES.map((s, i) => (
          <div
            key={s.id}
            id={`ajuda-${s.id}`}
            ref={(el) => (refs.current[s.id] = el)}
            className={`scroll-mt-4 ${visiveis && !visiveis.includes(s.id) ? "hidden" : ""}`}
          >
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  {s.icone} {i + 1}. {s.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm leading-relaxed">
                {s.id === "matriz" ? matriz : s.conteudo}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
