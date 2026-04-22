import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '..')
const demosRoot = path.resolve(repoRoot, 'demos')
const outputRoot = path.resolve(repoRoot, 'backend', 'content', 'media', 'demos')

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed (${code}): ${command}`))
    })
  })
}

async function readDemoConfigs() {
  const entries = await readdir(demosRoot, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.')) continue

    const demoDir = path.resolve(demosRoot, entry.name)
    const configPath = path.resolve(demoDir, 'demo.config.json')
    try {
      const raw = await readFile(configPath, 'utf8')
      const config = JSON.parse(raw)
      results.push({ demoDir, slug: entry.name, config })
    } catch {
      // Ignore folders without demo.config.json
    }
  }
  return results
}

function assertConfig(slug, config) {
  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid config for demo "${slug}"`)
  }
  if (typeof config.version !== 'string' || !config.version.trim()) {
    throw new Error(`Missing "version" in demo.config.json for "${slug}"`)
  }
  const type = config.type ?? 'static'
  if (!['static', 'vue'].includes(type)) {
    throw new Error(`Unsupported "type" in demo.config.json for "${slug}": ${String(type)}`)
  }
  if (type === 'static' && (typeof config.source !== 'string' || !config.source.trim())) {
    throw new Error(`Missing "source" for static demo "${slug}"`)
  }
}

async function resolveSourceDir({ demoDir, slug, config }) {
  const type = config.type ?? 'static'
  if (type === 'static') {
    return path.resolve(demoDir, config.source)
  }

  const projectDir = path.resolve(demoDir, config.projectDir ?? '.')
  const buildCommand = config.buildCommand ?? 'npm run build'
  const distDir = config.distDir ?? 'dist'

  console.log(`[${slug}] Building vue demo: ${buildCommand}`)
  await runCommand(buildCommand, projectDir)
  return path.resolve(projectDir, distDir)
}

async function buildOne({ demoDir, slug, config }) {
  assertConfig(slug, config)
  const sourceDir = await resolveSourceDir({ demoDir, slug, config })
  const sourceStat = await stat(sourceDir).catch(() => null)
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Source directory not found for "${slug}": ${sourceDir}`)
  }

  const outDir = path.resolve(outputRoot, slug, config.version)
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })
  await cp(sourceDir, outDir, { recursive: true })

  const url = `/api/media/files/demos/${slug}/${config.version}/index.html`
  return { slug, version: config.version, outDir, url }
}

async function main() {
  const demos = await readDemoConfigs()
  if (!demos.length) {
    console.log('No demo.config.json found under demos/.')
    return
  }

  const built = []
  for (const item of demos) {
    const result = await buildOne(item)
    built.push(result)
  }

  console.log('Built demo artifacts:')
  for (const item of built) {
    console.log(`- ${item.slug}@${item.version}`)
    console.log(`  output: ${item.outDir}`)
    console.log(`  url:    ${item.url}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
