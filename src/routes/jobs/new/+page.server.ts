// src/routes/jobs/new/+page.server.ts
import { auth } from '$lib/auth'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/jobs/new')
  return {}
}
