import { useNavigate } from "react-router-dom";
import { AtendimentosView } from "@/components/atendimentos/AtendimentosView";

export default function Atendimentos() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 bg-[#F1F4F9]/40 dark:bg-[#010E38] min-h-[calc(100vh-60px)]">
      <AtendimentosView onVoltar={() => navigate(-1)} />
    </div>
  );
}
