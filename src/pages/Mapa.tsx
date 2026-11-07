import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, AlertTriangle, CheckCircle2, User, RefreshCw, Crown, Clipboard, Check, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LogSistema {
  id: string;
  created_at: string;
  user_email: string | null;
  acao: string;
  descricao: string;
  detalhes: unknown;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "desenvolvedor" | "master" | "parceiro";
  created_at: string;
}

interface Chamado {
  id: string;
  user_id: string;
  descricao: string;
  status: "Pendente" | "Resolvido";
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function Mapa() {
  const { impersonateUser, user: currentUser, role: currentRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [selectedLogPayload, setSelectedLogPayload] = useState<unknown>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // State for creating Master account
  const [newMasterName, setNewMasterName] = useState("");
  const [newMasterEmail, setNewMasterEmail] = useState("");
  const [createdMasterLink, setCreatedMasterLink] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterName.trim() || !newMasterEmail.trim()) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha o nome e e-mail do novo Master.",
        variant: "destructive",
      });
      return;
    }

    setMasterLoading(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      const { error } = await supabase
        .from("convites" as any)
        .insert({
          email: newMasterEmail.trim(),
          full_name: newMasterName.trim(),
          role: "master",
          token: token,
          criado_por: currentUser?.id,
          usado: false,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      const link = `${window.location.origin}/auth?token=${token}`;
      setCreatedMasterLink(link);
      setNewMasterName("");
      setNewMasterEmail("");

      toast({
        title: "Master Convidado!",
        description: "Convite de Administrador Master gerado com sucesso.",
      });

      loadData();
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao criar Master",
        description: (err as { message?: string }).message || "Ocorreu um erro ao registrar o convite.",
        variant: "destructive",
      });
    } finally {
      setMasterLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(createdMasterLink);
    setCopiedLink(true);
    toast({
      title: "Link Copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Carregar Perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;
      setProfiles(profilesData as unknown as Profile[]);

      // 2. Carregar Chamados Pendentes
      const { data: chamadosData, error: chamadosError } = await (supabase
        .from("suporte_chamados" as never)
        .select("*, profiles:user_id(full_name, email)")
        .eq("status", "Pendente")
        .order("created_at", { ascending: false }) as unknown as Promise<{ data: Chamado[] | null; error: { message: string } | null }>);

      if (chamadosError) throw chamadosError;
      setChamados(chamadosData || []);

      // 3. Carregar logs do sistema
      const { data: logsData, error: logsError } = await (supabase
        .from("logs_sistema" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as unknown as Promise<{ data: LogSistema[] | null; error: { message: string } | null }>);

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar dados",
        description: (err as { message?: string }).message || "Ocorreu um erro no carregamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (chamadoId: string) => {
    try {
      const { error } = await supabase
        .from("suporte_chamados" as never)
        .update({ status: "Resolvido" } as never)
        .eq("id", chamadoId);

      if (error) throw error;

      toast({
        title: "Chamado Resolvido",
        description: "O status do chamado foi atualizado com sucesso.",
      });

      // Recarregar dados
      loadData();
    } catch (err) {
      toast({
        title: "Erro ao atualizar chamado",
        description: (err as { message?: string }).message || "Não foi possível resolver o chamado.",
        variant: "destructive",
      });
    }
  };

  const handleImpersonate = (profile: Profile) => {
    if (profile.id === currentUser?.id) {
      toast({
        title: "Operação Inválida",
        description: "Você já está acessando a sua própria conta.",
        variant: "destructive",
      });
      return;
    }

    // Criar um mock do objeto User para satisfazer o Supabase context
    const mockUser = {
      id: profile.id,
      email: profile.email,
      role: "authenticated",
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {
        full_name: profile.full_name
      },
      created_at: profile.created_at
    };

    impersonateUser(mockUser, profile.role);
    window.location.href = "/"; // Redireciona para o Dashboard com simulação ativa
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Mapa de Controle</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simule o acesso de usuários e gerencie chamados ativos de suporte técnico.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Painel Criar Master Inicial (Apenas para Desenvolvedores) */}
      {currentRole === "desenvolvedor" && (
        <Card className="border border-border/40 bg-background/50 backdrop-blur-md shadow-xl max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" /> Criar Usuário Master Inicial (Setup)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Utilize este painel para registrar o primeiro usuário Master do escritório. Um link de convite único será gerado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="master-nome" className="text-xs font-semibold">Nome Completo</Label>
                <Input
                  id="master-nome"
                  placeholder="Ex: Dr. João Silva"
                  value={newMasterName}
                  onChange={(e) => setNewMasterName(e.target.value)}
                  className="bg-background/40 border-border/30 h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="master-email" className="text-xs font-semibold">E-mail de Acesso</Label>
                <Input
                  id="master-email"
                  type="email"
                  placeholder="joao@escritorio.com.br"
                  value={newMasterEmail}
                  onChange={(e) => setNewMasterEmail(e.target.value)}
                  className="bg-background/40 border-border/30 h-9 text-xs"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={masterLoading} className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                  {masterLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Criar Master Inicial
                </Button>
              </div>
            </form>

            {createdMasterLink && (
              <div className="mt-4 p-3 bg-muted/30 border border-border/10 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1 overflow-hidden w-full">
                  <span className="text-[10px] uppercase font-bold text-amber-500">Link de Convite Gerado:</span>
                  <div className="text-xs font-mono truncate text-muted-foreground bg-background/50 p-2 rounded border border-border/5">
                    {createdMasterLink}
                  </div>
                </div>
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0 flex items-center gap-1.5"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                  {copiedLink ? "Copiado" : "Copiar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção de Chamados de Suporte Ativos */}
      {chamados.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-semibold text-amber-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" /> Chamados de Suporte Pendentes ({chamados.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chamados.map((c) => (
              <Card key={c.id} className="border-amber-500/30 bg-[#0d2b30]/10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground font-serif">
                        {c.profiles?.full_name || "Usuário"}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-muted-foreground">
                        {c.profiles?.email}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Pendente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <p className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded border border-border/10 min-h-[60px] italic leading-relaxed">
                    "{c.descricao}"
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(profiles.find(p => p.id === c.user_id) as Profile)}
                      className="flex-1 text-[11px] h-8 bg-[#EBB52C]/10 hover:bg-[#EBB52C]/20 border-[#EBB52C]/40 text-[#010E38] dark:text-[#EBB52C]"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Simular Conta
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(c.id)}
                      className="flex-1 text-[11px] h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Resolvido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Usuários */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-semibold text-foreground">
          Usuários Cadastrados ({profiles.length})
        </h2>
        <Card className="border-border/20 bg-background/50 backdrop-blur-md shadow-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 pl-6">Nome / Email</th>
                    <th className="p-4">Cargo / Função</th>
                    <th className="p-4">Status / Chamado</th>
                    <th className="p-4 pr-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5 text-sm">
                  {profiles.map((p) => {
                    const hasPendingChamado = chamados.some((c) => c.user_id === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground font-serif">
                              {p.full_name || "-"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline"
                            className={
                              p.role === "desenvolvedor"
                                ? "bg-red-500/10 text-red-500 border-red-500/20 text-[10px]"
                                : p.role === "master"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]"
                            }
                          >
                            {p.role}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {hasPendingChamado ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-semibold animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              ⚠️ Precisa de Ajuda
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleImpersonate(p)}
                            disabled={p.id === currentUser?.id}
                            className="text-xs hover:bg-primary/10 hover:text-primary border border-border/10 h-8"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Acessar Conta
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Logs do Sistema */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Histórico de Alterações / Logs do Sistema
          </h2>
          <Input
            placeholder="Filtrar por e-mail ou descrição..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="w-full sm:max-w-xs h-9 text-xs bg-background/40 border-border/30"
          />
        </div>
        
        <Card className="border-border/20 bg-background/50 backdrop-blur-md shadow-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 pl-6">Data / Hora</th>
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Operação</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 pr-6 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5 text-sm">
                  {logs
                    .filter(
                      (l) =>
                        !logSearch ||
                        (l.user_email && l.user_email.toLowerCase().includes(logSearch.toLowerCase())) ||
                        (l.descricao || "").toLowerCase().includes(logSearch.toLowerCase())
                    )
                    .map((l) => (
                      <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 text-xs text-muted-foreground">
                          {new Date(l.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-4 text-xs font-semibold text-foreground">
                          {l.user_email || "sistema@jusmais.com"}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={
                              l.acao === "INSERT"
                                ? "bg-green-500/10 text-green-500 border-green-500/20 text-[10px]"
                                : l.acao === "UPDATE"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]"
                                : "bg-red-500/10 text-red-500 border-red-500/20 text-[10px]"
                            }
                          >
                            {l.acao}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {l.descricao}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLogPayload(l.detalhes);
                              setIsLogModalOpen(true);
                            }}
                            className="text-xs hover:bg-primary/10 hover:text-primary border border-border/10 h-8"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Ver Payload
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-border/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-foreground">
              Detalhes do Payload (JSON)
            </DialogTitle>
          </DialogHeader>
          <div className="bg-[#010E38] p-4 rounded-lg border border-border/10 overflow-x-auto">
            <pre className="text-xs font-mono text-[#EBB52C] leading-relaxed">
              {JSON.stringify(selectedLogPayload, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setIsLogModalOpen(false)}
              className="bg-primary text-primary-foreground font-semibold px-6"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
