import { View, Text, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function MetraTrainDetailScreen() {
  const { line, trainNumber } = useLocalSearchParams<{ line: string; trainNumber: string }>()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Train {trainNumber}</Text>
      <Text style={styles.subtitle}>{line?.toUpperCase()} line</Text>
      <Text style={styles.body}>Train detail coming soon.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#b0b0c0', fontSize: 16, marginTop: 8 },
  body: { color: '#b0b0c0', fontSize: 14, marginTop: 24 },
})
