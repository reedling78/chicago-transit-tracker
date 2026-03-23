/**
 * fetch-station-images.ts
 *
 * For each station in Firestore that doesn't already have a photoUrl:
 *   1. Search the Wikipedia API for an article matching the station name
 *   2. If a lead image is found, download it
 *   3. Upload to Firebase Storage at stations/{slug}/photo.jpg
 *   4. Make the file public and write the URL back to the Firestore station doc
 *
 * Skips stations that already have a photoUrl set — safe to re-run.
 * Rate-limited to 2 requests/sec to be respectful to the Wikipedia API.
 *
 * Auth:
 *   1. Place service-account.json at the project root, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Usage:
 *   npm run fetch:station-images
 */

import * as admin from 'firebase-admin'
import * as https from 'https'
import * as http from 'http'
import * as path from 'path'
import * as fs from 'fs'

const PROJECT_ID  = 'chicago-transit-tracker'
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase(): {
  db: admin.firestore.Firestore
  bucket: ReturnType<admin.storage.Storage['bucket']>
} {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: BUCKET_NAME,
    })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: BUCKET_NAME,
    })
  }
  return { db: admin.firestore(), bucket: admin.storage().bucket() }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { headers: { 'User-Agent': 'ChicagoTransitTracker/1.0 (educational project)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 && res.headers.location) {
        return downloadBuffer(res.headers.location!).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ChicagoTransitTracker/1.0 (educational project)' } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch (e) { reject(e) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// Wikipedia image search
//
// Strategy (tried in order until one succeeds):
//   1. "{name} station (CTA)"    — most CTA articles use this title format
//   2. "{name} station (Metra)"  — some Metra articles
//   3. "{name} station, Chicago" — older article title format
//   4. "{name} station"          — generic fallback
// ---------------------------------------------------------------------------

const WIKI_API = 'https://en.wikipedia.org/w/api.php'

interface WikiResult {
  imageUrl: string
  articleUrl: string
}

async function findWikipediaImage(
  stationName: string,
  service: string,
): Promise<WikiResult | null> {
  const serviceLabel = service === 'cta' ? 'CTA' : 'Metra'

  const candidates = [
    `${stationName} station (${serviceLabel})`,
    `${stationName} station, Chicago`,
    `${stationName} station`,
    stationName,
  ]

  for (const title of candidates) {
    const encoded = encodeURIComponent(title)
    const url =
      `${WIKI_API}?action=query&titles=${encoded}` +
      `&prop=pageimages&pithumbsize=1200&pilimit=1&format=json&formatversion=2`

    const data = (await fetchJson(url)) as {
      query: { pages: Array<{ missing?: boolean; title?: string; thumbnail?: { source: string } }> }
    }

    const page = data?.query?.pages?.[0]
    if (!page || page.missing) continue
    if (page.thumbnail?.source) {
      return {
        imageUrl: page.thumbnail.source,
        articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title!.replace(/ /g, '_'))}`,
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Storage upload
// ---------------------------------------------------------------------------

function publicUrl(filePath: string): string {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`
}

async function uploadImage(
  bucket: ReturnType<admin.storage.Storage['bucket']>,
  slug: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const storagePath = `stations/${slug}/photo.${ext}`
  const file = bucket.file(storagePath)
  await file.save(imageBuffer, { contentType })
  await file.makePublic()
  return publicUrl(storagePath)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { db, bucket } = initFirebase()

  const snap = await db.collection('stations').get()
  const stations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }))

  const total     = stations.length
  let found       = 0
  let notFound    = 0
  let skipped     = 0
  let errors      = 0

  console.log(`Processing ${total} stations...\n`)

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i]
    const slug    = station.id
    const name    = station.name as string
    const service = station.service as string

    process.stdout.write(`[${i + 1}/${total}] ${name} (${slug}) ... `)

    // Skip if already has a photo
    if (station.photoUrl) {
      console.log('skipped (already has photo)')
      skipped++
      continue
    }

    try {
      // Rate limit — 2 req/sec
      if (i > 0) await sleep(500)

      const result = await findWikipediaImage(name, service)

      if (!result) {
        console.log('no image found')
        notFound++
        continue
      }

      // Download the image
      const imageBuffer = await downloadBuffer(result.imageUrl)
      const contentType = result.imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

      // Upload to Storage and update Firestore
      const downloadUrl = await uploadImage(bucket, slug, imageBuffer, contentType)
      await db.collection('stations').doc(slug).update({ photoUrl: downloadUrl, wikipediaUrl: result.articleUrl })

      console.log(`✓ ${result.imageUrl.slice(0, 60)}...`)
      found++
    } catch (err) {
      console.log(`ERROR — ${(err as Error).message}`)
      errors++
    }
  }

  console.log('\n─────────────────────────────')
  console.log(`Total:     ${total}`)
  console.log(`Found:     ${found}`)
  console.log(`Not found: ${notFound}`)
  console.log(`Skipped:   ${skipped}`)
  console.log(`Errors:    ${errors}`)
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
