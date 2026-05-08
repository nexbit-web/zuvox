// src/lib/email.ts
import { transporter, SMTP_FROM } from './mailer'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string // fallback для клієнтів без HTML (Lynx, accessibility)
}

/**
 * Базова функція відправки email через nodemailer.
 * Використовуємо SMTP_FROM як відправника.
 */
async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  // Базова валідація email-адреси
  const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!EMAIL_RE.test(to)) {
    throw new Error('Invalid email address')
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    text: text ?? stripHtml(html),
  })
}

/**
 * Базовий fallback з HTML → plain text для клієнтів які не рендерять HTML.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Екранує користувацькі дані у HTML — захист від XSS у листах.
 * Якщо ім'я юзера містить теги — вони не виконаються в email-клієнті.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ═══════════════════════════════════════════════════════════
// PUBLIC: Відновлення паролю
// ═══════════════════════════════════════════════════════════

interface SendResetPasswordParams {
  to: string
  name: string
  resetUrl: string
}

export async function sendResetPasswordEmail({
  to,
  name,
  resetUrl,
}: SendResetPasswordParams) {
  // Валідація URL — обережно з URL-injection (хоча better-auth сам генерує URL)
  if (!resetUrl.startsWith('http://') && !resetUrl.startsWith('https://')) {
    throw new Error('Invalid reset URL')
  }

  const safeName = escapeHtml(name || 'друже')
  const safeUrl = escapeHtml(resetUrl)

  const subject = 'Відновлення паролю — Zunor'

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <div style="display: inline-block; width: 48px; height: 48px; background-color: #f0f0f0; border-radius: 12px; text-align: center; line-height: 48px; font-size: 24px;">🔐</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0a0a0a; line-height: 1.3; letter-spacing: -0.02em;">
                Привіт, ${safeName}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 16px 40px 0 40px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
                Ви запросили відновлення паролю для свого акаунту Zunor.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.6; color: #555555;">
                Натисніть кнопку нижче, щоб задати новий пароль:
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 28px 40px 0 40px;">
              <a href="${safeUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0a0a0a; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Відновити пароль
              </a>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888888;">
                Посилання дійсне <strong style="color: #555;">1 годину</strong>. Якщо ви не запитували відновлення — просто проігноруйте цей лист, ваш пароль не зміниться.
              </p>
            </td>
          </tr>

          <!-- Plain link fallback -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <hr style="border: none; border-top: 1px solid #ececec; margin: 0;">
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 40px 0 40px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #aaaaaa;">
                Кнопка не працює? Скопіюйте це посилання у браузер:
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; line-height: 1.5; color: #555555; word-break: break-all;">
                ${safeUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
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

  // Plain text fallback для клієнтів без HTML
  const text = `Привіт, ${name}!

Ви запросили відновлення паролю для свого акаунту Zunor.

Перейдіть за посиланням, щоб задати новий пароль:
${resetUrl}

Посилання дійсне 1 годину. Якщо ви не запитували відновлення — просто проігноруйте цей лист.

—
Zunor`

  await sendEmail({ to, subject, html, text })
}

// ═══════════════════════════════════════════════════════════
// Можна додати інші email-шаблони сюди:
// - sendVerificationEmail (підтвердження пошти при реєстрації)
// - sendNotificationEmail
// - sendOrderConfirmationEmail
// тощо
// ═══════════════════════════════════════════════════════════
