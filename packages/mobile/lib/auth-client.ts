import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [
    expoClient({
      scheme: 'homeservices',
      storagePrefix: 'homeservices',
      storage: SecureStore,
    }),
  ],
})
