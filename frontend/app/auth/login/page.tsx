"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Erro ao fazer login")
        return
      }

      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      router.push("/dashboard")

    } catch {
      setError("Erro de conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">Entrar</h1>
        <p className="text-gray-400 mb-8 text-sm">Acesse sua conta para continuar</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-blue-500 transition"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Não tem conta?{" "}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}