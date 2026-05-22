import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser } from '@/lib/google-sheets'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        await upsertUser({
          email: user.email || '',
          name: user.name || '',
        })
      } catch (e) {
        console.error('Failed to save user to sheet:', e)
      }
      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        try {
          const { getUserByEmail } = await import('@/lib/google-sheets')
          const sheetUser = await getUserByEmail(session.user.email)
          if (sheetUser) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(session.user as any).role = sheetUser.role || 'designer'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(session.user as any).department = sheetUser.department || ''
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(session.user as any).role = 'designer'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(session.user as any).department = ''
          }
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(session.user as any).role = 'designer'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(session.user as any).department = ''
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

export { handler as GET, handler as POST }
