import { json } from '@sveltejs/kit'
import { transporter, SMTP_FROM } from '$lib/auth'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const { email } = await request.json()
  if (!email) return json({ error: 'Email required' }, { status: 400 })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.otpCode.deleteMany({ where: { email } })
  await prisma.otpCode.create({ data: { email, code, expiresAt } })

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Ваш код підтвердження — Zuvox',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Код підтвердження</h2>
        <p style="color: #666; margin-bottom: 24px;">Введіть цей код на сайті щоб підтвердити email</p>
        <div style="background: #f5f6fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #316afb;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">Код дійсний 10 хвилин.</p>
      </div>
    `,
  })

  return json({ ok: true })
}
