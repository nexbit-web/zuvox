// src/routes/api/otp/send/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'
import { SMTP_FROM, transporter } from '$lib/mailer'

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const OTP_EXPIRES_MIN = 10
const RATE_LIMIT_WINDOW_MIN = 1 // не більше N запитів за хвилину
const RATE_LIMIT_MAX = 3

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  let email: string
  try {
    const body = await request.json()
    email = String(body?.email ?? '')
      .trim()
      .toLowerCase()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ─── Валідація email ───
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: 'Невірний формат email' }, { status: 400 })
  }

  // ─── Rate limit per email ───
  // Не більше RATE_LIMIT_MAX запитів за RATE_LIMIT_WINDOW_MIN хвилин для одного email.
  // Захист від спаму на чужий email і від брутфорсу.
  const sinceDate = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000)
  const recentCount = await prisma.otpCode.count({
    where: {
      email,
      createdAt: { gte: sinceDate },
    },
  })

  if (recentCount >= RATE_LIMIT_MAX) {
    // НЕ розкриваємо точну причину — для атакуючого виглядає так само як успіх
    return json(
      { error: 'Забагато спроб. Зачекайте хвилину.' },
      { status: 429 },
    )
  }

  // ─── Генерація коду ───
  // Math.random() НЕ криптографічно стійкий, для OTP краще crypto.
  const code = String(generateSecureOtp())
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000)

  // ─── Транзакція: видалити старі коди + створити новий ───
  await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { email } }),
    prisma.otpCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    }),
  ])

  // ─── Відправка листа ───
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Ваш код підтвердження — Zunor',
      html: buildOtpEmailHtml(code),
      text: `Ваш код підтвердження Zunor: ${code}\n\nКод дійсний ${OTP_EXPIRES_MIN} хвилин. Якщо ви не запитували код — проігноруйте цей лист.`,
    })
  } catch (err) {
    console.error('[otp/send] mail failed:', err)
    // Видаляємо OTP — раз лист не пішов, юзер не зможе ним скористатись
    await prisma.otpCode.deleteMany({ where: { email, code } })
    return json(
      { error: 'Не вдалось відправити код. Спробуйте пізніше.' },
      { status: 500 },
    )
  }

  return json({ ok: true })
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

/**
 * Криптографічно стійкий 6-значний OTP.
 * Math.random() непередбачувано на старих системах — використовуємо crypto.
 */
function generateSecureOtp(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  // Беремо число у діапазоні [100000, 999999]
  return 100000 + (buf[0] % 900000)
}

/**
 * HTML-шаблон листа з кодом.
 * Inline-стилі — обов'язково для email-клієнтів (Gmail, Outlook).
 */
function buildOtpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Код підтвердження — Zunor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <div style="display: inline-block; width: 48px; height: 48px; background-color: #f0f0f0; border-radius: 12px; text-align: center; line-height: 48px; font-size: 24px;">✉️</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0a0a0a; line-height: 1.3; letter-spacing: -0.02em;">
                Код підтвердження
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 40px 0 40px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
                Введіть цей код на сайті, щоб підтвердити email:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <div style="background-color: #f5f6fa; border-radius: 12px; padding: 24px; text-align: center;">
                <span style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #0a0a0a; font-family: 'SF Mono', Monaco, Consolas, monospace;">${code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888888;">
                Код дійсний <strong style="color: #555;">${OTP_EXPIRES_MIN} хвилин</strong>. Якщо ви не запитували код — просто проігноруйте цей лист.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
              <hr style="border: none; border-top: 1px solid #ececec; margin: 0 0 16px 0;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #aaaaaa; text-align: center;">
                Цей лист надіслано автоматично, відповідати на нього не потрібно.<br>
                © Zunor — онлайн-сервіс замовлення послуг
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
