"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Stats {
  total_analyses: number
  ai_generated: number
  human: number
}

interface Analysis {
  id: string
  source_type: string
  source_value: string
  ai_score: number
  result: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const API = process.env.NEXT_PUBLIC_API_URL || "https://ai-video-detection-app-production.up.railway.app"
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/auth/login")
      return
    }
    fetchData(token)
  }, [])

  async function fetchData(token: string) {
    try {
      const [statsRes, analysesRes] = await Promise.all([
        fetch(`${API}/api/v1/auth/login`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/v1/auth/login`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (statsRes.status === 401) {
        router.push("/auth/login")
        return
      }

      setStats(await statsRes.json())
      const analysesData = await analysesRes.json()
      setAnalyses(Array.isArray(analysesData) ? analysesData : analysesData.analyses ?? [])
    } catch (err) {
  console.error("Erro ao carregar dados:", err)
} finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    const refresh_token = localStorage.getItem("refresh_token")
    if (refresh_token) {
      fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token })
      })
    }
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">AI Video Detector</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Sair
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-white">{stats?.total_analyses ?? 0}</p>
            <p className="text-sm text-gray-400 mt-1">Total de análises</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-red-400">{stats?.ai_generated ?? 0}</p>
            <p className="text-sm text-gray-400 mt-1">Gerados por IA</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{stats?.human ?? 0}</p>
            <p className="text-sm text-gray-400 mt-1">Humanos</p>
          </div>
        </div>

        {/* Botão de upload */}
        <Link
          href="/analyze"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-medium rounded-2xl py-4 transition"
        >
          + Analisar novo vídeo
        </Link>

        {/* Histórico */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Análises recentes</h2>
          {analyses.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-8 text-center text-gray-500">
              Nenhuma análise ainda. Envie seu primeiro vídeo!
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map(a => (
                <div key={a.id} className="bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-xs">
                      {a.source_value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      a.result === "ai_generated"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-green-500/15 text-green-400"
                    }`}>
                      {a.result === "ai_generated" ? "IA" : "Humano"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {(a.ai_score * 100).toFixed(1)}% IA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}