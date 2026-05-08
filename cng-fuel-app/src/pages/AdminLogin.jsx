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
      setError("Invalid admin password");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <img src="/logo.jpg" alt="Logo" className="w-16 h-16 object-contain mb-6" />
      <h1 className="text-2xl font-bold text-white mb-1">Admin Panel</h1>
      <p className="text-gray-400 text-sm mb-8">Enter admin password to access</p>

      <div className="w-full max-w-xs">
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Enter admin password"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg outline-none focus:border-accent transition-colors placeholder-gray-500"
        />
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={!password}
          className="w-full bg-accent disabled:bg-gray-600 text-white font-bold py-3.5 rounded-xl text-lg mt-4 transition-all disabled:opacity-50"
        >
          Login
        </button>
        <button onClick={() => navigate("/")} className="w-full text-gray-500 text-sm mt-4 hover:text-gray-300 transition-colors">
          Back to main app
        </button>
      </div>
    </div>
  );
}
