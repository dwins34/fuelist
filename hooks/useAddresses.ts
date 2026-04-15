import { useAddressContext, UserAddress, CreateAddressInput } from '@/context/AddressContext'

export type { UserAddress, CreateAddressInput }

/**
 * useAddresses hook
 * Now a simple consumer of the global AddressContext.
 * This ensures that addresses are synced across all components
 * (Cart, Account Settings, Subscription Modal).
 */
export function useAddresses() {
  return useAddressContext()
}
