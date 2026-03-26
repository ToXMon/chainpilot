import Privy from '@privy-io/react-auth'

export const privy = new Privy({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  config: {
    loginMethods: ['email', 'google', 'twitter', 'wallet'],
    appearance: {
      theme: 'dark',
      accentColor: '#6366f1',
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallet',
    },
  },
})
