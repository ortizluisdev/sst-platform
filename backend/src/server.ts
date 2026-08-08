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

// Sin este .catch(), un fallo de buildApp() (ej. no conecta a la BD al
// registrar el plugin de Prisma) se convertía en un unhandled rejection:
// no pasaba por ningún logger estructurado y la salida del proceso quedaba
// a merced del manejo default de Node en vez de un exit code explícito.
main().catch((err) => {
  console.error('Fallo fatal al iniciar el servidor:', err)
  process.exit(1)
})
