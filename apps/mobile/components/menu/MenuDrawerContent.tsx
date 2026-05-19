import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '../../lib/theme'
import MenuSection from './MenuSection'
import MenuNavRow from './MenuNavRow'
import ProfilePanel from '../profile/ProfilePanel'
import FavoritesManager from '../profile/FavoritesManager'

export default function MenuDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const close = () => props.navigation.closeDrawer()

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: theme.colors.bg.canvas }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space[4], paddingBottom: insets.bottom + theme.space[8] },
      ]}
    >
      <MenuSection title="Menu">
        <MenuNavRow icon="grid-outline" label="Dashboard" href="/" onNavigate={close} />
        <MenuNavRow icon="train-outline" label="Metra" href="/metra" onNavigate={close} />
        <MenuNavRow icon="subway-outline" label="CTA" href="/cta" onNavigate={close} />
      </MenuSection>

      <MenuSection title="Dashboard">
        <FavoritesManager />
      </MenuSection>

      <MenuSection title="Profile">
        <ProfilePanel />
      </MenuSection>

      <MenuSection title="Legal">
        <MenuNavRow icon="shield-outline" label="Privacy" href="/privacy" onNavigate={close} />
        <MenuNavRow icon="document-text-outline" label="Terms" href="/terms" onNavigate={close} />
      </MenuSection>
    </DrawerContentScrollView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    content: { paddingHorizontal: theme.space[5] },
  })
}
