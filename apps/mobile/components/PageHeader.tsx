import type { ReactNode } from 'react'
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { FavoriteType } from '@ctt/shared'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useTheme } from '../lib/theme'
import FavoriteButton from './FavoriteButton'

interface PageHeaderProps {
  title?: string
  description?: string
  breadcrumbItems?: { label: string; href?: string }[]
  badges?: ReactNode
  icon?: ReactNode
  imageSrc?: ImageSourcePropType
  favorite?: { type: FavoriteType; id: string }
  children?: ReactNode
}

const defaultImage = require('../assets/hero-header.jpg')

// Photo gradient stops are a fixed visual treatment, not theme-dependent —
// the photo behind them is always dark, so the gradient stays the same in
// both modes. Tokenized text colors apply on top.
const GRADIENT_STOPS = ['transparent', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.85)'] as const
const TEXT_SHADOW = 'rgba(0,0,0,0.3)'

export default function PageHeader({
  title,
  description,
  badges,
  icon,
  imageSrc = defaultImage,
  favorite,
  children,
}: PageHeaderProps) {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  return (
    <View style={[styles.container, { height: 200 + headerInset }]}>
      <Image source={imageSrc} style={styles.backgroundImage} resizeMode="cover" />
      <View style={[styles.tintOverlay, { backgroundColor: theme.colors.bg.scrim }]} />
      <LinearGradient
        colors={GRADIENT_STOPS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={styles.content}>
        {badges && <View style={styles.badges}>{badges}</View>}
        {(title || favorite) && (
          <View style={styles.titleRow}>
            {title && (
              <View style={styles.titleInner}>
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
                <Text style={[styles.title, { color: theme.colors.text.onScrim }]}>{title}</Text>
              </View>
            )}
            {favorite && (
              <View style={styles.favoriteWrapper}>
                <FavoriteButton type={favorite.type} id={favorite.id} />
              </View>
            )}
          </View>
        )}
        {description && (
          <Text style={[styles.description, { color: theme.colors.text.onScrimMuted }]}>
            {description}
          </Text>
        )}
        {children && <View style={styles.children}>{children}</View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginHorizontal: -16,
    marginBottom: 16,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleInner: {
    flexShrink: 1,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  favoriteWrapper: {
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.3,
    textShadowColor: TEXT_SHADOW,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    marginTop: 6,
  },
  children: {
    marginTop: 8,
  },
})
