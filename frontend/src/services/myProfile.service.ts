import { isAxiosError } from 'axios'
import { apiClient } from './api'

/** Datos PERSONALES del usuario logueado — nunca los de su organización
 * (eso vive en organizationBranding.service.ts). */
export interface MyProfile {
  id: string
  nombre: string
  email: string
  cargo: string | null
  telefono: string | null
  documentNumber: string
  fotoBase64: string | null
  firmaBase64: string | null
}

export interface MyProfileFormValues {
  nombre: string
  email: string
  cargo: string
  telefono: string
}

export interface ChangePasswordFormValues {
  currentPassword: string
  newPassword: string
}

export class MyProfileValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Profile form validation failed')
    this.name = 'MyProfileValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class MyProfileRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'MyProfileRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as {
      status: number
      data: { message?: string; errors?: Record<string, string> }
    }
    if (status === 422 && data.errors) throw new MyProfileValidationError(data.errors)
    throw new MyProfileRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function getMyProfile(): Promise<MyProfile> {
  try {
    const { data } = await apiClient.get('/users/me')
    return data.user
  } catch (err) {
    rethrow(err)
  }
}

export async function updateMyProfile(values: MyProfileFormValues): Promise<MyProfile> {
  try {
    const { data } = await apiClient.patch('/users/me', values)
    return data.user
  } catch (err) {
    rethrow(err)
  }
}

export async function changeMyPassword(values: ChangePasswordFormValues): Promise<void> {
  try {
    await apiClient.patch('/users/me/password', values)
  } catch (err) {
    rethrow(err)
  }
}

/** Foto de perfil del representante — distinta del logo de empresa (ver
 * organizationBranding.service.ts). `fotoBase64` es un data URI completo. */
export async function updateMyAvatar(fotoBase64: string): Promise<MyProfile> {
  try {
    const { data } = await apiClient.patch('/users/me/photo', { fotoBase64 })
    return data.user
  } catch (err) {
    rethrow(err)
  }
}

/** Firma visual (imagen escaneada/dibujada, no criptográfica) para la
 * sección "Firma y sello" de los reportes PDF. */
export async function updateMyFirma(firmaBase64: string): Promise<MyProfile> {
  try {
    const { data } = await apiClient.patch('/users/me/signature', { firmaBase64 })
    return data.user
  } catch (err) {
    rethrow(err)
  }
}
