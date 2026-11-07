import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "desenvolvedor" | "master" | "parceiro";
  classificacao: string | null;
  loading: boolean;
  impersonating: boolean;
  originalUser: User | null;
  originalRole: "desenvolvedor" | "master" | "parceiro" | null;
  signOut: () => Promise<void>;
  impersonateUser: (targetUser: any, targetRole: "desenvolvedor" | "master" | "parceiro") => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"desenvolvedor" | "master" | "parceiro">("parceiro");
  const [classificacao, setClassificacao] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // id do usuário já carregado (para ignorar renovações de sessão da mesma pessoa)
  const userIdCarregado = useRef<string | null>(null);

  // Impersonation state
  const [impersonating, setImpersonating] = useState(false);
  const [origUser, setOrigUser] = useState<User | null>(null);
  const [origRole, setOrigRole] = useState<"desenvolvedor" | "master" | "parceiro" | null>(null);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await (supabase
        .from("profiles")
        .select("role, ativo, classificacao") as any)
        .eq("id", userId)
        .single();
      if (data) {
        if (data.ativo === false) {
          await supabase.auth.signOut();
          localStorage.removeItem("advogapro_impersonation");
          setRole("parceiro");
          setUser(null);
          setSession(null);
          setImpersonating(false);
          setOrigUser(null);
          setOrigRole(null);
          return null;
        }
        setClassificacao(data.classificacao ?? null);
        if (data.role) {
          const userRole = data.role as "desenvolvedor" | "master" | "parceiro";
          setRole(userRole);
          return userRole;
        }
      }
    } catch (err) {
      console.error("Erro ao buscar função do usuário:", err);
    }
    return "parceiro" as const;
  };

  useEffect(() => {
    // Check if there is an active impersonation on load
    const savedImpersonation = localStorage.getItem("advogapro_impersonation");

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        // Ao voltar para a aba, o Supabase renova o token e reenvia SIGNED_IN/TOKEN_REFRESHED
        // com um objeto "user" novo. Se trocarmos o user, os formulários abertos (que dependem
        // dele) são reiniciados e o que foi digitado se perde. Mesma pessoa = mantém tudo.
        if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session?.user && userIdCarregado.current === session.user.id) {
          return;
        }
        userIdCarregado.current = session?.user?.id ?? null;
        
        if (savedImpersonation && session?.user) {
          const imp = JSON.parse(savedImpersonation);
          setImpersonating(true);
          setOrigUser(session.user);
          setOrigRole(imp.originalRole);
          setUser(imp.targetUser);
          setRole(imp.targetRole);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchRole(session.user.id);
          } else {
            setRole("parceiro");
            setImpersonating(false);
            setOrigUser(null);
            setOrigRole(null);
          }
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      userIdCarregado.current = session?.user?.id ?? null;
      
      if (savedImpersonation && session?.user) {
        const imp = JSON.parse(savedImpersonation);
        setImpersonating(true);
        setOrigUser(session.user);
        setOrigRole(imp.originalRole);
        setUser(imp.targetUser);
        setRole(imp.targetRole);
      } else {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRole(session.user.id);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const impersonateUser = (targetUser: any, targetRole: "desenvolvedor" | "master" | "parceiro") => {
    if (!user) return;
    
    // Save original state to localStorage
    const impData = {
      originalRole: origRole || role,
      targetUser,
      targetRole
    };
    localStorage.setItem("advogapro_impersonation", JSON.stringify(impData));
    
    // Set state
    setOrigUser(origUser || user);
    setOrigRole(origRole || role);
    setImpersonating(true);
    setUser(targetUser);
    setRole(targetRole);

    toast({
      title: "Simulação Iniciada",
      description: `Agora você está acessando como ${targetUser.email}`,
    });
  };

  const stopImpersonating = () => {
    localStorage.removeItem("advogapro_impersonation");
    
    if (origUser && origRole) {
      setUser(origUser);
      setRole(origRole);
    }
    
    setImpersonating(false);
    setOrigUser(null);
    setOrigRole(null);
    
    window.location.reload(); // Reload to refresh all queries and caches with original role
  };

  const signOut = async () => {
    localStorage.removeItem("advogapro_impersonation");
    await supabase.auth.signOut();
  };

  // Simple toast trigger fallback helper
  const toast = ({ title, description }: { title: string; description: string }) => {
    console.log(`[Auth toast]: ${title} - ${description}`);
  };

  const value = {
    user,
    session,
    role,
    classificacao,
    loading,
    impersonating,
    originalUser: origUser,
    originalRole: origRole,
    signOut,
    impersonateUser,
    stopImpersonating
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};