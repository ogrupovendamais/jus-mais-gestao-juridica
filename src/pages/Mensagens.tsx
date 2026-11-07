import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { STATUS_PROCESSO } from "@/lib/statusProcesso";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";

type Template = {
  id: string;
  title: string;
  content: string;
  is_default?: boolean;
  user_id?: string | null;
};

type SupaCliente = {
  id: string;
  nome: string;
  telefone: string | null;
};

type SupaProcesso = {
  id: string;
  numero: string;
  assunto: string;
  status: string;
  cliente_id: string;
};

const Mensagens: React.FC = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<SupaCliente[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [processos, setProcessos] = useState<SupaProcesso[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<SupaCliente | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [variableValues, setVariableValues] = useState<{
    [key: string]: string;
  }>({});

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId) || null;
    setSelectedCliente(cliente);
    // Limpar processos quando trocar de cliente
    setProcessos([]);
    // Limpar valores de variáveis relacionadas a processo
    setVariableValues(prev => {
      const newValues = { ...prev };
      delete newValues.numero_processo;
      delete newValues.status_processo;
      return newValues;
    });
    // Buscar processos do cliente selecionado
    if (cliente) {
      fetchProcessosByCliente(cliente.id);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId) || null;
    setSelectedTemplate(template);
    setVariableValues({});
  };

  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .order("nome", { ascending: true });
      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de clientes.",
          variant: "destructive",
        });
        return;
      }
      setClientes((data || []) as SupaCliente[]);
    };
    fetchClientes();
  }, [toast]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, title, content")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Erro ao carregar modelos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os modelos.",
          variant: "destructive",
        });
        return;
      }
      setTemplates((data || []) as Template[]);
    };
    fetchTemplates();
  }, [toast]);

  const fetchProcessosByCliente = async (clienteId: string) => {
    const { data, error } = await supabase
      .from("processos")
      .select("id, numero, assunto, status, cliente_id")
      .eq("cliente_id", clienteId)
      .order("numero", { ascending: true });
    
    if (error) {
      console.error("Erro ao carregar processos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os processos do cliente.",
        variant: "destructive",
      });
      return;
    }
    setProcessos((data || []) as SupaProcesso[]);
  };

  const variables = useMemo(() => {
    if (!selectedTemplate) return [];
    const matches = selectedTemplate.content.match(/\[(.*?)\]/g) || [];
    const uniqueMatches = [...new Set(matches)];
    return uniqueMatches.map((v) => v.slice(1, -1));
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedCliente && variables.includes("nome_cliente")) {
      setVariableValues((prev) => ({
        ...prev,
        nome_cliente: selectedCliente.nome,
      }));
    }
  }, [selectedCliente, variables]);

  const generatedMessage = useMemo(() => {
    if (!selectedTemplate) return "";
    let message = selectedTemplate.content;
    variables.forEach((key) => {
      const value = variableValues[key];
      message = message.replace(
        new RegExp(`\\[${key}\\]`, "g"),
        value || `[${key}]`
      );
    });
    return message;
  }, [selectedTemplate, variableValues, variables]);

  const handleVariableChange = (varName: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [varName]: value }));
  };

  const handleSendWhatsapp = () => {
    if (!selectedCliente) {
      toast({
        title: "Erro",
        description: "Selecione um cliente.",
        variant: "destructive",
      });
      return;
    }
    if (
      !generatedMessage ||
      variables.some((v) => generatedMessage.includes(`[${v}]`))
    ) {
      toast({
        title: "Erro",
        description: "Preencha todas as variáveis da mensagem.",
        variant: "destructive",
      });
      return;
    }

    const phone = (selectedCliente.telefone || "").replace(/\D/g, "");
    if (!phone) {
      toast({
        title: "Erro",
        description: "Cliente sem telefone válido.",
        variant: "destructive",
      });
      return;
    }
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(
      generatedMessage
    )}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Mensagens</h1>
        <p className="text-muted-foreground">
          Envie mensagens personalizadas para seus clientes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select onValueChange={handleSelectCliente}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={handleSelectTemplate}
            disabled={!selectedCliente}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um modelo de mensagem" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Variáveis</CardTitle>
              <CardDescription>
                Preencha os campos para personalizar a mensagem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.length > 0 ? (
                variables.map((varName) => {
                  // Campo especial para número do processo
                  if (varName === "numero_processo") {
                    return (
                      <div key={varName}>
                        <Label htmlFor={varName} className="capitalize">
                          Número do Processo
                        </Label>
                        <Select
                          value={variableValues[varName] || ""}
                          onValueChange={(value) => handleVariableChange(varName, value)}
                          disabled={!selectedCliente || processos.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um processo" />
                          </SelectTrigger>
                          <SelectContent>
                            {processos.map((processo) => (
                              <SelectItem key={processo.id} value={processo.numero}>
                                {processo.numero} - {processo.assunto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  
                  // Campo especial para status do processo
                  if (varName === "status_processo") {
                    return (
                      <div key={varName}>
                        <Label htmlFor={varName} className="capitalize">
                          Status do Processo
                        </Label>
                        <Select
                          value={variableValues[varName] || ""}
                          onValueChange={(value) => handleVariableChange(varName, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_PROCESSO.map((st) => (<SelectItem key={st} value={st}>{st}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  
                  // Campos especiais para datas
                  if (varName === "data_audiencia" || varName === "data_vencimento") {
                    const labelText = varName === "data_audiencia" ? "Data da Audiência" : "Data de Vencimento";
                    return (
                      <div key={varName}>
                        <Label htmlFor={varName} className="capitalize">
                          {labelText}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !variableValues[varName] && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {variableValues[varName] ? (
                                variableValues[varName]
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={variableValues[varName] ? new Date(variableValues[varName]) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  handleVariableChange(varName, format(date, "dd/MM/yyyy", { locale: ptBR }));
                                }
                              }}
                              locale={ptBR}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }
                  
                  // Campos normais de input
                  return (
                    <div key={varName}>
                      <Label htmlFor={varName} className="capitalize">
                        {varName.replace(/_/g, " ")}
                      </Label>
                      <Input
                        id={varName}
                        value={variableValues[varName] || ""}
                        onChange={(e) =>
                          handleVariableChange(varName, e.target.value)
                        }
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este modelo não possui variáveis.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>
                Esta é a mensagem que será enviada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={generatedMessage}
                className="h-48 resize-none"
              />
              <Button onClick={handleSendWhatsapp} className="w-full mt-4">
                <Send className="mr-2 h-4 w-4" /> Enviar via WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Mensagens;
