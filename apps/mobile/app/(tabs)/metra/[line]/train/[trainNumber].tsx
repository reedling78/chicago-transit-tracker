import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { LINE_COLORS } from '@ctt/shared'
import { useLine } from '../../../../../lib/hooks'
import PageHeader from '../../../../../components/PageHeader'

const metraHeroImage = require('../../../../../assets/hero-header-metra.jpg')

export default function MetraTrainDetailScreen() {
  const { line: lineSlug, trainNumber } = useLocalSearchParams<{
    line: string
    trainNumber: string
  }>()
  const { line } = useLine(lineSlug)

  const title = `Train ${trainNumber}`
  const lineShortName = line?.shortName
  const chipColors = lineShortName ? LINE_COLORS[lineShortName] : undefined

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <PageHeader
          title={title}
          description={line?.name ? `${line.name} Line` : undefined}
          imageSrc={metraHeroImage}
          badges={
            lineShortName && (
              <View
                style={[styles.chip, { backgroundColor: chipColors?.bg ?? '#555' }]}
                testID="train-line-chip"
              >
                <Text style={[styles.chipText, { color: chipColors?.text ?? '#fff' }]}>
                  {lineShortName}
                </Text>
              </View>
            )
          }
        />
        <View style={styles.body} />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  contentContainer: { padding: 16, gap: 16 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  chipText: { fontSize: 13, fontWeight: '600' },
  body: {},
})
