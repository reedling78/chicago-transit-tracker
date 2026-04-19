import type { ReactNode } from 'react'
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbItems?: { label: string; href?: string }[]
  badges?: ReactNode
  icon?: ReactNode
  imageSrc?: ImageSourcePropType
  children?: ReactNode
}

const defaultImage = require('../assets/hero-header.jpg')

export default function PageHeader({
  title,
  description,
  badges,
  icon,
  imageSrc = defaultImage,
  children,
}: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <Image source={imageSrc} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.tintOverlay} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={styles.content}>
        {badges && <View style={styles.badges}>{badges}</View>}
        <View style={styles.titleRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
        </View>
        {description && <Text style={styles.description}>{description}</Text>}
        {children && <View style={styles.children}>{children}</View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginTop: -12,
    marginBottom: 16,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
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
  iconWrapper: {
    flexShrink: 0,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 6,
  },
  children: {
    marginTop: 8,
  },
})
