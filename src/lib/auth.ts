import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          login: profile.login,
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  events: {
    async signIn({ user, profile }) {
      if (!process.env.DATABASE_URL || !profile) return
      try {
        const { getDb } = await import("@/db")
        const sql = getDb()
        const githubProfile = profile as { id?: number; login?: string }
        await sql`
          INSERT INTO users (github_id, login, name, email, image)
          VALUES (${String(githubProfile.id)}, ${githubProfile.login ?? ''}, ${user.name ?? ''}, ${user.email ?? ''}, ${user.image ?? ''})
          ON CONFLICT (github_id) DO UPDATE SET
            login = EXCLUDED.login,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            image = EXCLUDED.image,
            updated_at = NOW()
        `
      } catch (e) {
        console.error("Failed to upsert user:", e)
      }
    },
  },
  callbacks: {
    jwt({ token, profile, account }) {
      if (profile) {
        token.login = (profile as { login?: string }).login
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    session({ session, token }) {
      if (token.login) {
        session.user.login = token.login as string
      }
      return session
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return baseUrl
    },
  },
})
