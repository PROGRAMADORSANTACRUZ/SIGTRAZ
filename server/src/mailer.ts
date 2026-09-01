import nodemailer from 'nodemailer'
import { config } from './config.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.password) {
    throw new Error(
      'SMTP no configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASSWORD en el archivo .env',
    )
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.password },
    })
  }
  return transporter
}

export interface AdjuntoCorreo {
  nombre: string
  contenidoBase64: string
  tipo?: string
}

export async function enviarConAdjuntos(opciones: {
  destino: string
  asunto: string
  mensaje: string
  adjuntos: AdjuntoCorreo[]
}): Promise<void> {
  const { destino, asunto, mensaje, adjuntos } = opciones
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
      <h2 style="color:#2f9e44">Agropecuaria Santacruz</h2>
      <p>${mensaje.replace(/\n/g, '<br>')}</p>
      <p style="font-size:13px;color:#64748b;margin-top:24px">
        Este correo fue enviado desde el sistema SIGTRAZ.
      </p>
    </div>`

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: destino,
    subject: asunto,
    html,
    attachments: adjuntos.map((a) => ({
      filename: a.nombre,
      content: Buffer.from(a.contenidoBase64, 'base64'),
      contentType: a.tipo,
    })),
  })
}
