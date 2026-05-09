import { useMemo, type ReactNode } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useTheme, type Theme } from '../lib/theme'
import Footer from '../components/Footer'

export default function TermsScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}
      contentContainerStyle={[styles.content, { paddingTop: headerInset + 24 }]}
    >
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.lede}>Please read these terms before using Chicago Transit Tracker.</Text>

      <Section title="Overview" theme={theme}>
        <Paragraph theme={theme}>
          Chicago Transit Tracker is an independent, unofficial application. It is not sponsored,
          affiliated, or operated by the Chicago Transit Authority (CTA), Metra, or any other
          transit agency. Use of this app does not create any relationship between you and those
          agencies.
        </Paragraph>
        <Paragraph theme={theme}>
          By using this app, you agree to these Terms of Use. If you do not agree, please do not use
          the app.
        </Paragraph>
      </Section>

      <Section title="Accuracy of Information" theme={theme}>
        <Paragraph theme={theme}>
          Transit schedules, station details, route information, and other data shown in this app
          are sourced from publicly available data provided by CTA and Metra. This information is
          provided for general reference only.
        </Paragraph>
        <Paragraph theme={theme}>
          We make no guarantee that the information shown is accurate, complete, current, or
          suitable for trip planning. Service disruptions, schedule changes, and accessibility
          conditions may not be reflected in real time.
        </Paragraph>
        <Paragraph theme={theme}>
          Always verify travel information directly with the{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://www.transitchicago.com')}
          >
            Chicago Transit Authority
          </Text>{' '}
          or{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://metra.com')}>
            Metra
          </Text>{' '}
          before making travel decisions.
        </Paragraph>
      </Section>

      <Section title="No Warranty" theme={theme}>
        <Paragraph theme={theme}>
          This app is provided “as is” and “as available” without warranty of any kind, express or
          implied. We do not warrant that the app will be uninterrupted, error-free, or free of
          harmful components. Your use of this app is at your own risk.
        </Paragraph>
      </Section>

      <Section title="Intellectual Property" theme={theme}>
        <Paragraph theme={theme}>
          CTA, Metra, and their respective logos, route names, and branding are trademarks of their
          respective owners. CTA ‘L’ route colors used in this app are sourced from the official CTA
          Developer Trademark Guidelines and are used solely to identify transit routes.
        </Paragraph>
        <Paragraph theme={theme}>
          Chicago Transit Tracker is not intended to imply any official affiliation. No CTA or Metra
          agency logos are reproduced in this app.
        </Paragraph>
      </Section>

      <Section title="External Links" theme={theme}>
        <Paragraph theme={theme}>
          This app links to official CTA and Metra websites and other third-party resources for your
          convenience. We have no control over the content or availability of those sites and accept
          no responsibility for them.
        </Paragraph>
      </Section>

      <Section title="Changes to These Terms" theme={theme}>
        <Paragraph theme={theme}>
          We may update these terms at any time without prior notice. Continued use of the app after
          changes are posted constitutes your acceptance of the revised terms.
        </Paragraph>
      </Section>

      <Footer />
    </ScrollView>
  )
}

function Section({ title, theme, children }: { title: string; theme: Theme; children: ReactNode }) {
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

function Paragraph({ theme, children }: { theme: Theme; children: ReactNode }) {
  const styles = useMemo(() => makeStyles(theme), [theme])
  return <Text style={styles.paragraph}>{children}</Text>
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: theme.space[5], paddingBottom: theme.space[4] },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
      marginBottom: theme.space[2],
    },
    lede: {
      fontSize: 15,
      color: theme.colors.text.secondary,
      marginBottom: theme.space[6],
    },
    section: { marginBottom: theme.space[6] },
    heading: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.space[3],
    },
    body: { gap: theme.space[3] },
    paragraph: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.text.secondary,
    },
    link: {
      color: theme.colors.accent.primary,
      textDecorationLine: 'underline',
    },
  })
}
