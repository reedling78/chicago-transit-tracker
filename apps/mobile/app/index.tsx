import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chicago Transit Tracker</Text>
      <Text style={styles.subtitle}>Explore CTA and Metra transit lines and stations</Text>
      <View style={styles.cards}>
        <Link href="/cta" asChild>
          <Pressable style={[styles.card, { backgroundColor: '#00a1de' }]}>
            <Text style={styles.cardTitle}>CTA</Text>
            <Text style={styles.cardDesc}>Rapid Transit Lines</Text>
          </Pressable>
        </Link>
        <Link href="/metra" asChild>
          <Pressable style={[styles.card, { backgroundColor: '#1a3d7a' }]}>
            <Text style={styles.cardTitle}>Metra</Text>
            <Text style={styles.cardDesc}>Commuter Rail Lines</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 40,
    textAlign: 'center',
  },
  cards: {
    width: '100%',
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
})
