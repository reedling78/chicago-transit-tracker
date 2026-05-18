import { useMemo, type ReactNode } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useTheme, type Theme } from '../lib/theme'
import Footer from '../components/Footer'

export default function PrivacyScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerStyle: { backgroundColor: theme.colors.bg.canvas },
          headerShadowVisible: false,
          headerTitle: 'Chicago Transit Tracker',
          headerTitleAlign: 'left',
          headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}
        contentContainerStyle={[styles.content, { paddingTop: headerInset + 24 }]}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lede}>How Chicago Transit Tracker handles your information.</Text>

        <Section title="Overview" theme={theme}>
          <Paragraph theme={theme}>
            Chicago Transit Tracker respects your privacy. This statement explains what information
            is collected when you use this app, how it is used, and your choices. We do not sell,
            rent, or share personal data with third parties for marketing purposes.
          </Paragraph>
        </Section>

        <Section title="Information We Collect" theme={theme}>
          <Paragraph theme={theme}>
            You can browse transit information without creating an account. If you choose to sign in
            to save favorites, we collect the email address and basic profile information returned
            by your sign-in provider (Apple, Google, or email and password). We do not collect
            payment details.
          </Paragraph>
          <Paragraph theme={theme}>
            We use anonymized analytics to understand how the app is used. This may include pages
            visited, general device type, operating system, and approximate region. Analytics data
            is not used to identify individual users.
          </Paragraph>
        </Section>

        <Section title="On-Device Storage" theme={theme}>
          <Paragraph theme={theme}>
            The app uses your device’s local storage (AsyncStorage) to remember your light/dark
            theme preference and your favorites list while signed out. This data stays on your
            device.
          </Paragraph>
        </Section>

        <Section title="How We Use Data" theme={theme}>
          <Paragraph theme={theme}>
            Analytics data is used solely to understand which features are most useful so we can
            improve the app. Aggregate, anonymized analytics are never sold or shared with third
            parties.
          </Paragraph>
          <Paragraph theme={theme}>
            Profile data (email, favorites) is used only to provide the favorites feature across
            your devices. It is stored in Firebase Firestore under owner-only access rules.
          </Paragraph>
        </Section>

        <Section title="Third-Party Services" theme={theme}>
          <Paragraph theme={theme}>
            <Text style={styles.bold}>Firebase</Text> — used for authentication, profile storage,
            and serving transit data. Firebase may log standard server request data. See{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://firebase.google.com/support/privacy')}
            >
              Firebase’s privacy information
            </Text>
            .
          </Paragraph>
          <Paragraph theme={theme}>
            <Text style={styles.bold}>Google Analytics</Text> — analytics provider. Data is
            processed under Google’s privacy policy at{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://policies.google.com/privacy')}
            >
              policies.google.com/privacy
            </Text>
            .
          </Paragraph>
        </Section>

        <Section title="Your Choices" theme={theme}>
          <Paragraph theme={theme}>
            You can sign out at any time from the Profile screen. Signing out clears the active
            session on this device. To delete your stored profile data entirely, contact us using
            the link below.
          </Paragraph>
        </Section>

        <Section title="Children’s Privacy" theme={theme}>
          <Paragraph theme={theme}>
            This app is not directed at children under 13 and we do not knowingly collect
            information from children.
          </Paragraph>
        </Section>

        <Section title="Changes to This Policy" theme={theme}>
          <Paragraph theme={theme}>
            We may update this privacy policy from time to time. Continued use of the app after
            changes are posted constitutes acceptance of the updated policy.
          </Paragraph>
        </Section>

        <Footer />
      </ScrollView>
    </>
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
    bold: {
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    link: {
      color: theme.colors.accent.primary,
      textDecorationLine: 'underline',
    },
  })
}
