'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const browserSnapshot = () => true
const serverSnapshot = () => false

export function useHydrated() {
  return useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot)
}
