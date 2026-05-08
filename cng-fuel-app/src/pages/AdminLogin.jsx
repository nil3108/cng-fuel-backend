import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === "admin123") {
      sessionStorage.setItem("cng_admin", "true");
      navigate("/admin");
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />
      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <button onClick={() => navigate("/")} className="text-silver-dark hover:text-ink mb-8 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mb-4 shadow-glow">
            <svg className="w-7 h-7 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-ink text-center tracking-tight">Admin Login</h2>
          <p className="text-silver-dark text-sm mt-1 font-light">Enter admin password</p>
        </div>

        <div className="floating-card p-6 mb-4 space-y-4">
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Password" className="input-field" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          {error && <p className="text-red-400 text-sm font-light">{error}</p>}
          <button onClick={handleLogin} disabled={!password} className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed">Login</button>
        </div>
      </div>
    </div>
  );
}