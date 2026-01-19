import { Metadata } from 'next'
import ClientSignIn from './ClientSignIn'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function Page() {
  return <ClientSignIn />
}
