import { describe, it, expect } from 'vitest'
import { withRetry } from '../../src/renderer/src/components/features/AppManager/utils'

describe('Retry Utility Tests', () => {
  it('should immediately resolve on the first successful run', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      return 'success'
    }

    const result = await withRetry(fn, 3, 1)
    expect(result).toBe('success')
    expect(callCount).toBe(1)
  })

  it('should retry on failure and eventually resolve if successful within limit', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      if (callCount < 3) throw new Error('Temporary failure')
      return 'success'
    }

    const result = await withRetry(fn, 3, 1)
    expect(result).toBe('success')
    expect(callCount).toBe(3)
  })

  it('should throw the last error if all retries are exhausted', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      throw new Error(`Failure ${callCount}`)
    }

    await expect(withRetry(fn, 3, 1)).rejects.toThrow('Failure 3')
    expect(callCount).toBe(3)
  })
})
