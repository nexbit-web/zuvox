// src/routes/jobs/[id]/edit/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw redirect(
      302,
      `/user/login?next=${encodeURIComponent(`/jobs/${params.id}/edit`)}`,
    )
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      subcategory: true,
      tags: true,
      budgetType: true,
      budgetMinCents: true,
      budgetMaxCents: true,
      deliveryDays: true,
      type: true,
      city: true,
      status: true,
      proposalsCount: true,
      clientId: true,
    },
  })

  if (!job) throw error(404, 'Не знайдено')
  if (job.clientId !== session.user.id) throw error(403, 'Не ваша заявка')
  if (job.status !== 'OPEN') {
    throw error(400, 'Можна редагувати тільки відкриті заявки')
  }
  if (job.proposalsCount > 0) {
    throw error(400, 'Не можна редагувати заявку якщо вже є відгуки')
  }

  return { job }
}
