/**
 * Сборка приложения в один HTML-файл: скрипт и стили вшиваются внутрь.
 * Нужен, чтобы отдать работающий конструктор одним файлом — открывается
 * с диска двойным кликом, без сервера и установки.
 *
 * Запуск: npm run build:single (после vite build).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assets = readdirSync(join(dist, 'assets'))
const jsFile = assets.find((f) => f.endsWith('.js'))
const cssFile = assets.find((f) => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('Сначала выполните vite build')

const js = readFileSync(join(dist, 'assets', jsFile), 'utf8')
const css = readFileSync(join(dist, 'assets', cssFile), 'utf8')

let html = readFileSync(join(dist, 'index.html'), 'utf8')
html = html
  .replace(/<link rel="modulepreload"[^>]*>/g, '')
  .replace(new RegExp(`<script[^>]*src="[^"]*${jsFile}"[^>]*></script>`), '')
  .replace(new RegExp(`<link[^>]*href="[^"]*${cssFile}"[^>]*>`), `<style>\n${css}\n</style>`)
  // последовательность </script> внутри кода закрыла бы тег раньше времени
  .replace('</body>', `<script type="module">\n${js.replaceAll('</script', '<\\/script')}\n</script>\n</body>`)

const out = join(dist, 'oknastudio.html')
writeFileSync(out, html)
console.log(`${out} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`)
