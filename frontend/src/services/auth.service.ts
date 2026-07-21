import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
} from '@/types/auth'

/** Errores 422 del backend, mapeados por campo. */
export class AuthValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Auth form validation failed')
    this.name = 'AuthValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** Errores de negocio del backend (401/403/409) con el mensaje ya listo para mostrar. */
export class AuthRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
  }
}

function rethrowKnownAuthError(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response
    if (status === 422) {
      throw new AuthValidationError((data as { errors?: Record<string, string> })?.errors ?? {})
    }
    const message = (data as { message?: string })?.message
    if (message) throw new AuthRequestError(status, message)
  }
  throw err
}

export interface AuthenticatedUser {
  id: string
  email: string
  nombre: string
}

export async function postLogin(values: LoginFormValues): Promise<{ user: AuthenticatedUser }> {
  try {
    const { data } = await apiClient.post('/auth/login', values)
    return data
  } catch (err) {
    rethrowKnownAuthError(err)
  }
}

export interface RegisterResult {
  user: AuthenticatedUser
  organization: { id: string; nombre: string }
  message: string
}

export async function postRegister(values: RegisterFormValues): Promise<RegisterResult> {
  try {
    const { data } = await apiClient.post('/auth/register', values)
    return data
  } catch (err) {
    rethrowKnownAuthError(err)
  }
}

export async function postForgotPassword(values: ForgotPasswordFormValues): Promise<void> {
  try {
    await apiClient.post('/auth/password-reset/request', values)
  } catch (err) {
    rethrowKnownAuthError(err)
  }
}

export async function postResetPassword(values: ResetPasswordFormValues): Promise<void> {
  try {
    await apiClient.post('/auth/password-reset/confirm', values)
  } catch (err) {
    rethrowKnownAuthError(err)
  }
}
