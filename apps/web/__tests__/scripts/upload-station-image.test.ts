/**
 * @jest-environment node
 */

import {
  checkStation,
  uploadStationImage,
  uploadStationVariants,
} from '../../scripts/upload-station-image'

function makeDb(exists: boolean, photoUrl: string | null = null) {
  const update = jest.fn().mockResolvedValue(undefined)
  const get = jest.fn().mockResolvedValue({
    exists,
    data: () => ({ photoUrl }),
  })
  const doc = jest.fn().mockReturnValue({ get, update })
  const collection = jest.fn().mockReturnValue({ doc })
  return { collection, doc, get, update } as unknown as {
    collection: jest.Mock
    doc: jest.Mock
    get: jest.Mock
    update: jest.Mock
  }
}

function makeBucket() {
  const save = jest.fn().mockResolvedValue(undefined)
  const makePublic = jest.fn().mockResolvedValue(undefined)
  const file = jest.fn().mockReturnValue({ save, makePublic })
  return { file, save, makePublic } as unknown as {
    file: jest.Mock
    save: jest.Mock
    makePublic: jest.Mock
  }
}

describe('upload-station-image script', () => {
  describe('checkStation', () => {
    it('returns the existing photoUrl when the station exists', async () => {
      const db = makeDb(true, 'https://example.com/old.jpg')
      const result = await checkStation('clark-lake', db as never)
      expect(result).toEqual({ exists: true, photoUrl: 'https://example.com/old.jpg' })
      expect(db.collection).toHaveBeenCalledWith('stations')
      expect(db.doc).toHaveBeenCalledWith('clark-lake')
    })

    it('returns null photoUrl when the station exists but has no photo', async () => {
      const db = makeDb(true, null)
      const result = await checkStation('clark-lake', db as never)
      expect(result).toEqual({ exists: true, photoUrl: null })
    })

    it('reports not-exists when the station is missing', async () => {
      const db = makeDb(false)
      const result = await checkStation('bogus', db as never)
      expect(result).toEqual({ exists: false, photoUrl: null })
    })
  })

  describe('uploadStationImage', () => {
    it('uploads the file, makes it public, updates Firestore, and returns the URL', async () => {
      const db = makeDb(true, null)
      const bucket = makeBucket()
      const buffer = Buffer.from('fake-image-bytes')

      const url = await uploadStationImage(
        'clark-lake',
        buffer,
        db as never,
        bucket as never,
        'chicago-transit-tracker.firebasestorage.app',
      )

      expect(bucket.file).toHaveBeenCalledWith('stations/clark-lake/hero.jpg')
      expect(bucket.save).toHaveBeenCalledWith(buffer, {
        contentType: 'image/jpeg',
      })
      expect(bucket.makePublic).toHaveBeenCalledTimes(1)
      expect(db.update).toHaveBeenCalledWith({
        photoUrl:
          'https://storage.googleapis.com/chicago-transit-tracker.firebasestorage.app/stations/clark-lake/hero.jpg',
      })
      expect(url).toBe(
        'https://storage.googleapis.com/chicago-transit-tracker.firebasestorage.app/stations/clark-lake/hero.jpg',
      )
    })
  })

  describe('uploadStationVariants', () => {
    const BUCKET = 'chicago-transit-tracker.firebasestorage.app'
    const URL_BASE = `https://storage.googleapis.com/${BUCKET}/stations/clark-lake`

    it('uploads three variants, makes them public, and updates Firestore with photoUrl + photoUrls', async () => {
      const db = makeDb(true, null)
      const bucket = makeBucket()
      const buffers = {
        desktop: Buffer.from('desktop-bytes'),
        mobile: Buffer.from('mobile-bytes'),
        og: Buffer.from('og-bytes'),
      }

      const result = await uploadStationVariants(
        'clark-lake',
        buffers,
        db as never,
        bucket as never,
        BUCKET,
      )

      expect(bucket.file).toHaveBeenCalledTimes(3)
      expect(bucket.file).toHaveBeenNthCalledWith(1, 'stations/clark-lake/hero-desktop.jpg')
      expect(bucket.file).toHaveBeenNthCalledWith(2, 'stations/clark-lake/hero-mobile.jpg')
      expect(bucket.file).toHaveBeenNthCalledWith(3, 'stations/clark-lake/hero-og.jpg')

      expect(bucket.save).toHaveBeenCalledTimes(3)
      const expectedSaveOpts = {
        contentType: 'image/jpeg',
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      }
      expect(bucket.save).toHaveBeenNthCalledWith(1, buffers.desktop, expectedSaveOpts)
      expect(bucket.save).toHaveBeenNthCalledWith(2, buffers.mobile, expectedSaveOpts)
      expect(bucket.save).toHaveBeenNthCalledWith(3, buffers.og, expectedSaveOpts)

      expect(bucket.makePublic).toHaveBeenCalledTimes(3)

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(db.update).toHaveBeenCalledWith({
        photoUrl: `${URL_BASE}/hero-desktop.jpg`,
        photoUrls: {
          desktop: `${URL_BASE}/hero-desktop.jpg`,
          mobile: `${URL_BASE}/hero-mobile.jpg`,
          og: `${URL_BASE}/hero-og.jpg`,
        },
      })

      expect(result).toEqual({
        desktop: `${URL_BASE}/hero-desktop.jpg`,
        mobile: `${URL_BASE}/hero-mobile.jpg`,
        og: `${URL_BASE}/hero-og.jpg`,
        photoUrl: `${URL_BASE}/hero-desktop.jpg`,
      })
    })

    it('throws when the station does not exist and never uploads any bytes', async () => {
      const db = makeDb(false)
      const bucket = makeBucket()
      const buffers = {
        desktop: Buffer.from('desktop-bytes'),
        mobile: Buffer.from('mobile-bytes'),
        og: Buffer.from('og-bytes'),
      }

      await expect(
        uploadStationVariants('bogus', buffers, db as never, bucket as never, BUCKET),
      ).rejects.toThrow(/bogus/)

      expect(bucket.save).not.toHaveBeenCalled()
      expect(bucket.makePublic).not.toHaveBeenCalled()
      expect(db.update).not.toHaveBeenCalled()
    })
  })
})
