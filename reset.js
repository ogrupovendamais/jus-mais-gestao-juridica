import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erp.cadoreadvocacia.com.br/supabase';
// Esta é a chave secreta de administrador (Service Role Key) que peguei do seu arquivo .env!
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzk1MDUyMDAsImV4cCI6MTkzNzI3MTYwMH0.TpKLAYhXGaR3l3cNJPq97bS5-ugCZ3GN5cNveHluaMk';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  console.log("Buscando usuário...");
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return;
  }
  
  const user = data.users.find(u => u.email === 'contato@grupovendamais.com');
  
  if (user) {
    console.log("Usuário encontrado! Alterando a senha...");
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { 
      password: 'password123' 
    });
    
    if (updateError) {
      console.error("Erro ao atualizar a senha:", updateError);
    } else {
      console.log("=========================================");
      console.log("✅ SENHA ALTERADA COM SUCESSO!");
      console.log("✅ Novo acesso:");
      console.log("✅ Email: contato@grupovendamais.com");
      console.log("✅ Senha: password123");
      console.log("=========================================");
    }
  } else {
    console.log("❌ Usuário contato@grupovendamais.com não encontrado no banco de dados.");
  }
}

resetPassword();
