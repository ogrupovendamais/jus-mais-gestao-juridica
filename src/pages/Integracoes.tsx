import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, HelpCircle, Loader2 } from "lucide-react";

export default function Integracoes() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Load existing Google integration credentials and connection status
  useEffect(() => {
    const loadIntegration = async () => {
      try {
        if (!user) return;
        const { data, error } = await supabase
          .from("google_integration")
          .select("*")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setClientId(data.client_id || "");
          setClientSecret(data.client_secret || "");
          // Account is fully connected if we have a refresh_token
          if (data.refresh_token) {
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar integração Google:", err);
      } finally {
        setLoading(false);
      }
    };

    loadIntegration();

    // Check if redirect query parameters contain success
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("success") === "true") {
      toast({
        title: "Integração Concluída!",
        description: "A conta Google do escritório foi conectada e autorizada com sucesso.",
        variant: "default",
      });
      // Clear query params to prevent repeating toast on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, toast]);

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o Client ID e o Client Secret.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: existing } = await supabase
        .from("google_integration")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("google_integration")
          .update({
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("google_integration")
          .insert({
            user_id: user?.id,
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
          });
        if (error) throw error;
      }

      toast({
        title: "Credenciais salvas!",
        description: "Credenciais do Google Cloud registradas. Agora você já pode conectar a conta.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível registrar as credenciais no banco.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const origin = window.location.origin;
      const res = await fetch(`https://erp.cadoreadvocacia.com.br/auth-url?origin=${encodeURIComponent(origin)}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      if (data.url) {
        // Redirect to Google Consent screen
        window.location.href = data.url;
      } else {
        throw new Error("URL de autorização inválida retornada pelo servidor.");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro de Conexão",
        description: err.message || "Por favor, salve as credenciais do Google Cloud antes de conectar.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("google_integration")
        .update({
          access_token: null,
          refresh_token: null,
          expires_at: null,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: "Desconectado!",
        description: "A conta Google do escritório foi desconectada com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível remover os tokens de acesso.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (role !== "desenvolvedor") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground italic">
        Acesso restrito ao Desenvolvedor do sistema.
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">Integrações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie e integre ferramentas de terceiros para aumentar a produtividade do escritório.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-lg text-[#010E38] dark:text-[#EBB52C]">
                Google Calendar & Drive Centralizado
              </CardTitle>
              <CardDescription className="text-xs">
                Sincronize as audiências do sistema com a agenda master do escritório e salve petições/documentos de forma organizada no Google Drive central.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="Seu Google Client ID do Cloud Console"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      disabled={isConnected}
                      className="text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      placeholder="Seu Google Client Secret do Cloud Console"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      disabled={isConnected}
                      className="text-sm font-mono"
                    />
                  </div>
                </div>

                {!isConnected ? (
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSaveCredentials} disabled={saving} variant="outline" className="text-sm">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Credenciais
                    </Button>
                    <Button onClick={handleConnectGoogle} disabled={connecting || !clientId} className="bg-primary hover:bg-primary/90 text-sm">
                      {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Conectar Conta Google
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg p-3 text-sm">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                      <span>Conta Google centralizada conectada e operacional.</span>
                    </div>
                    <Button onClick={handleDisconnectGoogle} variant="destructive" className="w-fit text-sm">
                      Desconectar Conta Google
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-muted/10 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                <HelpCircle className="h-4 w-4 text-[#EBB52C]" />
                Como configurar seu Google Cloud Project?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-[#010E38] dark:text-[#EBB52C] hover:underline font-semibold">Google Cloud Console</a> com sua conta Google de desenvolvedor.</li>
                <li>Crie um novo projeto chamado <strong>"Advoga Pro"</strong>.</li>
                <li>No menu lateral, vá em <strong>APIs e Serviços &gt; Biblioteca</strong>, busque e ative a **Google Calendar API** e a **Google Drive API**.</li>
                <li>Vá em <strong>Tela de Consentimento OAuth</strong>, selecione o tipo de usuário (External), preencha o nome do app como "Advoga Pro" e avance.</li>
                <li>Na aba de Escopos, adicione os escopos: <code>.../auth/calendar</code> e <code>.../auth/drive.file</code>.</li>
                <li>Vá em <strong>Credenciais</strong>, clique em <strong>Criar Credenciais &gt; ID do cliente OAuth</strong>. Escolha o tipo de aplicativo como **Aplicativo Web**.</li>
                <li>Nas URLs de redirecionamento autorizadas (Authorized redirect URIs), adicione a URL exata: <code>https://erp.cadoreadvocacia.com.br/oauth2callback</code></li>
                <li>Clique em Criar, copie o **Client ID** e o **Client Secret** gerados e cole nos campos do ERP acima!</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">Status da Conexão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`h-3.5 w-3.5 rounded-full border shadow-sm ${isConnected ? "bg-green-500 border-green-400" : "bg-red-500 border-red-400"}`}></span>
                <div>
                  <div className="font-semibold text-sm">{isConnected ? "Google Conectado" : "Google Desconectado"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isConnected ? "A banca está integrada" : "Aguardando configuração de chaves"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
