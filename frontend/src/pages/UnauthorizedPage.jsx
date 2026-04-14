import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="glass-panel max-w-md p-5 text-center sm:p-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-800 sm:text-3xl">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">Your role does not have permission to view this page.</p>
        <Link
          to="/"
          className="mt-5 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Return to login
        </Link>
      </div>
    </div>
  );
}
