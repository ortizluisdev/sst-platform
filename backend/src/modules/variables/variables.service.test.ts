import { describe, it, expect } from 'vitest'
import { computeMissingVariables } from './variables.service.js'

describe('computeMissingVariables (Fix 3b — alerta de variables faltantes)', () => {
  const catalogo = [
    { codigo: 'ILU-01', nombre: 'Iluminancia horizontal media' },
    { codigo: 'ILU-02', nombre: 'Uniformidad' },
    { codigo: 'RUI-05', nombre: 'Nivel continuo equivalente (A)' },
  ]

  it('devuelve null cuando la carga cubre todo el catálogo', () => {
    expect(computeMissingVariables(['ILU-01', 'ILU-02', 'RUI-05'], catalogo)).toBeNull()
  })

  it('devuelve los códigos que no aparecieron en la carga', () => {
    expect(computeMissingVariables(['ILU-01'], catalogo)).toEqual([
      { codigo: 'ILU-02', nombre: 'Uniformidad' },
      { codigo: 'RUI-05', nombre: 'Nivel continuo equivalente (A)' },
    ])
  })

  it('devuelve null cuando la carga viene vacía y el catálogo también', () => {
    expect(computeMissingVariables([], [])).toBeNull()
  })

  it('códigos encontrados que no están en el catálogo no afectan el resultado', () => {
    expect(computeMissingVariables(['ILU-01', 'ILU-02', 'RUI-05', 'CODIGO-INEXISTENTE'], catalogo)).toBeNull()
  })
})
