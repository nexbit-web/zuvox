import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  BETTER_AUTH_URL,
  BETTER_AUTH_SECRET,
  DATABASE_URL,
} from '$env/static/private'
import { dev } from '$app/environment'
import { sendResetPasswordEmail } from './email'

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    // ─── Верифікація email лише на продакшені ───
    // На dev — вимкнено, щоб швидко тестувати реєстрацію без OTP-flow.
    // На прод — вимагаємо верифікацію (наш OTP-flow має позначати юзера як verified).
    requireEmailVerification: !dev,

    sendResetPassword: async ({ user, url }) => {
      console.log('🔵 sendResetPassword викликано:', { email: user.email, url })
      try {
        await sendResetPasswordEmail({
          to: user.email,
          name: user.name,
          resetUrl: url,
        })
        console.log('✅ Лист відправлено на:', user.email)
      } catch (err) {
        console.error('❌ Помилка відправки:', err)
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 година
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'CLIENT',
        input: true,
      },
      city: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
