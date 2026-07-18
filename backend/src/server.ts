import { setDefaultResultOrder } from 'node:dns'
import { buildApp } from './app.js'
import { env } from './config/env.js'

// Render (y otros PaaS) suelen no tener salida IPv6 funcional. Node 18+ intenta
// IPv6 primero si el DNS lo resuelve, y smtp.gmail.com resuelve a ambos — sin
// esto, Nodemailer falla con ENETUNREACH al intentar conectar por IPv6.
setDefaultResultOrder('ipv4first')

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
