import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";
import { nomeArquivoSeguro } from "@/lib/utils";

export interface GenerateTemplatesResult {
  success: boolean;
  count: number;
  message?: string;
}

export const generateTemplatesForClient = async (
  cliente: any, 
  folderId: string, 
  clienteNichoId?: string
): Promise<GenerateTemplatesResult> => {
  try {
    // O arquivo é gravado em nome de quem está usando o sistema (exigência de segurança do armazenamento)
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      return { success: false, count: 0, message: "Usuário não autenticado." };
    }

    // Se clienteNichoId não foi passado, tenta descobrir pelo folderId
    let targetNichoId = clienteNichoId;
    if (!targetNichoId && folderId) {
      const { data: folderDoc } = await supabase
        .from("documentos")
        .select("cliente_nicho_id")
        .eq("id", folderId)
        .maybeSingle();
      if (folderDoc?.cliente_nicho_id) {
        targetNichoId = folderDoc.cliente_nicho_id;
      }
    }

    // Buscar modelos ativos
    const { data: templates, error: fetchTemplatesErr } = await supabase
      .from("document_templates")
      .select("*")
      .eq("ativo", true);

    if (fetchTemplatesErr) {
      console.error("Erro ao buscar modelos:", fetchTemplatesErr);
      return { success: false, count: 0, message: `Erro ao buscar modelos: ${fetchTemplatesErr.message}` };
    }

    if (!templates || templates.length === 0) {
      return {
        success: false,
        count: 0,
        message: "Nenhum modelo de documento ativo cadastrado. Cadastre ou ative modelos (.docx) em Documentos > Modelos de Documentos.",
      };
    }

    let generatedCount = 0;

    for (const template of templates) {
      // Baixar blob do bucket "templates"
      const { data: blob, error: downloadError } = await supabase.storage
        .from("templates")
        .download(template.storage_path);

      if (downloadError || !blob) {
        console.error("Erro ao baixar template:", template.nome, downloadError);
        continue;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Substituir dados
      doc.render({
        nome: cliente.nome || "",
        cpf: cliente.cpf || "",
        rg: cliente.rg || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        endereco: cliente.endereco || "",
        logradouro: cliente.logradouro || "",
        numero: cliente.numero || "",
        bairro: cliente.bairro || "",
        cidade: cliente.cidade || "",
        uf: cliente.uf || "",
        estado_civil: cliente.estado_civil || "",
        nacionalidade: cliente.nacionalidade || "brasileiro(a)",
        profissao: cliente.profissao || "",
        nome_mae: cliente.nome_mae || "",
        nome_pai: cliente.nome_pai || "",
        filiacao: cliente.filiacao || "",
        nicho: cliente.nicho || "",
      });

      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const cleanTemplateName = template.nome.replace(/\.docx$/i, "");
      const fileName = `${cleanTemplateName} - ${cliente.nome}.docx`;
      const storagePath = `${userId}/clientes/${cliente.id}/${Date.now()}_${nomeArquivoSeguro(fileName)}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(storagePath, out);

      if (uploadError) {
        console.error("Erro ao fazer upload do documento gerado:", uploadError);
        continue;
      }

      // Salvar registro na tabela documentos com cliente_nicho_id herdado
      const { error: insertError } = await supabase.from("documentos").insert({
        nome: fileName,
        is_folder: false,
        parent_id: folderId,
        user_id: userId,
        cliente_id: cliente.id,
        cliente_nicho_id: targetNichoId || null,
        storage_path: storagePath,
        tamanho: out.size,
      } as any);

      if (insertError) {
        console.error("Erro ao registrar documento no banco:", insertError);
      } else {
        generatedCount++;
      }
    }

    return {
      success: generatedCount > 0,
      count: generatedCount,
      message: generatedCount > 0 
        ? `${generatedCount} documento(s) gerado(s) com sucesso.` 
        : "Nenhum documento pôde ser gerado a partir dos modelos disponíveis.",
    };
  } catch (err: any) {
    console.error("Erro geral na geração de templates:", err);
    return { success: false, count: 0, message: err?.message || "Erro inesperado na geração de documentos." };
  }
};
