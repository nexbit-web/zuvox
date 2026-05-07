// src/lib/stores/categories.ts
import { writable, type Readable, derived } from 'svelte/store'
import { browser } from '$app/environment'

export interface CategorySub {
  slug: string
  name: string
}

export interface Category {
  slug: string
  name: string
  icon: string | null
  description: string | null
  subs: CategorySub[]
}

interface CategoriesState {
  data: Category[]
  loading: boolean
  loaded: boolean
  error: string | null
}

const initial: CategoriesState = {
  data: [],
  loading: false,
  loaded: false,
  error: null,
}

const _store = writable<CategoriesState>(initial)

let loadPromise: Promise<void> | null = null

/**
 * Завантажує категорії один раз за весь час життя сторінки.
 * Якщо вже завантажено — нічого не робить.
 * Якщо завантаження в процесі — повертає той самий promise.
 */
export function loadCategories(): Promise<void> {
  if (!browser) return Promise.resolve()

  // Вже маємо дані → нічого не робимо
  let state: CategoriesState = initial
  _store.subscribe((s) => (state = s))()
  if (state.loaded) return Promise.resolve()

  // Йде завантаження → повертаємо існуючий promise
  if (loadPromise) return loadPromise

  // Стартуємо
  _store.update((s) => ({ ...s, loading: true, error: null }))

  loadPromise = (async () => {
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      const data: Category[] = json.categories ?? []

      _store.set({
        data,
        loading: false,
        loaded: true,
        error: null,
      })
    } catch (err) {
      console.error('[categories store] load failed:', err)
      _store.update((s) => ({
        ...s,
        loading: false,
        error: 'Не вдалося завантажити категорії',
      }))
      // Дозволяємо спробувати ще раз
      loadPromise = null
    }
  })()

  return loadPromise
}

/**
 * Перезавантажити категорії (наприклад, після помилки).
 */
export function reloadCategories(): Promise<void> {
  loadPromise = null
  _store.set(initial)
  return loadCategories()
}

export const categories: Readable<CategoriesState> = {
  subscribe: _store.subscribe,
}

/**
 * Зручний derived: тільки масив категорій.
 */
export const categoriesData = derived(_store, ($s) => $s.data)
