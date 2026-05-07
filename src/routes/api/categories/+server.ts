// src/routes/api/categories/+server.ts

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/prisma'

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        status: 'ACTIVE',
      },

      orderBy: {
        sortOrder: 'asc',
      },

      select: {
        slug: true,
        name: true,
        icon: true,
        description: true,

        skills: {
          orderBy: {
            sortOrder: 'asc',
          },

          select: {
            slug: true,
            name: true,
          },
        },

        subcategories: {
          where: {
            status: 'ACTIVE',
          },

          orderBy: {
            sortOrder: 'asc',
          },

          select: {
            slug: true,
            name: true,

            services: {
              where: {
                status: 'ACTIVE',
              },

              orderBy: {
                sortOrder: 'asc',
              },

              select: {
                slug: true,
                name: true,
                avgPriceCents: true,
              },
            },
          },
        },
      },
    })

    const shaped = categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      description: category.description,

      skills: category.skills.map((skill) => ({
        slug: skill.slug,
        name: skill.name,
      })),

      subs: category.subcategories.map((subcategory) => ({
        slug: subcategory.slug,
        name: subcategory.name,

        items: subcategory.services.map((service) => ({
          slug: service.slug,
          name: service.name,
          avgPriceCents: service.avgPriceCents,
        })),
      })),
    }))

    setHeaders({
      'cache-control':
        'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
    })

    return json({
      categories: shaped,
    })
  } catch (err) {
    console.error('GET /api/categories failed:', err)

    throw error(500, {
      message: 'Не вдалося завантажити категорії',
    })
  }
}
