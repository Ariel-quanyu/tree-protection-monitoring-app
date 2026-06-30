import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(() => localStorage.getItem("rememberLogin") === "true");
  const [isLoading, setIsLoading] = React.useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/projects";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      await signIn(username, password);
      if (rememberMe) {
        localStorage.setItem("rememberLogin", "true");
      } else {
        localStorage.removeItem("rememberLogin");
      }
      navigate(from, { replace: true });
    } catch {
      setError("Invalid email or password. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading…</div>;
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-[#F2F5F2] grid place-items-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="admin"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 pr-12 text-sm"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-sm"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#2D5A27] focus:ring-[#2D5A27]"
          />
          Remember me
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-[#2D5A27] text-white py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
