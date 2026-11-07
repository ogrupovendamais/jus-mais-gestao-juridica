
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusUpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newStatus: 'Pago' | 'Pendente') => void;
  currentStatus: 'Pago' | 'Pendente' | 'Atrasado';
};

export function StatusUpdateDialog({ open, onOpenChange, onConfirm, currentStatus }: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<'Pago' | 'Pendente'>('Pendente');

  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus === 'Pago' ? 'Pago' : 'Pendente');
    }
  }, [open, currentStatus]);

  const handleConfirm = () => {
    onConfirm(selectedStatus);
  };

  const getStatusBadgeClass = (status: 'Pago' | 'Pendente') => {
    if (status === 'Pago') return "bg-green-500/10 text-green-500 border-green-500/20";
    if (status === 'Pendente') return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Atualizar Status do Lançamento</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Selecione o novo status. O status "Atrasado" é automático para lançamentos pendentes vencidos.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
           <Badge
            className={cn(
              "cursor-pointer text-sm sm:text-base px-4 py-2 justify-center",
              getStatusBadgeClass('Pago'),
              selectedStatus === 'Pago' && 'ring-2 ring-offset-2 ring-green-500'
            )}
            onClick={() => setSelectedStatus('Pago')}
          >
            Pago
          </Badge>
          <Badge
            className={cn(
              "cursor-pointer text-sm sm:text-base px-4 py-2 justify-center",
              getStatusBadgeClass('Pendente'),
              selectedStatus === 'Pendente' && 'ring-2 ring-offset-2 ring-yellow-500'
            )}
            onClick={() => setSelectedStatus('Pendente')}
          >
            Pendente
          </Badge>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto text-sm order-2 sm:order-1">Cancelar</Button>
          <Button onClick={handleConfirm} className="w-full sm:w-auto text-sm order-1 sm:order-2">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
