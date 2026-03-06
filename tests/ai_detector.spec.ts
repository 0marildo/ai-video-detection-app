import { test, expect } from '@playwright/test';
import path from 'path';

const EMAIL = 'omar@gmail.com';
const PASSWORD = '12345678';
const VIDEO_PATH = String.raw`C:\Users\omari\Downloads\videoplayback (4).mp4`;

// ─────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────

async function login(page: any) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('seu@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 8000 });
}

// ─────────────────────────────────────────
// AUTENTICAÇÃO
// ─────────────────────────────────────────

test('login com sucesso', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Total de análises')).toBeVisible();
});

test('login com senha errada', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByPlaceholder('seu@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill('senha_errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL('/dashboard', { timeout: 4000 });
});

test('login com campos vazios não redireciona', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/auth/login');
});

test('acesso ao dashboard sem login redireciona para login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/auth/login', { timeout: 5000 });
});

test('logout redireciona para login', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/auth/login', { timeout: 5000 });
});

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────

test('dashboard exibe os 3 cards de stats', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Total de análises')).toBeVisible();
  await expect(page.getByText('Gerados por IA')).toBeVisible();
  await expect(page.getByText('Humanos')).toBeVisible();
});

test('botão analisar navega para /analyze', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: '+ Analisar novo vídeo' }).click();
  await expect(page).toHaveURL('/analyze', { timeout: 5000 });
});

test('dashboard mostra seção de análises recentes', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Análises recentes')).toBeVisible();
});

// ─────────────────────────────────────────
// UPLOAD / ANÁLISE
// ─────────────────────────────────────────

test('página /analyze carrega com campo de upload', async ({ page }) => {
  await login(page);
  await page.goto('/analyze');
  await expect(page.locator("input[type='file']")).toBeAttached();
});

test('upload de vídeo e resultado aparece', async ({ page }) => {
  await login(page);
  await page.goto('/analyze');
  await page.locator("input[type='file']").setInputFiles(VIDEO_PATH);
  await page.getByRole('button', { name: 'Analisar' }).click();
  const result = page.locator('text=IA').or(page.locator('text=Humano'));
  await expect(result).toBeVisible({ timeout: 60000 });
});

test('resultado aparece no histórico do dashboard', async ({ page }) => {
  await login(page);
  await page.goto('/analyze');
  await page.locator("input[type='file']").setInputFiles(VIDEO_PATH);
  await page.getByRole('button', { name: 'Analisar' }).click();
  const result = page.locator('text=IA').or(page.locator('text=Humano'));
  await expect(result).toBeVisible({ timeout: 60000 });
  await page.goto('/dashboard');
  await expect(page.locator('.space-y-3 > div').first()).toBeVisible({ timeout: 5000 });
});