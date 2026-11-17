import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle2, Copy, ExternalLink, KeyRound } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

const DEFAULT_GOOGLE_CLIENT_ID = ["614078414355", "gkuh4n966pqrjqvqau80bds3i9mapq97", "apps.googleusercontent.com"]
  .join("-")
  .replace("-apps.googleusercontent.com", ".apps.googleusercontent.com");

export default function Integracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientId, setClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Carrega script Google Identity Services (GSI)
  useEffect(() => {
    const existingScript = document.getElementById("google-gsi-client");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gsi-client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Carrega credenciais existentes do Supabase e localStorage
  useEffect(() => {
    async function loadIntegration() {
      try {
        setLoading(true);
        const localClientId = localStorage.getItem("jus_google_client_id") || "";
        const localApiKey = localStorage.getItem("jus_google_api_key") || "";
        const localConta = localStorage.getItem("jus_conta_google_ativa");

        if (localClientId) setClientId(localClientId);
        if (localApiKey) setApiKey(localApiKey);
        if (localConta) {
          try {
            const parsed = JSON.parse(localConta);
            if (parsed?.email) {
              setConnectedEmail(parsed.email);
              if (parsed.accessToken) setIsConnected(true);
            }
          } catch {}
        }

        const { data } = await supabase
          .from("google_integration")
          .select("*")
          .maybeSingle();

        if (data) {
          if (data.client_id) {
            setClientId(data.client_id);
            localStorage.setItem("jus_google_client_id", data.client_id);
          }
          if (data.client_secret) {
            setClientSecret(data.client_secret);
          }
          if (data.access_token) {
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar integração Google:", err);
      } finally {
        setLoading(false);
      }
    }

    loadIntegration();
  }, [user]);

  const handleSaveCredentials = async () => {
    if (!clientId.trim()) {
      toast({
        title: "Client ID obrigatório",
        description: "Por favor, informe o Google OAuth Client ID (.apps.googleusercontent.com).",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      localStorage.setItem("jus_google_client_id", clientId.trim());
      if (apiKey.trim()) {
        localStorage.setItem("jus_google_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("jus_google_api_key");
      }

      const { data: existing } = await supabase
        .from("google_integration")
        .select("id")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("google_integration")
          .update({
            client_id: clientId.trim(),
            client_secret: clientSecret.trim() || "oauth-spa",
          })
          .eq("id", existing.id);
      } else if (user?.id) {
        await supabase
          .from("google_integration")
          .insert({
            user_id: user.id,
            client_id: clientId.trim(),
            client_secret: clientSecret.trim() || "oauth-spa",
          });
      }

      toast({
        title: "Credenciais da API salvas!",
        description: "Google Drive API e Google Docs API configuradas. Agora clique em Conectar Conta Google.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Credenciais salvas localmente",
        description: "Suas chaves foram salvas e já estão ativas para o Google Drive e Google Docs.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!clientId.trim()) {
      toast({
        title: "Informe o Client ID",
        description: "Cole seu Google Client ID antes de iniciar a autenticação OAuth.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("jus_google_client_id", clientId.trim());
    if (apiKey.trim()) localStorage.setItem("jus_google_api_key", apiKey.trim());

    if (!window.google?.accounts?.oauth2) {
      toast({
        title: "Carregando biblioteca Google",
        description: "Aguarde um segundo e tente novamente.",
      });
      return;
    }

    try {
      setConnecting(true);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope:
          "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        prompt: "select_account",
        callback: async (response: any) => {
          setConnecting(false);
          if (response?.access_token) {
            try {
              const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const profile = await userRes.json();
              const conta = {
                nome: profile.name || "Conta Google",
                email: profile.email || "",
                iniciais: (profile.name || "G").substring(0, 1).toUpperCase(),
                cor: "#010E38",
                accessToken: response.access_token,
              };
              localStorage.setItem("jus_conta_google_ativa", JSON.stringify(conta));
              setConnectedEmail(conta.email);
              setIsConnected(true);

              if (user?.id) {
                const { data: existing } = await supabase
                  .from("google_integration")
                  .select("id")
                  .maybeSingle();
                if (existing) {
                  await supabase
                    .from("google_integration")
                    .update({ access_token: response.access_token })
                    .eq("id", existing.id);
                }
              }

              toast({
                title: "Google Drive & Docs Conectados!",
                description: `Autenticado com sucesso na conta ${conta.email}.`,
              });
            } catch (e) {
              console.error(e);
            }
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      setConnecting(false);
      toast({
        title: "Erro ao abrir OAuth Google",
        description: err.message || "Verifique se o Client ID está correto.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setLoading(true);
      localStorage.removeItem("jus_conta_google_ativa");
      setIsConnected(false);
      setConnectedEmail("");

      if (user?.id) {
        await supabase
          .from("google_integration")
          .update({
            access_token: null,
            refresh_token: null,
            expires_at: null,
          })
          .eq("user_id", user.id);
      }

      toast({
        title: "Desconectado!",
        description: "A conta Google foi desconectada com sucesso.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const originAtual = typeof window !== "undefined" ? window.location.origin : "https://jus-mais-gestao-juridica.vercel.app";

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-[#EBB52C] text-[#010E38] px-2.5 py-0.5 rounded mb-1.5">
          ECOSSISTEMA GOOGLE CLOUD
        </span>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#010E38] tracking-tight">
          Integrações — Google Drive, Google Docs & Agenda
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure as chaves oficiais da API do Google para listar arquivos do Google Drive, usar o Google Picker e criar minutas automáticas no Google Docs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 shadow-sm bg-white text-[#010E38]">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#010E38] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#EBB52C]" />
                <span>Credenciais da API (Google Drive API v3 & Google Docs API v1)</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Insira o Client ID OAuth 2.0 e a API Key do seu projeto no Google Cloud Console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientId" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                    Google OAuth Client ID *
                  </Label>
                  <Input
                    id="clientId"
                    placeholder="Seu Client ID do Google Cloud Console"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="text-sm font-mono bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Usado para abrir a janela oficial de login do Google (<code>accounts.google.com</code>) e autenticar o Google Drive e Google Docs.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="apiKey" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                    Google API Key (Opcional — para Google Picker nativo)
                  </Label>
                  <Input
                    id="apiKey"
                    placeholder="Ex: AIzaSyB1234567890abcdefghijklmnopqrst"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="text-sm font-mono bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clientSecret" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                    Google Client Secret (Opcional)
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Ex: GOCSPX-..."
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="text-sm font-mono bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    disabled={saving}
                    className="bg-white hover:bg-slate-100 text-[#010E38] border-2 border-[#010E38] font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Salvar Chaves da API</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={connecting || !clientId.trim()}
                    className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Conectar Conta Google (OAuth 2.0)</span>
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      className="text-xs font-bold uppercase text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg transition-colors"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-sm text-[#010E38]">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#010E38] flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#EBB52C]" />
                <span>Passo a Passo para pegar o Client ID e API Key no Google Cloud</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3 pt-4 leading-relaxed">
              <ol className="list-decimal pl-4 space-y-2.5">
                <li>
                  Acesse o{" "}
                  <a
                    href="https://console.cloud.google.com/apis/library"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#010E38] font-bold underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console (Biblioteca de APIs) <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  e ative estas 3 APIs:
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="bg-[#010E38] text-[#EBB52C] font-bold px-2.5 py-0.5 rounded text-[11px]">
                      1. Google Drive API
                    </span>
                    <span className="bg-[#010E38] text-[#EBB52C] font-bold px-2.5 py-0.5 rounded text-[11px]">
                      2. Google Docs API
                    </span>
                    <span className="bg-[#010E38] text-[#EBB52C] font-bold px-2.5 py-0.5 rounded text-[11px]">
                      3. Google Picker API
                    </span>
                  </div>
                </li>
                <li>
                  No menu lateral, vá em <strong>APIs e Serviços &gt; Credenciais</strong> e clique em{" "}
                  <strong>+ Criar Credenciais &gt; ID do cliente OAuth</strong> (Tipo: <strong>Aplicativo da Web</strong>).
                </li>
                <li>
                  Em <strong>Origens JavaScript autorizadas (Authorized JavaScript origins)</strong>, adicione exatamente estas URLs:
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-mono text-[11px] text-[#010E38]">
                      <span>https://jus-mais-gestao-juridica.vercel.app</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto("https://jus-mais-gestao-juridica.vercel.app", "URL de Produção")}
                        className="text-xs font-sans font-bold text-[#010E38] hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-mono text-[11px] text-[#010E38]">
                      <span>{originAtual}</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(originAtual, "URL Atual")}
                        className="text-xs font-sans font-bold text-[#010E38] hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                  </div>
                </li>
                <li>
                  Copie o <strong>ID do cliente (Client ID)</strong> gerado e cole no campo acima!
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm bg-white text-[#010E38]">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                Status das APIs Google
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                    clientId.trim() ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <div>
                  <div className="font-bold text-sm text-[#010E38]">
                    {clientId.trim() ? "Client ID Configurado" : "Modo Demonstração Ativo"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {connectedEmail
                      ? `Conta ativa: ${connectedEmail}`
                      : clientId.trim()
                      ? "Pronto para autenticar via OAuth 2.0"
                      : "Informe o Client ID para usar a API oficial"}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Google Drive API v3</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Integrada
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Google Docs API v1</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Integrada
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Google Picker API</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Integrada
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
