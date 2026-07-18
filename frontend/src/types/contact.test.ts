import { describe, expect, it } from 'vitest'
import { createContactSchema, type ContactValidationMessages } from './contact'

const messages: ContactValidationMessages = {
  nombreRequired: 'nombre required',
  correoInvalid: 'correo invalid',
  telefonoRequired: 'telefono required',
  telefonoInvalid: 'telefono invalid',
  mensajeRequired: 'mensaje required',
  consentRequired: 'consent required',
}

const schema = createContactSchema(messages)

const validPayload = {
  nombre: 'Ana García',
  correo: 'ana@empresa.com',
  telefono: '+57 300 000 0000',
  empresa: 'RoMa',
  mensaje: 'Quisiera agendar un diagnóstico inicial para mi operación.',
  consent: true,
}

describe('createContactSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = schema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts a valid payload without the optional empresa field', () => {
    const { empresa: _empresa, ...rest } = validPayload
    const result = schema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('defaults the honeypot field to an empty string when omitted', () => {
    const result = schema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.website).toBe('')
    }
  })

  it('rejects a name shorter than 2 characters with the translated message', () => {
    const result = schema.safeParse({ ...validPayload, nombre: 'A' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.nombreRequired)
    }
  })

  it('rejects an invalid email with the translated message', () => {
    const result = schema.safeParse({ ...validPayload, correo: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.correoInvalid)
    }
  })

  it('rejects a phone number containing letters', () => {
    // 7+ chars so it clears the .min() check first and actually exercises the regex
    const result = schema.safeParse({ ...validPayload, telefono: 'abcdefg123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.telefonoInvalid)
    }
  })

  it('rejects a message shorter than 10 characters', () => {
    const result = schema.safeParse({ ...validPayload, mensaje: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.mensajeRequired)
    }
  })

  it('rejects submission when the data-consent checkbox is unchecked', () => {
    const result = schema.safeParse({ ...validPayload, consent: false })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.consentRequired)
    }
  })
})
