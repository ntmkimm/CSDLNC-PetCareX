// src/pages/_app.tsx
import type { AppProps } from 'next/app'
import 'antd/dist/reset.css'
import '../styles/globals.css'
import React from 'react'

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
