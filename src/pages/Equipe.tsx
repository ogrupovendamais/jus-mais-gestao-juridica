import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, Edit, Trash2, Mail, Phone, MapPin, Calendar, Briefcase, UserCheck, Search, Shield, ShieldAlert, Key, Clipboard, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  CLASSIFICACOES,
  CARGOS_EQUIPE,
  DEPARTAMENTOS_EQUIPE,
  Classificacao,
  classificacaoLabel,
  roleFromClassificacao,
  withLegacyOption
} from '@/lib/classificacoes';

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string;
  departamento: string;
  data_admissao: string | null;
  salario: number | null;
  status: 'Ativo' | 'Inativo' | 'Férias' | null;
  endereco: string | null;
  observacoes: string | null;
  foto_url: string | null;
  profile_id?: string | null; // ligado a uma conta de acesso: cargo/departamento seguem a classificação
  created_at: string;
  updated_at: string;
}


export default function Equipe() {
  const { user, role } = useAuth();
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMembro, setEditingMembro] = useState<MembroEquipe | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    departamento: '',
    data_admissao: '',
    salario: '',
    status: 'Ativo' as 'Ativo' | 'Inativo' | 'Férias',
    endereco: '',
    observacoes: ''
  });

  // State for Platform Access (Gestão de Usuários)
  const [activeTab, setActiveTab] = useState('membros');
  const [convites, setConvites] = useState<any[]>([]);
  const [plataformaUsers, setPlataformaUsers] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState({
    nome: '',
    email: '',
    classificacao: 'parceiro_juridico_oab' as Classificacao
  });
  const [oabEdits, setOabEdits] = useState<Record<string, string>>({});

  const loadConvites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('convites' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConvites(data || []);
    } catch (err) {
      console.error('Erro ao carregar convites:', err);
    }
  }, []);

  const loadPlataformaUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setPlataformaUsers(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'master' || role === 'desenvolvedor')) {
      loadConvites();
      loadPlataformaUsers();
    }
  }, [user, role, loadConvites, loadPlataformaUsers]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.nome || !inviteData.email) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e o e-mail para o convite.',
        variant: 'destructive'
      });
      return;
    }
    setInviteLoading(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('convites' as any)
        .insert({
          email: inviteData.email.trim(),
          full_name: inviteData.nome.trim(),
          role: roleFromClassificacao(inviteData.classificacao),
          classificacao: inviteData.classificacao,
          token: token,
          criado_por: user?.id,
          usado: false,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Convite criado com sucesso.'
      });

      setInviteData({ nome: '', email: '', classificacao: 'parceiro_juridico_oab' });
      setIsInviteModalOpen(false);
      loadConvites();
    } catch (err: any) {
      console.error('Erro ao criar convite:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível criar o convite.',
        variant: 'destructive'
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast({
      title: 'Copiado!',
      description: 'O link de convite foi copiado.'
    });
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('convites' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({
        title: 'Removido!',
        description: 'Convite cancelado com sucesso.'
      });
      loadConvites();
    } catch (err) {
      console.error('Erro ao remover convite:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o convite.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleUserStatus = async (profileId: string, currentAtivo: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: !currentAtivo } as any)
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `O acesso do usuário foi ${!currentAtivo ? 'ativado' : 'desativado'} com sucesso.`
      });
      loadPlataformaUsers();
    } catch (err: any) {
      console.error('Erro ao alternar status do usuário:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de acesso.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUserClassificacao = async (profileId: string, classificacao: Classificacao) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ classificacao, role: roleFromClassificacao(classificacao) } as any)
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `Classificação alterada para ${classificacaoLabel(classificacao)}.`
      });
      loadPlataformaUsers();
    } catch (err) {
      console.error('Erro ao atualizar classificação do usuário:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a classificação do usuário.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUserOab = async (profileId: string, possuiOab: boolean, numeroOab: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ possui_oab: possuiOab, numero_oab: possuiOab ? (numeroOab || null) : null } as any)
        .eq('id', profileId);

      if (error) throw error;
      loadPlataformaUsers();
    } catch (err) {
      console.error('Erro ao atualizar OAB do usuário:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados de OAB.',
        variant: 'destructive'
      });
    }
  };

  const loadMembros = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('equipe').select('*');
      const isAdmin = role === 'desenvolvedor' || role === 'master';
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMembros(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros da equipe.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (user) {
      loadMembros();
    }
  }, [user, loadMembros]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.cargo || !formData.departamento) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const membroData = {
        ...formData,
        salario: formData.salario ? parseFloat(formData.salario) : null,
        // campos vazios vão como "sem valor" (texto vazio é recusado pelo banco em colunas de data)
        data_admissao: formData.data_admissao || null,
        telefone: formData.telefone || null,
        user_id: user?.id
      };

      if (editingMembro) {
        const { error } = await supabase
          .from('equipe')
          .update(membroData)
          .eq('id', editingMembro.id);

        if (error) throw error;
        toast({
          title: 'Sucesso!',
          description: 'Membro atualizado com sucesso.'
        });
      } else {
        const { error } = await supabase
          .from('equipe')
          .insert(membroData);

        if (error) throw error;
        toast({
          title: 'Sucesso!',
          description: 'Membro adicionado com sucesso.'
        });
      }

      setIsDialogOpen(false);
      setEditingMembro(null);
      resetForm();
      loadMembros();
    } catch (error) {
      console.error('Erro ao salvar membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o membro.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (membro: MembroEquipe) => {
    setEditingMembro(membro);
    setFormData({
      nome: membro.nome,
      email: membro.email,
      telefone: membro.telefone,
      cargo: membro.cargo,
      departamento: membro.departamento,
      data_admissao: membro.data_admissao,
      salario: membro.salario?.toString() || '',
      status: membro.status,
      endereco: membro.endereco || '',
      observacoes: membro.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipe')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Membro removido com sucesso.'
      });
      loadMembros();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      departamento: '',
      data_admissao: '',
      salario: '',
      status: 'Ativo',
      endereco: '',
      observacoes: ''
    });
  };

  const filteredMembros = membros.filter(membro =>
    (membro.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (membro.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (membro.cargo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (membro.departamento || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800';
      case 'Inativo': return 'bg-red-100 text-red-800';
      case 'Férias': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando membros da equipe...</p>
          </div>
        </div>
      </div>
    );
  }

  const membrosContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar membros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{membros.length}</p>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-bold">{membros.filter(m => m.status === 'Ativo').length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-bold">{membros.filter(m => m.status === 'Férias').length}</p>
                <p className="text-sm text-muted-foreground">Em Férias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{new Set(membros.map(m => m.departamento)).size}</p>
                <p className="text-sm text-muted-foreground">Departamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Grid */}
      {filteredMembros.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum membro encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Comece adicionando o primeiro membro da sua equipe.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Membro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembros.map((membro) => (
            <Card key={membro.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={membro.foto_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(membro.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{membro.nome}</CardTitle>
                      <CardDescription>{membro.cargo}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(membro.status || '')}>
                    {membro.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="truncate">{membro.email}</span>
                  </div>

                  {membro.telefone && (
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{membro.telefone}</span>
                    </div>
                  )}

                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span>{membro.departamento}</span>
                  </div>

                  {membro.data_admissao && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Desde {format(new Date(membro.data_admissao), 'MMM yyyy', { locale: ptBR })}</span>
                    </div>
                  )}

                  {membro.endereco && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">{membro.endereco}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(membro)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover <strong>{membro.nome}</strong> da equipe?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(membro.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe jurídica</p>
        </div>

        {activeTab === 'membros' && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingMembro(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMembro ? 'Editar Membro' : 'Adicionar Novo Membro'}
                </DialogTitle>
                <DialogDescription>
                  {editingMembro ? 'Atualize as informações do membro da equipe.' : 'Adicione um novo membro à sua equipe.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo *</Label>
                    <Select value={formData.cargo} onValueChange={(value) => setFormData({ ...formData, cargo: value })} disabled={!!editingMembro?.profile_id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {withLegacyOption(CARGOS_EQUIPE, formData.cargo).map(cargo => (
                          <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departamento">Departamento *</Label>
                    {editingMembro?.profile_id && (
                      <p className="text-[11px] text-muted-foreground">Cargo e departamento seguem a classificação da conta (Acesso à Plataforma).</p>
                    )}
                    <Select value={formData.departamento} onValueChange={(value) => setFormData({ ...formData, departamento: value })} disabled={!!editingMembro?.profile_id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {withLegacyOption(DEPARTAMENTOS_EQUIPE, formData.departamento).map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_admissao">Data de Admissão</Label>
                    <Input
                      id="data_admissao"
                      type="date"
                      value={formData.data_admissao}
                      onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salario">Salário (R$)</Label>
                    <Input
                      id="salario"
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: 'Ativo' | 'Inativo' | 'Férias') => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Férias">Férias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingMembro ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(role === 'master' || role === 'desenvolvedor') ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted/30 p-1 border border-border/10 rounded-lg">
            <TabsTrigger value="membros" className="py-2">Membros da Equipe</TabsTrigger>
            <TabsTrigger value="acesso" className="py-2">Acesso à Plataforma</TabsTrigger>
          </TabsList>

          <TabsContent value="membros" className="space-y-6 focus-visible:outline-none">
            {membrosContent}
          </TabsContent>

          <TabsContent value="acesso" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Gestão de Contas de Usuários</h2>
                <p className="text-sm text-muted-foreground">Convide advogados parceiros e gerencie as permissões de acesso ao sistema.</p>
              </div>

              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enviar Novo Convite
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-background border border-border shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" /> Convidar para a Plataforma
                    </DialogTitle>
                    <DialogDescription>
                      O convidado receberá um link de registro com o cargo pré-configurado.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-nome">Nome Completo</Label>
                      <Input
                        id="invite-nome"
                        placeholder="Ex: Dra. Karolina Galiani"
                        value={inviteData.nome}
                        onChange={(e) => setInviteData({ ...inviteData, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">E-mail de Acesso</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="advogado@escritorio.com.br"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Classificação do Usuário</Label>
                      <Select
                        value={inviteData.classificacao}
                        onValueChange={(value: Classificacao) => setInviteData({ ...inviteData, classificacao: value })}
                      >
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICACOES.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label} — <span className="text-muted-foreground">{c.descricao}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={inviteLoading}>
                        {inviteLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        Gerar Convite
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card de Convites */}
              <Card className="border border-border/40 bg-background/50 backdrop-blur-md shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" /> Convites ({convites.filter(c => !c.usado).length} pendente{convites.filter(c => !c.usado).length === 1 ? "" : "s"})
                  </CardTitle>
                  <CardDescription>
                    Envie o link gerado abaixo para que o usuário possa definir a senha e se cadastrar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/10 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="p-4 pl-6">Nome / E-mail</th>
                          <th className="p-4">Cargo</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/5 text-sm">
                        {convites.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
                              Nenhum convite pendente.
                            </td>
                          </tr>
                        ) : (
                          convites.map((c) => {
                            const isExpired = new Date(c.expires_at) < new Date();

                            return (
                              <tr key={c.id} className="hover:bg-muted/5 transition-colors">
                                <td className="p-4 pl-6">
                                  <div className="font-semibold text-foreground">{c.full_name}</div>
                                  <div className="text-xs text-muted-foreground">{c.email}</div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline" className={c.role === 'master' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}>
                                    {classificacaoLabel(c.classificacao) || c.role}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  {c.usado ? (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Aceito</Badge>
                                  ) : isExpired ? (
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Expirado</Badge>
                                  ) : (
                                    <div>
                                      <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>
                                      <div className="text-[10px] text-muted-foreground mt-1">Expira: {format(new Date(c.expires_at), 'dd/MM HH:mm')}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    {!c.usado && !isExpired && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyInviteLink(c.token)}
                                        className="h-8 text-xs flex items-center gap-1.5"
                                      >
                                        {copiedToken === c.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                                        Link
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteInvite(c.id)}
                                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                    >
                                      Excluir
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Usuários Cadastrados */}
              <Card className="border border-border/40 bg-background/50 backdrop-blur-md shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" /> Contas Ativas ({plataformaUsers.length})
                  </CardTitle>
                  <CardDescription>
                    Gerencie o status de login e as permissões de acesso dos usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/10 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="p-4 pl-6">Nome / E-mail</th>
                          <th className="p-4">Classificação</th>
                          <th className="p-4">OAB</th>
                          <th className="p-4">Status de Login</th>
                          <th className="p-4 pr-6 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/5 text-sm">
                        {plataformaUsers.map((u) => {
                          const isSelf = u.id === user?.id;
                          const isDev = u.role === 'desenvolvedor';

                          return (
                            <tr key={u.id} className="hover:bg-muted/5 transition-colors">
                              <td className="p-4 pl-6">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                  {u.full_name}
                                  {isSelf && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">Você</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                              </td>
                              <td className="p-4">
                                {isSelf || isDev ? (
                                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[10px]">
                                    {isDev ? u.role : (classificacaoLabel(u.classificacao) || u.role)}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={u.classificacao || undefined}
                                    onValueChange={(value: Classificacao) => handleUpdateUserClassificacao(u.id, value)}
                                  >
                                    <SelectTrigger className="h-8 w-48 text-xs bg-background/50 border-border/30">
                                      <SelectValue placeholder="Definir classificação" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CLASSIFICACOES.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </td>
                              <td className="p-4">
                                {isDev ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={!!u.possui_oab}
                                      onCheckedChange={(checked) => handleUpdateUserOab(u.id, checked, u.numero_oab)}
                                      aria-label="Possui OAB"
                                    />
                                    {u.possui_oab && (
                                      <Input
                                        className="h-8 w-28 text-xs"
                                        placeholder="Nº OAB/UF"
                                        value={oabEdits[u.id] ?? u.numero_oab ?? ''}
                                        onChange={(e) => setOabEdits({ ...oabEdits, [u.id]: e.target.value })}
                                        onBlur={() => {
                                          if (oabEdits[u.id] !== undefined && oabEdits[u.id] !== (u.numero_oab ?? '')) {
                                            handleUpdateUserOab(u.id, true, oabEdits[u.id].trim());
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <Badge
                                  className={u.ativo === false ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                                >
                                  {u.ativo === false ? 'Desativado' : 'Ativo'}
                                </Badge>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                {!isSelf && !isDev && (
                                  <Button
                                    size="sm"
                                    variant={u.ativo === false ? 'outline' : 'destructive'}
                                    onClick={() => handleToggleUserStatus(u.id, u.ativo !== false)}
                                    className="h-8 text-xs px-3"
                                  >
                                    {u.ativo === false ? 'Ativar Acesso' : 'Desativar'}
                                  </Button>
                                )}
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
          </TabsContent>
        </Tabs>
      ) : (
        membrosContent
      )}
    </div>
  );
}