import { render, waitFor } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import AppleCallbackScreen from '../../app/apple-callback'
import { completeAppleSignInFromCallback } from '../../lib/auth'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: jest.fn(),
}))

jest.mock('../../lib/auth', () => ({
  completeAppleSignInFromCallback: jest.fn(),
}))

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>
const mockComplete = completeAppleSignInFromCallback as jest.MockedFunction<
  typeof completeAppleSignInFromCallback
>

describe('AppleCallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockComplete.mockResolvedValue(undefined)
  })

  it('forwards Apple OAuth params from the deep link to completeAppleSignInFromCallback', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      id_token: 'route-id-token',
      code: 'apple-code',
      state: 'state-xyz',
    })
    render(<AppleCallbackScreen />)
    await waitFor(() => expect(mockComplete).toHaveBeenCalledTimes(1))
    expect(mockComplete).toHaveBeenCalledWith({
      id_token: 'route-id-token',
      code: 'apple-code',
      state: 'state-xyz',
    })
  })

  it('navigates back to / after completion (success or failure)', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id_token: 't', state: 's' })
    render(<AppleCallbackScreen />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
  })

  it('navigates back to / even when completeAppleSignInFromCallback rejects', async () => {
    mockComplete.mockRejectedValueOnce(new Error('state mismatch'))
    mockUseLocalSearchParams.mockReturnValue({ id_token: 't', state: 'tampered' })
    render(<AppleCallbackScreen />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
  })

  it('flattens array-valued query params to their first element', async () => {
    // expo-router represents repeated query params as string[]; we should
    // pass through only the first value to keep the auth helper signature
    // simple.
    mockUseLocalSearchParams.mockReturnValue({
      id_token: ['first-token', 'second-token'],
      state: 'state-xyz',
    })
    render(<AppleCallbackScreen />)
    await waitFor(() => expect(mockComplete).toHaveBeenCalledTimes(1))
    expect(mockComplete).toHaveBeenCalledWith({
      id_token: 'first-token',
      state: 'state-xyz',
    })
  })
})
