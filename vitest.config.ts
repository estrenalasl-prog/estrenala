import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  // `.tsx` también: hay tests que pintan componentes para comprobar lo que sale
  // de verdad. El JSX lo transforma oxc, que ya usa el runtime automático — no
  // hace falta configurarle nada (y si se le pone `esbuild.jsx`, avisa de que lo
  // ignora y ensucia la salida de cada ejecución).
  test: { environment: "node", include: ["src/tests/**/*.test.{ts,tsx}"] },
});
