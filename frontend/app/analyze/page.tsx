"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AnalyzePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{
    ai_score: number
    result: string
    source_value: string
  } | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError("")
    setResult(null)

    const token = localStorage.getItem("access_token")
    if (!token) { router.push("/auth/login"); return }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("ai-video-detection-app-production.up.railway.app", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Erro na análise"); return }
      setResult(data)
    } catch {
      setError("Erro de conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const scorePercent = result ? Math.round(result.ai_score * 100) : 0
  const isAI = result?.result === "ai_generated"

  const getVerdict = () => {
    if (scorePercent >= 80) return { label: "GERADO POR IA", sub: "Alta confiança de geração artificial", color: "#FF3B3B" }
    if (scorePercent >= 50) return { label: "PROVÁVEL IA", sub: "Sinais significativos detectados", color: "#FF8C00" }
    if (scorePercent >= 25) return { label: "INCONCLUSIVO", sub: "Sinais fracos, origem incerta", color: "#FFD700" }
    return { label: "AUTÊNTICO", sub: "Nenhum sinal de IA detectado", color: "#00E676" }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080A0F;
          color: #E8EAF0;
          font-family: 'Syne', sans-serif;
        }

        .page { min-height: 100vh; display: flex; flex-direction: column; }

        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute; bottom: 0; left: 40px; right: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,180,255,0.4), transparent);
        }
        .logo {
          font-family: 'Space Mono', monospace;
          font-size: 13px; font-weight: 700;
          color: #00B4FF; letter-spacing: 2px; text-transform: uppercase;
          text-decoration: none;
        }
        .back-btn {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.35);
          text-decoration: none; letter-spacing: 1px;
          transition: color 0.2s;
        }
        .back-btn:hover { color: rgba(255,255,255,0.7); }

        .main {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 20px;
          position: relative;
          overflow: hidden;
        }

        /* Background grid */
        .main::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .container {
          width: 100%; max-width: 640px;
          position: relative; z-index: 1;
        }

        .headline {
          margin-bottom: 48px;
        }
        .headline h1 {
          font-size: 42px; font-weight: 800; line-height: 1.1;
          letter-spacing: -1px;
        }
        .headline h1 span {
          color: #00B4FF;
        }
        .headline p {
          margin-top: 12px;
          font-family: 'Space Mono', monospace;
          font-size: 12px; color: rgba(255,255,255,0.35);
          letter-spacing: 1px;
        }

        /* Drop zone */
        .dropzone {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 48px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255,255,255,0.02);
          position: relative;
          overflow: hidden;
        }
        .dropzone::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 1px;
          background: linear-gradient(90deg, transparent, #00B4FF, transparent);
          transition: left 0.6s;
        }
        .dropzone:hover::before, .dropzone.drag-over::before {
          left: 120%;
        }
        .dropzone:hover, .dropzone.drag-over {
          border-color: rgba(0,180,255,0.4);
          background: rgba(0,180,255,0.04);
        }
        .dropzone.has-file {
          border-color: rgba(0,180,255,0.3);
          background: rgba(0,180,255,0.06);
        }

        .dropzone-icon {
          width: 48px; height: 48px;
          margin: 0 auto 20px;
          opacity: 0.3;
        }
        .dropzone-title {
          font-size: 15px; font-weight: 600;
          margin-bottom: 8px;
        }
        .dropzone-sub {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.3);
          letter-spacing: 0.5px;
        }
        .file-info {
          font-family: 'Space Mono', monospace;
        }
        .file-name {
          font-size: 14px; color: #00B4FF;
          margin-bottom: 6px; font-weight: 700;
        }
        .file-size {
          font-size: 11px; color: rgba(255,255,255,0.3);
          letter-spacing: 1px;
        }

        /* Error */
        .error-box {
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(255,59,59,0.08);
          border: 1px solid rgba(255,59,59,0.2);
          border-radius: 4px;
          font-family: 'Space Mono', monospace;
          font-size: 12px; color: #FF6B6B;
          letter-spacing: 0.5px;
        }

        /* Analyze button */
        .analyze-btn {
          width: 100%; margin-top: 16px;
          padding: 16px;
          background: #00B4FF;
          border: none; border-radius: 4px;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          color: #080A0F; letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          position: relative; overflow: hidden;
        }
        .analyze-btn:hover:not(:disabled) {
          background: #33C3FF;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,180,255,0.3);
        }
        .analyze-btn:disabled {
          opacity: 0.3; cursor: not-allowed; transform: none;
        }

        /* Loading state */
        .loading-state {
          margin-top: 24px;
          padding: 24px;
          border: 1px solid rgba(0,180,255,0.15);
          border-radius: 4px;
          background: rgba(0,180,255,0.03);
        }
        .loading-label {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: #00B4FF;
          letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .loading-dot {
          width: 6px; height: 6px;
          background: #00B4FF; border-radius: 50%;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
        .loading-bar-track {
          height: 2px; background: rgba(255,255,255,0.06);
          border-radius: 2px; overflow: hidden;
        }
        .loading-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00B4FF, #0066FF);
          border-radius: 2px;
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes scan {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .loading-steps {
          margin-top: 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .loading-step {
          font-family: 'Space Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.2);
          letter-spacing: 1px;
          animation: stepReveal 3s infinite;
        }
        .loading-step:nth-child(1) { animation-delay: 0s; color: rgba(0,180,255,0.6); }
        .loading-step:nth-child(2) { animation-delay: 1s; }
        .loading-step:nth-child(3) { animation-delay: 2s; }
        @keyframes stepReveal {
          0%, 100% { opacity: 0.2; }
          33% { opacity: 1; color: rgba(0,180,255,0.8); }
        }

        /* Result panel */
        .result-panel {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          animation: resultIn 0.4s ease-out;
        }
        @keyframes resultIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .result-filename {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.3);
          letter-spacing: 1px;
          max-width: 300px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .result-badge {
          font-family: 'Space Mono', monospace;
          font-size: 10px; letter-spacing: 1.5px;
          padding: 4px 10px;
          border-radius: 2px;
          font-weight: 700;
        }

        .result-body {
          padding: 40px 24px;
          display: flex; align-items: center; gap: 40px;
        }

        .score-circle {
          flex-shrink: 0;
          width: 140px; height: 140px;
          border-radius: 50%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          position: relative;
        }
        .score-circle::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.06);
        }
        .score-number {
          font-family: 'Space Mono', monospace;
          font-size: 38px; font-weight: 700;
          line-height: 1;
        }
        .score-unit {
          font-family: 'Space Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.3);
          letter-spacing: 2px; margin-top: 4px;
        }

        .verdict-info { flex: 1; }
        .verdict-label {
          font-size: 22px; font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .verdict-sub {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.35);
          letter-spacing: 0.5px; line-height: 1.6;
          margin-bottom: 20px;
        }

        .meter-track {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .meter-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease-out;
        }
        .meter-labels {
          display: flex; justify-content: space-between;
          font-family: 'Space Mono', monospace;
          font-size: 9px; color: rgba(255,255,255,0.2);
          letter-spacing: 1px;
        }

        .result-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .result-meta {
          font-family: 'Space Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.2);
          letter-spacing: 1px;
        }
        .retry-btn {
          font-family: 'Space Mono', monospace;
          font-size: 11px; color: #00B4FF;
          background: none; border: none; cursor: pointer;
          letter-spacing: 1px;
          transition: opacity 0.2s;
        }
        .retry-btn:hover { opacity: 0.6; }

        .formats-hint {
          margin-top: 40px;
          display: flex; align-items: center; gap: 12px;
          justify-content: center;
        }
        .formats-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.15);
          letter-spacing: 1px;
        }
        .format-tag {
          font-family: 'Space Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.2);
          padding: 3px 8px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="page">
        <header className="header">
          <Link href="/" className="logo">AI Detector</Link>
          <Link href="/dashboard" className="back-btn">← Dashboard</Link>
        </header>

        <main className="main">
          <div className="container">
            {!result && (
              <>
                <div className="headline">
                  <h1>Analisar <span>vídeo</span></h1>
                  <p>// FORENSIC AI CONTENT SCANNER v1.0</p>
                </div>

                <div
                  className={`dropzone ${dragging ? "drag-over" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <input
                    id="fileInput" type="file"
                    accept="video/mp4,video/quicktime,video/avi,video/webm,video/x-matroska"
                    style={{ display: "none" }}
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />

                  {file ? (
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB · PRONTO PARA ANÁLISE</div>
                    </div>
                  ) : (
                    <>
                      <svg className="dropzone-icon" viewBox="0 0 48 48" fill="none">
                        <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M20 19L29 24L20 29V19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M24 4V12M24 4L20 8M24 4L28 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <div className="dropzone-title">Arraste o vídeo aqui</div>
                      <div className="dropzone-sub">ou clique para selecionar · máx 100MB</div>
                    </>
                  )}
                </div>

                {error && <div className="error-box">⚠ {error}</div>}

                {loading && (
                  <div className="loading-state">
                    <div className="loading-label">
                      <div className="loading-dot"></div>
                      Analisando
                    </div>
                    <div className="loading-bar-track">
                      <div className="loading-bar-fill"></div>
                    </div>
                    <div className="loading-steps">
                      <div className="loading-step">▸ ENVIANDO PARA PROCESSAMENTO...</div>
                      <div className="loading-step">▸ EXTRAINDO FRAMES DO VÍDEO...</div>
                      <div className="loading-step">▸ EXECUTANDO MODELO DE DETECÇÃO...</div>
                    </div>
                  </div>
                )}

                <button
                  className="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={!file || loading}
                >
                  {loading ? "Processando..." : "Iniciar análise forense"}
                </button>

                <div className="formats-hint">
                  <span className="formats-label">Formatos:</span>
                  {["MP4", "MOV", "AVI", "MKV", "WEBM"].map(f => (
                    <span key={f} className="format-tag">{f}</span>
                  ))}
                </div>
              </>
            )}

            {result && (() => {
              const verdict = getVerdict()
              return (
                <div className="result-panel">
                  <div className="result-header">
                    <span className="result-filename">{result.source_value}</span>
                    <span className="result-badge" style={{
                      background: `${verdict.color}18`,
                      color: verdict.color,
                      border: `1px solid ${verdict.color}40`
                    }}>
                      ANÁLISE COMPLETA
                    </span>
                  </div>

                  <div className="result-body">
                    <div className="score-circle" style={{
                      background: `radial-gradient(circle, ${verdict.color}12 0%, transparent 70%)`,
                      boxShadow: `0 0 40px ${verdict.color}20`
                    }}>
                      <div className="score-number" style={{ color: verdict.color }}>
                        {scorePercent}%
                      </div>
                      <div className="score-unit">IA SCORE</div>
                    </div>

                    <div className="verdict-info">
                      <div className="verdict-label" style={{ color: verdict.color }}>
                        {verdict.label}
                      </div>
                      <div className="verdict-sub">{verdict.sub}</div>

                      <div className="meter-track">
                        <div className="meter-fill" style={{
                          width: `${scorePercent}%`,
                          background: `linear-gradient(90deg, ${verdict.color}80, ${verdict.color})`
                        }} />
                      </div>
                      <div className="meter-labels">
                        <span>HUMANO</span>
                        <span>IA GERADO</span>
                      </div>
                    </div>
                  </div>

                  <div className="result-footer">
                    <span className="result-meta">
                      CONFIANÇA: {scorePercent >= 80 || scorePercent <= 20 ? "ALTA" : scorePercent >= 60 || scorePercent <= 40 ? "MÉDIA" : "BAIXA"}
                      {" · "}
                      POWERED BY SIGHTENGINE
                    </span>
                    <button className="retry-btn" onClick={() => { setResult(null); setFile(null) }}>
                      NOVA ANÁLISE →
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </main>
      </div>
    </>
  )
}