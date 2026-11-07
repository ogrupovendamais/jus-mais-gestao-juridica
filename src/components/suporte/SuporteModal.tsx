import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface SuporteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuporteModal({ isOpen, onClose }: SuporteModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Por favor, descreva qual problema está enfrentando.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      // 1. Gravar chamado no Supabase
      const { error: dbError } = await supabase
        .from("suporte_chamados" as unknown as "clientes")
        .insert({
          user_id: user.id,
          descricao: descricao.trim(),
          status: "Pendente",
        } as unknown as never);

      if (dbError) throw dbError;

      // 2. Notificar suporte técnico via API no VPS
      const emailPayload = {
        email: user.email,
        userId: user.id,
        descricao: descricao.trim(),
      };

      try {
        await fetch("https://erp.cadoreadvocacia.com.br/api/google/suporte", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });
      } catch (emailErr) {
        console.error("Erro ao enviar email de suporte:", emailErr);
        // Não travar o fluxo caso o email falhe mas grave no banco
      }

      toast({
        title: "Chamado Enviado!",
        description: "Nossa equipe técnica foi notificada e já estamos analisando o seu caso.",
      });

      setDescricao("");
      onClose();
    } catch (error) {
      console.error(error);
      const errorMsg = error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
      toast({
        title: "Erro ao abrir chamado",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border border-border/20 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-serif text-foreground flex items-center gap-2">
              <span className="text-amber-500">✨</span> Canal de Suporte Técnico
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Descreva detalhadamente o problema ou a funcionalidade que precisa de auxílio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="support-desc" className="text-sm font-semibold">
                O que está acontecendo?
              </Label>
              <Textarea
                id="support-desc"
                placeholder="Ex: Não consigo gerar o relatório mensal de parceiros, está dando erro ao clicar em calcular..."
                rows={5}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="bg-background/40 border-border/30 focus:border-primary/50 transition-colors text-sm"
              />
            </div>
             <p className="text-[10px] text-muted-foreground/80 leading-normal">
              ℹ️ Os desenvolvedores serão notificados na hora e poderão acessar o seu painel de forma segura para depurar e resolver o problema diretamente na sua conta.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-border/10 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 text-xs flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Enviar Chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
