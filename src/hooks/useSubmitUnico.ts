import { useCallback, useRef } from "react";

// Evita gravação duplicada por clique duplo: enquanto um salvamento está em andamento,
// novas chamadas são ignoradas.
export function useSubmitUnico<A extends unknown[]>(fn: (...args: A) => unknown) {
  const ocupado = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback(async (...args: A) => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      await fnRef.current(...args);
    } finally {
      ocupado.current = false;
    }
  }, []);
}
