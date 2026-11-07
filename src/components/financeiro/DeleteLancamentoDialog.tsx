
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteLancamentoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteLancamentoDialog({ open, onOpenChange, onConfirm }: DeleteLancamentoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mx-4 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg sm:text-xl">Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            Essa ação não pode ser desfeita. Isso irá excluir permanentemente o lançamento financeiro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <AlertDialogCancel className="w-full sm:w-auto text-sm order-2 sm:order-1">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="w-full sm:w-auto text-sm order-1 sm:order-2">Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
