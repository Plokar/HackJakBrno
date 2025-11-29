import '../styles/globals.css'
import Head from 'next/head'
import Layout from '../components/Layout'
import { RoleProvider } from '../lib/RoleContext'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>Medic Hub - Fakultní nemocnice u svaté Anny</title>
        <meta name="description" content="Dashboard pro sledování vytížení a nákladů operačních sálů" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <RoleProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </RoleProvider>
    </>
  )
}
