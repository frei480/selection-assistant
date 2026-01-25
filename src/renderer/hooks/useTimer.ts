import { useCallback } from 'react'

export const useTimer = () => {
  const setTimeoutTimer = useCallback((_key: string, callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  }, [])

  return { setTimeoutTimer }
}