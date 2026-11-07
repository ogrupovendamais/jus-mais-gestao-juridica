import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

// Rascunho automático de formulário: o que é digitado fica guardado neste navegador
// (por usuário e por registro) até ser salvo de verdade. Se o formulário fechar ou a
// página recarregar, ao abrir de novo o conteúdo volta. Validade: 7 dias.

const PREFIXO = "rascunho:";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Datas do formulário (objetos Date) viram texto no JSON; aqui voltam a ser Date
const reviver = (_k: string, v: unknown) => (typeof v === "string" && ISO_DATA_HORA.test(v) ? new Date(v) : v);

const ler = (chave: string) => {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const r = JSON.parse(bruto, reviver) as { valores: Record<string, unknown>; em: number };
    if (!r?.valores || Date.now() - r.em > VALIDADE_MS) {
      localStorage.removeItem(PREFIXO + chave);
      return null;
    }
    return r;
  } catch {
    return null;
  }
};

const apagar = (chave: string) => {
  try {
    localStorage.removeItem(PREFIXO + chave);
  } catch {
    /* navegador sem armazenamento */
  }
};

/**
 * @param chave identifica o formulário aberto (ex.: "audiencia:<id>:<usuario>"); null = fechado
 * @param compativel opcional: só restaura se o rascunho combinar com o que já está no formulário
 */
export function useRascunho<T extends FieldValues>(
  form: UseFormReturn<T>,
  chave: string | null,
  compativel?: (salvo: Record<string, unknown>, atual: T) => boolean
) {
  const restaurado = useRef<string | null>(null);
  const editou = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Ao abrir: espera o formulário ser preenchido (reset da tela) e aplica o rascunho por cima
  useEffect(() => {
    if (!chave) {
      restaurado.current = null;
      editou.current = false;
      return;
    }
    if (restaurado.current === chave) return;
    restaurado.current = chave;
    editou.current = false;
    const t = setTimeout(() => {
      const r = ler(chave);
      if (!r) return;
      const base = form.getValues();
      if (compativel && !compativel(r.valores, base)) return;
      form.reset({ ...base, ...r.valores } as T, { keepDefaultValues: true });
      editou.current = true;
      toast.info("Rascunho recuperado", {
        description: `Continuando de onde você parou (${new Date(r.em).toLocaleString("pt-BR")}).`,
        duration: 8000,
        action: {
          label: "Descartar",
          onClick: () => {
            apagar(chave);
            editou.current = false;
            form.reset(base);
          },
        },
      });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, form]);

  // Enquanto digita: grava (só depois que a pessoa alterou algo, para não criar rascunho vazio)
  useEffect(() => {
    if (!chave) return;
    let pendente: unknown = null;
    const gravar = () => {
      if (!pendente || !editou.current) return;
      try {
        localStorage.setItem(PREFIXO + chave, JSON.stringify({ valores: pendente, em: Date.now() }));
      } catch {
        /* sem espaço/armazenamento: segue sem rascunho */
      }
      pendente = null;
    };
    const sub = form.watch((valores, info) => {
      if (info?.type === "change") editou.current = true;
      if (!editou.current) return;
      pendente = valores;
      clearTimeout(timer.current);
      timer.current = setTimeout(gravar, 400);
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer.current);
      gravar(); // fechou antes do intervalo: grava o que faltava
    };
  }, [chave, form]);

  // Chamar ao salvar com sucesso ou ao cancelar de propósito
  return {
    limpar: () => {
      clearTimeout(timer.current);
      if (chave) apagar(chave);
      editou.current = false;
    },
  };
}
