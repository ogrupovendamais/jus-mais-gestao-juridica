/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateTemplatesForClient } from "@/utils/templateGenerator";

// Nichos de atuação do escritório (item 6.2). Os nomes também são as pastas-raiz em Documentos.
export const NICHOS = [
  "DIREITO TRABALHISTA",
  "DIREITO PREVIDENCIÁRIO",
  "DIREITO BANCÁRIO",
  "DIREITO CÍVEL",
  "DIREITO DE FAMÍLIA",
  "DIREITO IMOBILIÁRIO",
  "DIREITO DO CONSUMIDOR",
  "DIREITO TRIBUTÁRIO",
  "DIREITO EMPRESARIAL",
  "DIREITO CRIMINAL",
];

export type ClienteNicho = {
  id: string;
  cliente_id: string;
  nicho: string;
  responsavel_principal_id: string | null;
  responsaveis_secundarios: string[];
  status: "Ativo" | "Encerrado";
  observacoes: string | null;
};

export type Usuario = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  classificacao: string | null;
};

export type ClienteBusca = {
  cliente_id: string;
  nome: string;
  tem_acesso: boolean;
  nichos: { id: string; nicho: string; status: string; responsavel: string | null; tem_acesso: boolean }[];
};

export const soDigitos = (v?: string | null) => (v || "").replace(/\D/g, "");

export const formatarDocumento = (v?: string | null) => {
  const d = soDigitos(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v || "";
};

export const documentoValido = (v?: string | null) => [11, 14].includes(soDigitos(v).length);

// Usuários ativos da plataforma (RPC: não expõe a tabela profiles para parceiros)
export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  useEffect(() => {
    supabase.rpc("listar_usuarios" as never).then(({ data, error }: any) => {
      if (error) console.error("Erro ao listar usuários:", error);
      setUsuarios((data as Usuario[]) || []);
    });
  }, []);
  return usuarios;
}

export const nomeUsuario = (usuarios: Usuario[], id?: string | null) => {
  const u = usuarios.find((x) => x.id === id);
  return u ? u.full_name || u.email || "—" : null;
};

export async function buscarClientePorDocumento(doc: string): Promise<ClienteBusca | null> {
  const { data, error } = await (supabase.rpc("buscar_cliente_por_documento" as never, { p_doc: doc } as never) as any);
  if (error) throw error;
  return (data as ClienteBusca[])?.[0] ?? null;
}

// Abre o nicho para o cliente e cria a estrutura de pastas: NICHO > Cliente > subpastas
export async function abrirNichoCliente(params: {
  cliente: { id: string; nome: string } & Record<string, any>;
  nicho: string;
  principalId: string | null;
  secundarios: string[];
  userId: string;
  gerarModelos?: boolean;
}): Promise<string> {
  const { cliente, nicho, principalId, secundarios, userId, gerarModelos = true } = params;
  const { data: nichoId, error } = await (supabase.rpc("adicionar_nicho_cliente" as never, {
    p_cliente_id: cliente.id,
    p_nicho: nicho,
    p_principal: principalId || userId,
    p_secundarios: secundarios,
  } as never) as any);
  if (error) throw error;

  try {
    // Após abrir o nicho o usuário passa a enxergar o cadastro completo (usado nos modelos de documento)
    const { data: clienteCompleto } = await supabase.from("clientes").select("*").eq("id", cliente.id).maybeSingle();
    const dadosCliente = clienteCompleto || cliente;

    let { data: rootFolder } = await supabase
      .from("documentos")
      .select("id")
      .eq("is_folder", true)
      .eq("nome", nicho.toUpperCase())
      .is("parent_id", null)
      .is("cliente_id", null)
      .limit(1)
      .maybeSingle();

    if (!rootFolder) {
      const { data: newRoot } = await supabase
        .from("documentos")
        .insert({ nome: nicho.toUpperCase(), is_folder: true, user_id: userId, storage_path: `folder-${crypto.randomUUID()}` })
        .select("id")
        .single();
      rootFolder = newRoot;
    }

    if (rootFolder) {
      const { data: clientFolder } = await supabase
        .from("documentos")
        .insert({
          nome: cliente.nome,
          is_folder: true,
          parent_id: rootFolder.id,
          user_id: userId,
          cliente_id: cliente.id,
          cliente_nicho_id: nichoId,
          storage_path: `folder-${crypto.randomUUID()}`,
        } as any)
        .select("id")
        .single();

      if (clientFolder) {
        const subfolders = ["01_DOCUMENTOS_PESSOAIS", "02_PROVAS_E_EXTRATOS", "03_PECAS_PROCESSUAIS", "04_CONTRATO_DE_HONORARIOS", "FINANCEIRO_E_FISCAL"];
        await supabase.from("documentos").insert(
          subfolders.map((nome) => ({
            nome,
            is_folder: true,
            parent_id: clientFolder.id,
            user_id: userId,
            cliente_id: cliente.id,
            cliente_nicho_id: nichoId,
            storage_path: `folder-${crypto.randomUUID()}`,
          })) as any
        );
        if (gerarModelos) generateTemplatesForClient(dadosCliente, clientFolder.id);
      }
    }
  } catch (e) {
    console.error("Nicho criado, mas houve erro ao criar as pastas:", e);
  }

  return nichoId as string;
}
