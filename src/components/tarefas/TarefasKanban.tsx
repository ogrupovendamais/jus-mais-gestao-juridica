import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { extrairMetadadosDescricao, isCorClara, useEtiquetasKanban } from "@/lib/etiquetas";
import type { Tarefa } from "@/pages/Tarefas";

export const COLUNAS_KANBAN: { status: Tarefa["status"]; titulo: string; destaque?: boolean }[] = [
  { status: "Pendente", titulo: "A Fazer" },
  { status: "Em Andamento", titulo: "Em Elaboração" },
  { status: "Em Revisão", titulo: "Em Revisão", destaque: true },
  { status: "Concluída", titulo: "Protocolado" },
];

export const LABEL_STATUS_TAREFA: Record<Tarefa["status"], string> = {
  Pendente: "A Fazer",
  "Em Andamento": "Em Elaboração",
  "Em Revisão": "Em Revisão",
  Concluída: "Protocolado",
};

const ordemPrioridade = { Alta: 0, Média: 1, Baixa: 2 } as const;

function obterIniciais(nome?: string | null): string {
  if (!nome || !nome.trim()) return "—";
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function TarefasKanban({
  tarefas,
  podeMover,
  onMover,
  onAbrir,
}: {
  tarefas: Tarefa[];
  podeMover: (t: Tarefa) => boolean;
  onMover: (t: Tarefa, status: Tarefa["status"]) => void;
  onAbrir: (t: Tarefa) => void;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Tarefa["status"] | null>(null);
  const { etiquetas: catalogoEtiquetas } = useEtiquetasKanban();
  const hoje = startOfDay(new Date());

  const soltar = (status: Tarefa["status"]) => {
    const t = tarefas.find((x) => x.id === arrastando);
    setArrastando(null);
    setSobre(null);
    if (t && t.status !== status) onMover(t, status);
  };

  const encontrarCorEtiqueta = (nomeTag: string) => {
    const encontrada = catalogoEtiquetas.find(
      (e) => e.nome.toLowerCase() === nomeTag.toLowerCase()
    );
    if (encontrada) {
      return {
        bg: encontrada.cor,
        text: encontrada.textoEscuro || isCorClara(encontrada.cor) ? "#010E38" : "#FFFFFF",
      };
    }
    if (nomeTag.toUpperCase() === "EM REVISÃO" || nomeTag.toUpperCase() === "URGENTE") {
      return { bg: "#EBB52C", text: "#010E38" };
    }
    return { bg: "#010E38", text: "#EBB52C" };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUNAS_KANBAN.map((col) => {
        const itens = tarefas
          .filter((t) => t.status === col.status)
          .sort(
            (a, b) =>
              ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] ||
              a.dataConclusao.getTime() - b.dataConclusao.getTime()
          );

        const protocolado = col.status === "Concluída";

        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setSobre(col.status);
            }}
            onDragLeave={() => setSobre((s) => (s === col.status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              soltar(col.status);
            }}
            className={cn(
              "rounded-xl bg-[#F1F4F9] dark:bg-[#010E38]/60 p-3.5 min-h-[540px] max-h-[calc(100vh-210px)] flex flex-col transition-all border border-[#010E38]/12 dark:border-[#EBB52C]/20 shadow-2xs",
              sobre === col.status && arrastando && "ring-2 ring-[#EBB52C] bg-[#EBB52C]/10"
            )}
          >
            {/* Cabeçalho da coluna: H2 Montserrat Bold 700 + Contador DATA Space Mono Bold 700 */}
            <div className="flex items-center justify-between mb-3 px-1 pt-0.5 shrink-0 border-b border-[#010E38]/10 pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
                  {col.titulo}
                </h3>
                <span
                  className={cn(
                    "font-data inline-flex items-center justify-center rounded-full text-[11px] font-bold px-2.5 py-0.5 min-w-[24px] h-[20px] leading-none shadow-2xs",
                    col.destaque
                      ? "bg-[#EBB52C] text-[#010E38]"
                      : "bg-[#010E38] text-[#EBB52C]"
                  )}
                >
                  {itens.length > 50 ? "50+" : itens.length}
                </span>
              </div>
            </div>

            {/* Lista de cartões com rolagem independente */}
            <div className="space-y-2.5 overflow-y-auto pr-0.5 flex-1">
              {itens.length === 0 && (
                <div className="text-xs text-[#010E38]/50 dark:text-[#F1F4F9]/50 text-center py-10 border border-dashed border-[#010E38]/15 dark:border-[#F1F4F9]/15 rounded-lg bg-white/60 dark:bg-[#010E38]/30">
                  Nenhuma tarefa em {col.titulo}
                </div>
              )}

              {itens.map((t) => {
                const movel = podeMover(t);
                const atrasada = !protocolado && isBefore(t.dataConclusao, hoje);
                const meta = extrairMetadadosDescricao(t.descricao);
                const tags = [...meta.etiquetas];
                const iniciais = obterIniciais(t.responsavel);

                const corBarraEsquerda =
                  meta.tipoAtividade === "Eventos"
                    ? "before:bg-[#00A859]"
                    : meta.tipoAtividade === "Prazos"
                    ? "before:bg-[#E53935]"
                    : meta.tipoAtividade === "Audiências" || col.status === "Em Revisão"
                    ? "before:bg-[#EBB52C]"
                    : t.prioridade === "Alta" || atrasada
                    ? "before:bg-[#E53935]"
                    : "before:bg-[#010E38]";
                const subtituloCaso = meta.processoCaso || t.clienteNome;

                return (
                  <div
                    key={t.id}
                    draggable={movel}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setArrastando(t.id);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    onClick={() => onAbrir(t)}
                    className={cn(
                      "group relative rounded-lg border border-[#010E38]/12 dark:border-[#F1F4F9]/15 bg-white dark:bg-[#010E38] p-3.5 shadow-[0_1px_3px_rgba(1,14,56,0.06)] hover:border-[#EBB52C] hover:shadow-md transition-all cursor-pointer select-none",
                      "before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[4px] before:rounded-r-full",
                      corBarraEsquerda,
                      movel && "active:cursor-grabbing",
                      arrastando === t.id && "opacity-50 scale-[0.98]"
                    )}
                    title={movel ? "Clique para abrir · arraste para mudar de coluna" : "Clique para abrir"}
                  >
                    {/* Etiquetas superiores */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {tags.map((tag, idx) => {
                          const estilo = encontrarCorEtiqueta(tag);
                          return (
                            <span
                              key={idx}
                              style={{ backgroundColor: estilo.bg, color: estilo.text }}
                              className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-tight shadow-2xs"
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Título / Descrição da Tarefa — BODY / Montserrat Regular 400 */}
                    <p
                      className={cn(
                        "text-[13.5px] leading-[1.42] font-normal text-[#010E38] dark:text-[#F1F4F9] line-clamp-3 break-words",
                        protocolado && "line-through text-[#010E38]/55 dark:text-[#F1F4F9]/55"
                      )}
                    >
                      {meta.textoLimpo}
                    </p>

                    {/* Nome do Cliente / Processo */}
                    {subtituloCaso && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#010E38]/55 dark:text-[#F1F4F9]/60 line-clamp-2 mt-1.5 leading-snug">
                        {subtituloCaso}
                      </p>
                    )}

                    {/* Rodapé do Card: Avatar com iniciais (NAVY / GOLD) à esquerda e data DATA Space Mono à direita */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase tracking-tighter shrink-0 shadow-2xs"
                          title={t.responsavel ? `Responsável: ${t.responsavel}` : "Sem responsável atribuído"}
                        >
                          {iniciais}
                        </span>
                        {!movel && (
                          <Lock
                            className="h-3 w-3 text-[#010E38]/50"
                            aria-label="Sem permissão para mover"
                          />
                        )}
                      </div>

                      <span
                        className={cn(
                          "font-data text-[11.5px] leading-none",
                          protocolado
                            ? "text-[#010E38]/50 dark:text-[#F1F4F9]/50 font-normal"
                            : atrasada
                            ? "text-[#010E38] bg-[#EBB52C]/35 px-1.5 py-0.5 rounded font-bold"
                            : "text-[#010E38] dark:text-[#EBB52C] font-bold"
                        )}
                      >
                        {format(t.dataConclusao, "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>

                    {/* Seletor rápido no mobile */}
                    {movel && (
                      <div className="md:hidden pt-2 mt-2 border-t border-[#010E38]/10" onClick={(e) => e.stopPropagation()}>
                        <Select value={t.status} onValueChange={(v) => onMover(t, v as Tarefa["status"])}>
                          <SelectTrigger className="h-7 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUNAS_KANBAN.map((c) => (
                              <SelectItem key={c.status} value={c.status}>
                                {c.titulo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
