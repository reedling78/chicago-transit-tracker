import { TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Svg, Path, Circle } from 'react-native-svg'
import { useAuth } from '../lib/AuthContext'

export default function HeaderUserIcon() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) return null

  return (
    <TouchableOpacity
      onPress={() => router.push(user ? '/profile' : '/auth')}
      accessibilityLabel={user ? 'Profile' : 'Sign in'}
      style={{ marginRight: 8 }}
    >
      {user ? (
        <Svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <Circle cx={12} cy={7} r={4} fill="#4F8EF7" stroke="#4F8EF7" />
        </Svg>
      ) : (
        <Svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <Circle cx={12} cy={7} r={4} />
        </Svg>
      )}
    </TouchableOpacity>
  )
}
