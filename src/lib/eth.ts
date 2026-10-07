/**
 * Aritmética de ETH sem perda de precisão.
 * Valores trafegam como strings decimais e são calculados em wei (BigInt, 18 casas).
 */
const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)

export function toWei(value: string): bigint {
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value.trim())
  if (!match) throw new Error(`Valor ETH inválido: "${value}"`)
  const [, sign, whole, fraction = ''] = match
  const wei = BigInt(whole) * SCALE + BigInt(fraction.slice(0, DECIMALS).padEnd(DECIMALS, '0'))
  return sign ? -wei : wei
}

/** Converte wei em string decimal sem zeros à direita (mínimo de 2 casas) */
export function fromWei(wei: bigint, minDecimals = 2): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / SCALE
  let fraction = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  if (fraction.length < minDecimals) fraction = fraction.padEnd(minDecimals, '0')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export const addEth = (...values: string[]) => fromWei(values.reduce((sum, v) => sum + toWei(v), 0n))

export const subEth = (a: string, b: string) => fromWei(toWei(a) - toWei(b))

export const mulEth = (value: string, quantity: number) => fromWei(toWei(value) * BigInt(quantity))

/** Percentual inteiro (ex.: 10 → 10%), arredondado para baixo em wei */
export const percentOfEth = (value: string, percent: number) => fromWei((toWei(value) * BigInt(percent)) / 100n)

export const compareEth = (a: string, b: string) => {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/** "1.19 ETH" */
export const formatEth = (value: string) => `${fromWei(toWei(value))} ETH`
