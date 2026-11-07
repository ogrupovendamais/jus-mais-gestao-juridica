import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("signin");
  const [isEmailDisabled, setIsEmailDisabled] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const type = params.get("type");
    const isVerifyPath = window.location.pathname.includes("/verify");

    if (token && !type && !isVerifyPath) {
      const checkInvitation = async () => {
        try {
          const { data: rows, error } = await (supabase.rpc("get_convite_by_token" as never, { p_token: token } as never) as unknown as Promise<{ data: { email: string; full_name: string }[] | null; error: { message: string } | null }>);
          const data = rows?.[0] ?? null;

          if (error || !data) {
            toast({
              title: "Convite Inválido",
              description: "Este convite expirou, foi cancelado ou já foi utilizado.",
              variant: "destructive"
            });
            setActiveTab("signin");
          } else {
            setActiveTab("signup");
            setEmail(data.email);
            setFullName(data.full_name);
            setIsEmailDisabled(true);
            toast({
              title: "Convite Válido!",
              description: `Olá ${data.full_name}, defina sua senha abaixo para concluir seu cadastro.`,
            });
          }
        } catch (err) {
          console.error("Erro ao validar convite:", err);
          setActiveTab("signin");
        }
      };
      checkInvitation();
    } else if (token && type) {
      const verifySession = async () => {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'recovery' | 'signup' | 'invite' | 'magiclink',
          });
          if (error) {
            toast({
              title: "Erro de Verificação",
              description: error.message || "O link de verificação é inválido ou expirou.",
              variant: "destructive",
            });
            setActiveTab("signin");
          } else {
            if (type !== "recovery") {
              toast({
                title: "Sucesso!",
                description: "E-mail confirmado com sucesso.",
              });
              navigate("/");
            }
          }
        } catch (err) {
          console.error("Erro na verificação de OTP:", err);
        }
      };
      verifySession();
    }
  }, [toast, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("recovery") === "true") {
      setActiveTab("reset");
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && activeTab !== "reset") {
        navigate("/");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setActiveTab("reset");
        toast({
          title: "Sessão de Recuperação Ativada",
          description: "Por favor, digite sua nova senha abaixo.",
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, activeTab, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Erro ao enviar e-mail",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "E-mail enviado com sucesso!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setActiveTab("signin");
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          title: "Erro ao atualizar senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha atualizada com sucesso!",
          description: "Sua nova senha foi salva. Faça login para continuar.",
        });
        await supabase.auth.signOut();
        navigate("/auth", { replace: true });
        setActiveTab("signin");
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Usuário já cadastrado",
            description: "Este email já está cadastrado. Tente fazer login.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao Jus+ (JusMais).",
        });
        navigate("/");
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#010E38] p-4 relative overflow-hidden">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Coluna Institucional — 05 : Sistema Tipográfico & 02 : Paleta Imutável */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between pr-8 space-y-8 text-[#F1F4F9]">
          <div className="space-y-4">
            <span className="inline-block bg-[#EBB52C] text-[#010E38] text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded">
              VENDA+ TECH · JUSMAIS
            </span>
            <p className="font-display text-6xl font-black text-[#EBB52C] tracking-[-1px] uppercase leading-none">
              JUS+
            </p>
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Infraestrutura
              <br />
              Comercial Jurídica
            </h1>
            <h2 className="text-xl font-bold text-[#EBB52C]">
              Seu escritório merece crescer
            </h2>
            <p className="text-sm font-normal text-[#F1F4F9]/80 leading-relaxed max-w-lg">
              Escritórios de advocacia que crescem consistentemente não dependem de talento ou sorte. Dependem de infraestrutura: CRM, automação, dados e processo. A Venda+ Tech construiu isso do zero para a advocacia brasileira.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/15 max-w-md">
            <div>
              <p className="font-data text-4xl font-bold text-[#EBB52C]">3×</p>
              <p className="text-xs text-[#F1F4F9]/75 mt-1">crescimento médio · 90 dias</p>
            </div>
            <div>
              <p className="font-data text-4xl font-bold text-[#EBB52C]">+247%</p>
              <p className="text-xs text-[#F1F4F9]/75 mt-1">conversão com CRM implantado</p>
            </div>
          </div>
        </div>

        {/* Card de Autenticação */}
        <Card className="lg:col-span-5 w-full max-w-md mx-auto border border-white/15 bg-[#F1F4F9] text-[#010E38] shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-[#010E38] flex items-center justify-center mb-3 shadow-md">
              <img src="/logo-emblema.png" alt="Jus+" className="w-9 h-9 object-contain" />
            </div>
            <CardTitle className="font-display text-2xl font-black text-[#010E38] tracking-[-0.5px] uppercase">
              JUS+
            </CardTitle>
            <CardDescription className="text-[#010E38]/70 font-semibold text-xs uppercase tracking-wider mt-1">
              Infraestrutura Comercial Jurídica
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {activeTab !== "forgot" && activeTab !== "reset" && activeTab === "signup_disabled" && (
                <TabsList className="grid w-full grid-cols-2 bg-[#010E38]/10 p-1 rounded-lg mb-6">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="signin" className="space-y-4 focus-visible:outline-none">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-[#010E38]/20 text-[#010E38] focus:border-[#010E38]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-xs font-bold text-[#010E38] hover:underline focus:outline-none"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white border-[#010E38]/20 text-[#010E38] focus:border-[#010E38]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold uppercase tracking-wider shadow-md py-5 mt-2 transition-all"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Acessar Painel
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 focus-visible:outline-none">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Nome Completo
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isEmailDisabled}
                      className="bg-white border-[#010E38]/20 text-[#010E38]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isEmailDisabled}
                      className="bg-white border-[#010E38]/20 text-[#010E38]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white border-[#010E38]/20 text-[#010E38]"
                    />
                  </div>
                  <div className="flex items-start space-x-2 py-2">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#010E38]/30 bg-white text-[#010E38]"
                    />
                    <Label htmlFor="terms" className="text-xs text-[#010E38]/80 leading-tight cursor-pointer">
                      Li e concordo com os{" "}
                      <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="text-[#010E38] underline font-bold"
                      >
                        Termos de Uso e Políticas de Privacidade
                      </button>{" "}
                      da plataforma Jus+ (JusMais).
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold uppercase tracking-wider py-5 mt-2"
                    disabled={loading || !acceptedTerms}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta Exclusiva
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="forgot" className="space-y-4 focus-visible:outline-none">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Email para recuperação
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-[#010E38]/20 text-[#010E38]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold uppercase tracking-wider py-5 mt-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Link de Recuperação
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className="w-full text-center text-xs font-bold text-[#010E38] hover:underline mt-2"
                  >
                    Voltar para o Login
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="reset" className="space-y-4 focus-visible:outline-none">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-[#010E38]">
                      Nova Senha
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-white border-[#010E38]/20 text-[#010E38]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold uppercase tracking-wider py-5 mt-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Nova Senha
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground">
              Termos de Uso e Políticas de Privacidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed pr-2">
            <p className="font-semibold text-foreground">Última atualização: 9 de Julho de 2026</p>

            <section className="space-y-2">
              <h3 className="font-bold text-foreground text-base">1. Aceite dos Termos</h3>
              <p>
                Ao acessar e utilizar a plataforma <strong>Jus+ (JusMais)</strong>, você expressa seu consentimento e aceita cumprir integralmente as condições descritas nestes Termos de Uso.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-foreground text-base">2. Sigilo Profissional e Confidencialidade</h3>
              <p>
                Toda e qualquer informação contida nesta plataforma referente a clientes, processos judiciais, teses jurídicas, andamentos e movimentações financeiras está protegida por sigilo profissional.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-foreground text-base">3. Propriedade Intelectual</h3>
              <p>
                O design, código-fonte, banco de dados, logotipos e toda a estrutura lógica do sistema <strong>Jus+ (JusMais)</strong> são propriedades exclusivas da <strong>Venda+ Tech</strong>.
              </p>
            </section>
          </div>
          <div className="flex justify-end pt-4 border-t border-border/10">
            <Button
              onClick={() => {
                setAcceptedTerms(true);
                setIsTermsModalOpen(false);
              }}
              className="bg-[#EBB52C] text-[#010E38] font-bold px-6"
            >
              Entendi e Aceito os Termos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
