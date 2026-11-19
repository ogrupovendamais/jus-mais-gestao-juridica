import {
  BarChart3,
  Calendar,
  FileText,
  Home,
  Settings,
  Users,
  Briefcase,
  Clock,
  MessageSquare,
  DollarSign,
  Wallet,
  LogOut,
  CalendarDays,
  UserCheck,
  HelpCircle,
  Map,
  GitBranch,
  MessageCircle,
  Newspaper,
  CreditCard,
  Lock,
} from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SuporteModal } from "@/components/suporte/SuporteModal";

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user, role, classificacao } = useAuth();
  const { plan, planInfo, canAccessModule } = usePlan();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const isParceiro = role === "parceiro";
  const isFinanceiro = classificacao === "assistente_financeiro";
  const isDesenvolvedor = role === "desenvolvedor";

  const handleSignOut = async () => {
    await signOut();
  };

  const navClass = (url: string) =>
    location.pathname === url
      ? "bg-[#EBB52C] text-[#010E38] font-bold hover:bg-[#EBB52C] hover:text-[#010E38] rounded-md shadow-xs"
      : "text-[#F1F4F9]/80 hover:text-[#F1F4F9] hover:bg-white/8 font-medium rounded-md";

  return (
    <>
      <Sidebar className="border-r border-[#010E38]/20 bg-[#010E38] text-[#F1F4F9]">
        <SidebarHeader className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#010E38] border border-[#EBB52C]/40 flex items-center justify-center shrink-0 shadow-sm p-1">
              <img src="/logo-emblema.png?v=6" alt="JURI+ TECH" className="w-full h-full object-contain" />
            </div>
            <img
              src="/logo-texto.png?v=6"
              alt="JURI+ TECH — Sistema ERP para Advogados"
              className="h-8 max-w-[165px] w-auto object-contain"
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          {/* GRUPO: Navegação Principal */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[#EBB52C]/80 uppercase tracking-[0.14em] text-[10px] font-extrabold px-3 mb-1">
              Operação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/")}>
                    <Link to="/" className="flex items-center gap-3">
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/clientes")}>
                    <Link to="/clientes" className="flex items-center gap-3">
                      <Users className="w-4 h-4" />
                      <span>Clientes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/atendimentos")}>
                    <Link to="/atendimentos" className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4" />
                      <span>Atendimentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/processos")}>
                    <Link to="/processos" className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4" />
                      <span>Processos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/publicacoes")}>
                    <Link to="/publicacoes" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Newspaper className="w-4 h-4" />
                        <span>Publicações</span>
                      </div>
                      {!canAccessModule("publicacoes") ? (
                        <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                      ) : (
                        <span className="bg-[#E53E3E] text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                          26
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/audiencias")}>
                    <Link to="/audiencias" className="flex items-center gap-3">
                      <Calendar className="w-4 h-4" />
                      <span>Audiências</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/tarefas")}>
                    <Link to="/tarefas" className="flex items-center gap-3">
                      <Clock className="w-4 h-4" />
                      <span>Tarefas · Kanban</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/workflows")}>
                    <Link to="/workflows" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-4 h-4" />
                        <span>Workflows</span>
                      </div>
                      {!canAccessModule("workflows") && (
                        <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/documentos")}>
                    <Link to="/documentos" className="flex items-center gap-3">
                      <FileText className="w-4 h-4" />
                      <span>Documentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* GRUPO: Gestão */}
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="text-[#EBB52C]/80 uppercase tracking-[0.14em] text-[10px] font-extrabold px-3 mb-1">
              {isParceiro ? "Meu Painel" : "Infraestrutura"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/agenda")}>
                    <Link to="/agenda" className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4" />
                      <span>Agenda</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isParceiro && !isFinanceiro && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/minha-comissao")}>
                      <Link to="/minha-comissao" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-4 h-4 text-[#EBB52C]" />
                          <span>Minha Comissão</span>
                        </div>
                        {!canAccessModule("minha_comissao") && (
                          <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {!isParceiro && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/equipe")}>
                      <Link to="/equipe" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-4 h-4" />
                          <span>Equipe</span>
                        </div>
                        {plan !== "escritorio" && (
                          <span className="text-[9px] font-mono font-bold bg-white/10 text-[#EBB52C] px-1.5 py-0.5 rounded">
                            {plan === "start" ? "Máx 1" : "Máx 3"}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/financeiro")}>
                    <Link to="/financeiro" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4" />
                        <span>Financeiro</span>
                      </div>
                      {!canAccessModule("financeiro") && (
                        <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {(!isParceiro || isFinanceiro) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/relatorios")}>
                      <Link to="/relatorios" className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-4 h-4" />
                          <span>Indicadores</span>
                        </div>
                        {!canAccessModule("relatorios") && (
                          <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/mensagens")}>
                    <Link to="/mensagens" className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4" />
                        <span>Mensagens</span>
                      </div>
                      {!canAccessModule("mensagens") && (
                        <Lock className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isDesenvolvedor && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/integracoes")}>
                      <Link to="/integracoes" className="flex items-center gap-3">
                        <Settings className="w-4 h-4" />
                        <span>Integrações</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {isDesenvolvedor && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/mapa")}>
                      <Link to="/mapa" className="flex items-center gap-3">
                        <Map className="w-4 h-4 text-[#EBB52C]" />
                        <span>Mapa de Controle</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="p-4 space-y-2 border-t border-white/10">
          <Button
            variant="outline"
            asChild
            className="group/btn w-full justify-start h-9 bg-white/5 hover:bg-[#EBB52C] text-[#F1F4F9] hover:text-[#010E38] border-white/15 font-semibold text-xs transition-colors"
          >
            <Link to="/ajuda">
              <HelpCircle className="w-4 h-4 mr-2 text-[#EBB52C] group-hover/btn:text-[#010E38] transition-colors" />
              Manual do Usuário
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsSupportOpen(true)}
            className="group/btn w-full justify-start h-9 bg-white/5 hover:bg-[#EBB52C] text-[#F1F4F9] hover:text-[#010E38] border-white/15 font-semibold text-xs transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2 text-[#EBB52C] group-hover/btn:text-[#010E38] transition-colors" />
            Suporte Técnico
          </Button>

          <SidebarMenuButton asChild className={navClass("/planos")}>
            <Link to="/planos" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-[#EBB52C]" />
                <span>Meu Plano</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase bg-[#EBB52C] text-[#010E38] px-1.5 py-0.5 rounded">
                {planInfo.nome.replace("JURI+ TECH ", "").replace("JUS+ ", "")}
              </span>
            </Link>
          </SidebarMenuButton>

          <SidebarMenuButton asChild className={navClass("/configuracoes")}>
            <Link to="/configuracoes" className="flex items-center gap-3 w-full">
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </Link>
          </SidebarMenuButton>

          <div className="pt-2 border-t border-white/10">
            <p className="font-data text-[11px] text-[#F1F4F9]/75 mb-2 px-2 truncate">
              {user?.email}
            </p>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start h-8 px-2 text-xs font-semibold text-[#F1F4F9]/85 hover:bg-[#EBB52C] hover:text-[#010E38]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SuporteModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
}
