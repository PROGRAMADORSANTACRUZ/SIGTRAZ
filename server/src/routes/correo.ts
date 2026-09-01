import { Router } from 'express'
import { enviarConAdjuntos, type AdjuntoCorreo } from '../mailer.js'

export const correoRouter = Router()

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /enviar -> envia un correo con adjuntos (documentos generados en el cliente).
// Body: { destino, asunto?, mensaje?, adjuntos: [{ nombre, contenidoBase64, tipo? }] }
correoRouter.post('/enviar', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const destino = String(body.destino ?? '').trim()
    if (!RE_EMAIL.test(destino)) {
      res.status(400).json({ errores: ['Correo de destino invalido'] })
      return
    }
    const asunto = String(body.asunto ?? 'Documento - Agropecuaria Santacruz').slice(0, 200)
    const mensaje = String(body.mensaje ?? 'Adjunto encontrara el documento solicitado.').slice(
      0,
      2000,
    )
    const adjuntosRaw = Array.isArray(body.adjuntos) ? body.adjuntos : []
    const adjuntos: AdjuntoCorreo[] = adjuntosRaw
      .map((a) => a as Record<string, unknown>)
      .filter((a) => a && typeof a.nombre === 'string' && typeof a.contenidoBase64 === 'string')
      .map((a) => ({
        nombre: String(a.nombre),
        contenidoBase64: String(a.contenidoBase64),
        tipo: typeof a.tipo === 'string' ? a.tipo : undefined,
      }))
    if (adjuntos.length === 0) {
      res.status(400).json({ errores: ['No se recibio ningun adjunto'] })
      return
    }

    await enviarConAdjuntos({ destino, asunto, mensaje, adjuntos })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
