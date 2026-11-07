
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Atendimentos from "./pages/Atendimentos";
import Processos from "./pages/Processos";
import Audiencias from "./pages/Audiencias";
import Tarefas from "./pages/Tarefas";
import Workflows from "./pages/Workflows";
import Documentos from "./pages/Documentos";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Mensagens from "./pages/Mensagens";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import Mapa from "./pages/Mapa";

import Configuracoes from "./pages/Configuracoes";
import Agenda from "./pages/Agenda";
import Equipe from "./pages/Equipe";
import Integracoes from "./pages/Integracoes";
import MinhaComissao from "./pages/MinhaComissao";
import Ajuda from "./pages/Ajuda";

const queryClient = new QueryClient();

const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/auth?recovery=true");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  return null;
};

const DeveloperRoute = ({ children }: { children: React.ReactNode }) => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "desenvolvedor") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const SimulatedSessionBanner = () => {
  const { impersonating, user, stopImpersonating } = useAuth();

  if (!impersonating || !user) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-3 shadow-md z-[100] relative">
      <span>
        Você está simulando o acesso da conta: <strong className="underline">{user.email}</strong>
      </span>
      <button
        onClick={stopImpersonating}
        className="bg-white text-amber-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-50 transition-colors shadow-sm"
      >
        Voltar para Admin
      </button>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthRedirectHandler />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify" element={<Auth />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex flex-col w-full">
                        <SimulatedSessionBanner />
                        <div className="flex flex-1 w-full">
                          <AppSidebar />
                          <main className="flex-1">
                            <div className="p-2 flex items-center justify-between">
                              <SidebarTrigger />
                              <ThemeToggle />
                            </div>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/clientes" element={<Clientes />} />
                              <Route path="/atendimentos" element={<Atendimentos />} />
                              <Route path="/processos" element={<Processos />} />
                              <Route path="/audiencias" element={<Audiencias />} />
                              <Route path="/tarefas" element={<Tarefas />} />
                              <Route path="/workflows" element={<Workflows />} />
                              <Route path="/documentos" element={<Documentos />} />
                              <Route path="/financeiro" element={<Financeiro />} />
                              <Route path="/agenda" element={<Agenda />} />
                              <Route path="/equipe" element={<Equipe />} />
                              <Route path="/relatorios" element={<Relatorios />} />
                              <Route path="/mensagens" element={<Mensagens />} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
                              <Route path="/integracoes" element={<Integracoes />} />
                              <Route path="/mapa" element={
                                <DeveloperRoute>
                                  <Mapa />
                                </DeveloperRoute>
                              } />
                              <Route path="/minha-comissao" element={<MinhaComissao />} />
                              <Route path="/ajuda" element={<Ajuda />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </main>
                        </div>
                      </div>
                    </SidebarProvider>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
