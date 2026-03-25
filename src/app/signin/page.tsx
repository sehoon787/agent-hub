import type { Metadata } from "next"
import { SignInForm } from "./signin-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to AgentHub to submit and manage your AI coding agents.",
}

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <SignInForm />
    </div>
  )
}
