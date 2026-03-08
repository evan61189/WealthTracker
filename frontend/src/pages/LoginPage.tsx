import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await auth.login({ email, password });
      localStorage.setItem("token", res.access_token);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <div className="card" style={{ width: 400 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>WealthTracker</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Sign in to your account
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "var(--red)",
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" style={{ width: "100%" }}>
            Sign In
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
