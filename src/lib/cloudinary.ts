// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '$env/static/private'

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

/**
 * Генерує підпис для безпечного завантаження з клієнта.
 * Клієнт отримує timestamp + signature, потім шле файл напряму в Cloudinary.
 */
export function signUploadParams(params: Record<string, string | number>) {
  const timestamp = Math.round(Date.now() / 1000)
  const toSign = { ...params, timestamp }

  const signature = cloudinary.utils.api_sign_request(
    toSign,
    CLOUDINARY_API_SECRET,
  )

  return {
    timestamp,
    signature,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
  }
}