import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY env var is not set')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  return key
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-delimited hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getKey()
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error('Invalid encrypted value format')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
