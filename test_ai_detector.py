import pytest
from playwright.sync_api import Page, expect
import os

BASE_URL = "http://localhost:3000"
EMAIL = os.getenv("TEST_EMAIL", "test@example.com")
PASSWORD = os.getenv("TEST_PASSWORD", "testpassword123")
VIDEO_PATH = os.getenv("TEST_VIDEO_PATH", r"C:\Users\omari\Downloads\videoplayback (4).mp4")


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def login(page: Page):
    """Faz login e redireciona para o dashboard."""
    page.goto(f"{BASE_URL}/auth/login")
    page.get_by_placeholder("seu@email.com").fill(EMAIL)
    page.get_by_placeholder("••••••••").fill(PASSWORD)
    page.get_by_role("button", name="Entrar").click()
    expect(page).to_have_url(f"{BASE_URL}/dashboard", timeout=8000)


# ─────────────────────────────────────────
# TESTES DE AUTENTICAÇÃO
# ─────────────────────────────────────────

def test_login_sucesso(page: Page):
    """Login com credenciais válidas redireciona para dashboard."""
    login(page)
    expect(page.get_by_text("Total de análises")).to_be_visible()


def test_login_senha_errada(page: Page):
    """Login com senha errada não redireciona para dashboard."""
    page.goto(f"{BASE_URL}/auth/login")
    page.get_by_placeholder("seu@email.com").fill(EMAIL)
    page.get_by_placeholder("••••••••").fill("senha_errada")
    page.get_by_role("button", name="Entrar").click()
    expect(page).not_to_have_url(f"{BASE_URL}/dashboard", timeout=4000)


def test_login_campos_vazios(page: Page):
    """Login com campos vazios não sai da página."""
    page.goto(f"{BASE_URL}/auth/login")
    page.get_by_role("button", name="Entrar").click()
    expect(page).to_have_url(f"{BASE_URL}/auth/login")


def test_redirect_sem_login(page: Page):
    """Acesso ao dashboard sem login redireciona para login."""
    page.goto(f"{BASE_URL}/dashboard")
    expect(page).to_have_url(f"{BASE_URL}/auth/login", timeout=5000)


def test_logout(page: Page):
    """Logout redireciona para login."""
    login(page)
    page.get_by_role("button", name="Sair").click()
    expect(page).to_have_url(f"{BASE_URL}/auth/login", timeout=5000)


# ─────────────────────────────────────────
# TESTES DO DASHBOARD
# ─────────────────────────────────────────

def test_dashboard_carrega_stats(page: Page):
    """Dashboard exibe os 3 cards de estatísticas."""
    login(page)
    expect(page.get_by_text("Total de análises")).to_be_visible()
    expect(page.get_by_text("Gerados por IA")).to_be_visible()
    expect(page.get_by_text("Humanos")).to_be_visible()


def test_dashboard_botao_analisar(page: Page):
    """Botão 'Analisar novo vídeo' navega para /analyze."""
    login(page)
    page.get_by_role("link", name="+ Analisar novo vídeo").click()
    expect(page).to_have_url(f"{BASE_URL}/analyze", timeout=5000)


def test_dashboard_historico_visivel(page: Page):
    """Dashboard mostra seção de análises recentes."""
    login(page)
    expect(page.get_by_text("Análises recentes")).to_be_visible()


# ─────────────────────────────────────────
# TESTES DE UPLOAD/ANÁLISE
# ─────────────────────────────────────────

def test_pagina_analyze_carrega(page: Page):
    """Página /analyze carrega com campo de upload."""
    login(page)
    page.goto(f"{BASE_URL}/analyze")
    expect(page.locator("input[type='file']")).to_be_attached()


@pytest.mark.skipif(not os.path.exists(VIDEO_PATH), reason="Vídeo de teste não encontrado")
def test_upload_video_completo(page: Page):
    """Faz upload de um vídeo e aguarda resultado."""
    login(page)
    page.goto(f"{BASE_URL}/analyze")
    page.locator("input[type='file']").set_input_files(VIDEO_PATH)
    page.get_by_role("button", name="Analisar").click()
    result = page.locator("text=IA").or_(page.locator("text=Humano"))
    expect(result).to_be_visible(timeout=60000)


@pytest.mark.skipif(not os.path.exists(VIDEO_PATH), reason="Vídeo de teste não encontrado")
def test_resultado_aparece_no_dashboard(page: Page):
    """Após análise, resultado aparece no histórico do dashboard."""
    login(page)
    page.goto(f"{BASE_URL}/analyze")
    page.locator("input[type='file']").set_input_files(VIDEO_PATH)
    page.get_by_role("button", name="Analisar").click()
    result = page.locator("text=IA").or_(page.locator("text=Humano"))
    expect(result).to_be_visible(timeout=60000)
    page.goto(f"{BASE_URL}/dashboard")
    expect(page.locator(".space-y-3 > div").first).to_be_visible(timeout=5000)