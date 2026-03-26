import { z } from 'zod'
import { ethers } from 'ethers'

export const resolveEnsSchema = z.object({
  ensName: z.string().describe('ENS name like vitalik.eth'),
})

export async function resolveEns({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof resolveEnsSchema> }) {
  try {
    const { ensName } = resolveEnsSchema.parse(toolArgs)

    if (!ensName.endsWith('.eth')) {
      return JSON.stringify({ error: 'Invalid ENS name. Must end with .eth' })
    }

    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    const address = await provider.resolveName(ensName)

    if (!address) {
      return JSON.stringify({
        ens_name: ensName,
        address: null,
        resolved: false,
        message: `No address found for ${ensName}. The name may not be registered or has no resolver set.`,
      })
    }

    return JSON.stringify({
      ens_name: ensName,
      address,
      resolved: true,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to resolve ENS name: ${error.message}` })
  }
}
