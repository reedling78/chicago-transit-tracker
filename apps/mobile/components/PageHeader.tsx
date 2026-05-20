import type { ReactNode } from 'react'
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { DashboardItemType } from '@ctt/shared'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useTheme } from '../lib/theme'
import DashboardAddButton from './DashboardAddButton'

interface PageHeaderProps {
  title?: string
  description?: string
  breadcrumbItems?: { label: string; href?: string }[]
  badges?: ReactNode
  icon?: ReactNode
  imageSrc?: ImageSourcePropType
  /**
   * When provided, renders a "+ Dashboard" pill at the bottom-right of the hero
   * so users can add the current line/station/train to their dashboard.
   */
  dashboardItem?: { type: DashboardItemType; id: string }
  compact?: boolean
  children?: ReactNode
}

const defaultImage = require('../assets/hero-header.jpg')

const GRADIENT_STOPS = ['transparent', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.85)'] as const
const TEXT_SHADOW = 'rgba(0,0,0,0.3)'

export default function PageHeader({
  title,
  description,
  badges,
  icon,
  imageSrc = defaultImage,
  dashboardItem,
  compact = false,
  children,
}: PageHeaderProps) {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  const contentHeight = compact ? 140 : 200
  return (
    <View style={[styles.container, { height: contentHeight + headerInset }]}>
      <Image source={imageSrc} style={styles.backgroundImage} resizeMode="cover" />
      <View style={[styles.tintOverlay, { backgroundColor: theme.colors.bg.scrim }]} />
      <LinearGradient
        colors={GRADIENT_STOPS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={[styles.content, compact && styles.contentCompact]}>
        {badges && <View style={styles.badges}>{badges}</View>}
        <View style={styles.bottomRow}>
          <View style={styles.bottomTextCol}>
            {title && (
              <View style={styles.titleInner}>
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
                <Text
                  style={[
                    styles.title,
                    compact && styles.titleCompact,
                    { color: theme.colors.text.onScrim },
                  ]}
                >
                  {title}
                </Text>
              </View>
            )}
            {description && (
              <Text
                style={[
                  styles.description,
                  compact && styles.descriptionCompact,
                  { color: theme.colors.text.onScrimMuted },
                ]}
              >
                {description}
              </Text>
            )}
            {children && <View style={styles.children}>{children}</View>}
          </View>
          {dashboardItem && (
            <View style={styles.actionWrapper}>
              <DashboardAddButton type={dashboardItem.type} id={dashboardItem.id} />
            </View>
          )}
        </View>
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
  contentCompact: {
    padding: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  bottomTextCol: {
    flexShrink: 1,
    flexGrow: 1,
  },
  titleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  actionWrapper: {
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
  titleCompact: {
    fontSize: 19,
  },
  description: {
    fontSize: 14,
    marginTop: 6,
  },
  descriptionCompact: {
    fontSize: 13,
    marginTop: 4,
  },
  children: {
    marginTop: 8,
  },
})
