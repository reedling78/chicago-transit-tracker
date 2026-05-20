import { Platform, Text } from 'react-native'
import { headerLeftItem, headerRightItem } from '../../lib/headerItems'

describe('headerItems', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true })
  })

  function setPlatform(os: 'ios' | 'android') {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
  }

  describe('headerLeftItem', () => {
    it('on iOS returns unstable_headerLeftItems with hidesSharedBackground', () => {
      setPlatform('ios')
      const element = <Text>back</Text>
      const opts = headerLeftItem(element)
      expect(opts).toHaveProperty('unstable_headerLeftItems')
      expect(opts).not.toHaveProperty('headerLeft')
      const items = opts.unstable_headerLeftItems!({} as never)
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        type: 'custom',
        element,
        hidesSharedBackground: true,
      })
    })

    it('on Android returns headerLeft', () => {
      setPlatform('android')
      const element = <Text>back</Text>
      const opts = headerLeftItem(element)
      expect(opts).toHaveProperty('headerLeft')
      expect(opts).not.toHaveProperty('unstable_headerLeftItems')
      const node = (opts.headerLeft as () => React.ReactElement)()
      expect(node).toBe(element)
    })

    it('on iOS returns an empty items list when given null', () => {
      setPlatform('ios')
      const opts = headerLeftItem(null)
      expect(opts.unstable_headerLeftItems!({} as never)).toEqual([])
      expect((opts.headerLeft as () => React.ReactElement | null)()).toBeNull()
    })

    it('on Android returns a null-renderer when given null', () => {
      setPlatform('android')
      const opts = headerLeftItem(null)
      expect(opts).not.toHaveProperty('unstable_headerLeftItems')
      expect((opts.headerLeft as () => React.ReactElement | null)()).toBeNull()
    })
  })

  describe('headerRightItem', () => {
    it('on iOS returns unstable_headerRightItems with hidesSharedBackground', () => {
      setPlatform('ios')
      const element = <Text>heart</Text>
      const opts = headerRightItem(element)
      expect(opts).toHaveProperty('unstable_headerRightItems')
      expect(opts).not.toHaveProperty('headerRight')
      const items = opts.unstable_headerRightItems!({} as never)
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        type: 'custom',
        element,
        hidesSharedBackground: true,
      })
    })

    it('on Android returns headerRight', () => {
      setPlatform('android')
      const element = <Text>heart</Text>
      const opts = headerRightItem(element)
      expect(opts).toHaveProperty('headerRight')
      expect(opts).not.toHaveProperty('unstable_headerRightItems')
      const node = (opts.headerRight as () => React.ReactElement)()
      expect(node).toBe(element)
    })
  })
})
