import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KathaForge — Telugu Content Studio',
  description: 'Research Telugu YouTube topics and turn promising ideas into editable episodes.'
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
