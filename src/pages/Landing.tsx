import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    window.location.replace("/landing.html");
  }, []);

  return (
    <div className="min-h-screen bg-[#010E38] flex items-center justify-center text-[#F1F4F9]">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#EBB52C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-sm tracking-wider text-[#EBB52C]">
          Carregando Jus+ Gestão Jurídica...
        </p>
      </div>
    </div>
  );
}
