import { Suspense } from "react";
import { AppRouter } from "./router/index.jsx";

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="glass-panel px-6 py-4 text-sm font-semibold text-slate-600">Loading workspace...</div>
        </div>
      }
    >
      <AppRouter />
    </Suspense>
  );
}
