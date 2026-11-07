/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export type StatusAtendimento = "em_andamento" | "fechado";

export interface RegistroAtendimento {
  id: string;
  texto: string;
  autor_id: string;
  autor_nome: string;
  autor_iniciais: string;
  criado_em: string;
}

export interface AtendimentoAstrea {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_nicho_id: string | null;
  assunto: string;
  status: StatusAtendimento;
  etiquetas: string[];
  processo_id: string | null;
  processo_titulo: string | null;
  atendimento_vinculado_id: string | null;
  tarefas_ids: string[];
  documentos_ids: string[];
  registros: RegistroAtendimento[];
  importante: boolean;
  user_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function obterIniciaisNome(nomeOuEmail?: string | null): string {
  const limpo = (nomeOuEmail || "").trim();
  if (!limpo) return "US";
  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }
  return limpo.slice(0, 2).toUpperCase();
}

export function formatarTituloAtendimentoComData(
  assunto: string,
  createdAt: string
): string {
  const limpo = (assunto || "Atendimento").trim();
  // Se já começa com DD/MM/YYYY, mantém como está
  if (/^\d{2}\/\d{2}\/\d{4}/.test(limpo)) {
    return limpo;
  }
  try {
    const dataStr = format(new Date(createdAt), "dd/MM/yyyy", { locale: ptBR });
    return `${dataStr} - ${limpo}`;
  } catch {
    return limpo;
  }
}

export function converterRowParaAtendimento(
  row: any,
  mapaClientes: Record<string, string>,
  mapaUsuarios: Record<string, string>
): AtendimentoAstrea {
  const resp =
    row.respostas && typeof row.respostas === "object" ? row.respostas : {};
  const autorId = row.updated_by || row.user_id || "";
  const autorNome = mapaUsuarios[autorId] || "Advogado(a)";
  const autorIniciais = obterIniciaisNome(autorNome);

  const registrosSalvos: RegistroAtendimento[] = Array.isArray(resp.registros)
    ? resp.registros
    : [];

  const registros: RegistroAtendimento[] =
    registrosSalvos.length > 0
      ? registrosSalvos
      : [
          {
            id: `${row.id}-reg-0`,
            texto: row.conteudo || "",
            autor_id: autorId,
            autor_nome: autorNome,
            autor_iniciais: autorIniciais,
            criado_em: row.updated_at || row.created_at || new Date().toISOString(),
          },
        ];

  return {
    id: row.id,
    cliente_id: row.cliente_id,
    cliente_nome:
      mapaClientes[row.cliente_id] ||
      resp.cliente_nome ||
      "Cliente",
    cliente_nicho_id: row.cliente_nicho_id || null,
    assunto: row.titulo || "Atendimento ao cliente",
    status:
      resp.status === "fechado" ? "fechado" : ("em_andamento" as StatusAtendimento),
    etiquetas: Array.isArray(resp.etiquetas) ? resp.etiquetas : [],
    processo_id: resp.processo_id || null,
    processo_titulo: resp.processo_titulo || null,
    atendimento_vinculado_id: resp.atendimento_vinculado_id || null,
    tarefas_ids: Array.isArray(resp.tarefas_ids) ? resp.tarefas_ids : [],
    documentos_ids: Array.isArray(resp.documentos_ids)
      ? resp.documentos_ids
      : [],
    registros,
    importante: Boolean(row.importante),
    user_id: row.user_id,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

export async function listarAtendimentosAstrea(
  clienteIdFiltro?: string
): Promise<AtendimentoAstrea[]> {
  let query = supabase
    .from("cliente_anotacoes" as never)
    .select("*")
    .eq("tipo", "nota")
    .order("updated_at", { ascending: false });

  if (clienteIdFiltro) {
    query = query.eq("cliente_id", clienteIdFiltro);
  }

  const [{ data: rows, error }, { data: clientesData }, { data: profilesData }] =
    await Promise.all([
      query,
      supabase.from("clientes").select("id, nome"),
      supabase.from("profiles" as never).select("id, full_name, email"),
    ]);

  if (error) {
    console.error("Erro ao listar atendimentos:", error);
    return [];
  }

  const mapaClientes: Record<string, string> = {};
  (clientesData || []).forEach((c: any) => {
    mapaClientes[c.id] = c.nome;
  });

  const mapaUsuarios: Record<string, string> = {};
  ((profilesData as any[]) || []).forEach((p: any) => {
    mapaUsuarios[p.id] = p.full_name || p.email || "Usuário";
  });

  return ((rows as any[]) || []).map((r) =>
    converterRowParaAtendimento(r, mapaClientes, mapaUsuarios)
  );
}
