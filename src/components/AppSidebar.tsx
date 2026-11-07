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
} from "lucide-react";
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
        <SidebarHeader className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EBB52C] flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo-emblema.png" alt="Jus+" className="w-6 h-6 object-contain" />
            </div>
            <div className="leading-none">
              <h2 className="font-display text-lg font-black tracking-[-0.5px] text-[#EBB52C] uppercase">
                JUS+
              </h2>
              <p className="text-[9px] text-[#F1F4F9]/70 uppercase tracking-[0.18em] font-bold mt-1">
                Venda+ Tech · Jurídico
              </p>
            </div>
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
                    <Link to="/workflows" className="flex items-center gap-3">
                      <GitBranch className="w-4 h-4" />
                      <span>Workflows</span>
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
                      <Link to="/minha-comissao" className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-[#EBB52C]" />
                        <span>Minha Comissão</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {!isParceiro && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/equipe")}>
                      <Link to="/equipe" className="flex items-center gap-3">
                        <UserCheck className="w-4 h-4" />
                        <span>Equipe</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/financeiro")}>
                    <Link to="/financeiro" className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4" />
                      <span>Financeiro</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {(!isParceiro || isFinanceiro) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/relatorios")}>
                      <Link to="/relatorios" className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4" />
                        <span>Relatórios</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={navClass("/mensagens")}>
                    <Link to="/mensagens" className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4" />
                      <span>Mensagens</span>
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
