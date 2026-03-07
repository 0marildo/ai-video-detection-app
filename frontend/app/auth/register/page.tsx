"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const API = process.env.NEXT_PUBLIC_API_URL || "https://ai-video-detection-app-production.up.railway.app"
  async function handleRegister() {
    setError("")

    if (password !== confirm) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Erro ao criar conta")
        return
      }

      router.push("/auth/login")

    } catch {
      setError("Erro de conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">Criar conta</h1>
        <p className="text-gray-400 mb-8 text-sm">Comece a detectar vídeos gerados por IA</p>

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
              placeholder="mínimo 8 caracteres"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-gray-700 focus:border-blue-500 transition"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}