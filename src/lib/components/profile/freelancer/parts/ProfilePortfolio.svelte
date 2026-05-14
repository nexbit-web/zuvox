<!-- src/lib/components/profile/freelancer/parts/ProfilePortfolio.svelte -->
<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { SvelteSet } from 'svelte/reactivity'
  import { ImageIcon, ExternalLink, Globe, Expand } from 'lucide-svelte'
  import type { ProfilePortfolioItem } from '$lib/components/profile/types'
  import { isSafeHttpUrl, getDisplayHost } from '../utils/safe-url'

  interface Props {
    portfolio: ProfilePortfolioItem[]
    portfolioUrl?: string | null
  }
  let { portfolio, portfolioUrl }: Props = $props()

  // Безпечний http(s) URL — захист від javascript: схеми
  const safePortfolioUrl = $derived(
    isSafeHttpUrl(portfolioUrl) ? portfolioUrl : null,
  )
  const portfolioHost = $derived(
    safePortfolioUrl ? getDisplayHost(safePortfolioUrl) : null,
  )

  // Стан завантаження картинок
  const loaded = new SvelteSet<string>()
  function onLoad(id: string) {
    loaded.add(id)
  }

  // ─── PhotoSwipe — ленива загрузка ───
  let lightbox: {
    loadAndOpen: (index: number) => void
    destroy: () => void
  } | null = null
  let lightboxInit = $state(false)

  async function ensureLightbox() {
    if (lightbox) return lightbox

    if (!document.querySelector('link[data-pswp-css]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href =
        'https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.css'
      link.setAttribute('data-pswp-css', 'true')
      document.head.appendChild(link)
    }

    try {
      const { default: PhotoSwipeLightbox } =
        await import('photoswipe/lightbox')
      const lb = new PhotoSwipeLightbox({
        gallery: '#zunor-portfolio',
        children: 'a.pswp-item',
        pswpModule: () => import('photoswipe'),
        bgOpacity: 0.92,
        showHideAnimationType: 'fade',
        padding: { top: 40, bottom: 40, left: 20, right: 20 },
      })
      lb.init()
      lightbox = lb as unknown as typeof lightbox
      lightboxInit = true
      return lightbox
    } catch (err) {
      console.error('[PhotoSwipe] failed to load:', err)
      return null
    }
  }

  function onGalleryClick(e: MouseEvent) {
    if (lightboxInit) return
    const target = e.target as HTMLElement
    const link = target.closest('a.pswp-item') as HTMLAnchorElement | null
    if (!link) return

    e.preventDefault()
    ensureLightbox().then((lb) => {
      if (!lb) return
      const items = Array.from(
        document.querySelectorAll('#zunor-portfolio a.pswp-item'),
      )
      const index = items.indexOf(link)
      if (index >= 0) lb.loadAndOpen(index)
    })
  }
</script>

{#if portfolio.length > 0 || safePortfolioUrl}
  <section class="py-5" aria-labelledby="portfolio-heading">
    <h2
      id="portfolio-heading"
      class="text-[11px] font-medium tracking-widest uppercase mb-4 flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <ImageIcon class="size-3.5" aria-hidden="true" /> Портфоліо
    </h2>

    {#if safePortfolioUrl && portfolioHost}
      <a
        href={safePortfolioUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="flex items-center justify-between gap-3 px-4 py-3 mb-3 rounded-xl border transition-all hover:opacity-80 group cursor-pointer"
        style="background-color: color-mix(in oklch, var(--primary) 5%, transparent);
               border-color: color-mix(in oklch, var(--primary) 20%, transparent)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="size-9 rounded-full flex items-center justify-center shrink-0"
            style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
          >
            <Globe
              class="size-4"
              style="color: var(--primary)"
              aria-hidden="true"
            />
          </div>
          <div class="min-w-0">
            <p class="text-xs" style="color: var(--muted-foreground)">
              Сайт / портфоліо
            </p>
            <p
              class="text-sm font-medium truncate"
              style="color: var(--foreground)"
            >
              {portfolioHost}
            </p>
          </div>
        </div>
        <ExternalLink
          class="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style="color: var(--primary)"
          aria-hidden="true"
        />
      </a>
    {/if}

    {#if portfolio.length > 0}
      <div
        id="zunor-portfolio"
        class="grid grid-cols-2 sm:grid-cols-3 gap-2"
        onclick={onGalleryClick}
        role="list"
      >
        {#each portfolio as item, idx (item.id)}
          {@const isLoaded = loaded.has(item.id)}
          {@const w = item.width ?? 1600}
          {@const h = item.height ?? 1200}
          <a
            href={item.imageUrl}
            data-pswp-width={w}
            data-pswp-height={h}
            class="pswp-item aspect-video rounded-xl overflow-hidden cursor-zoom-in group relative block"
            aria-label="Відкрити {item.title ?? 'фото'} у повному розмірі"
            style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent)"
            role="listitem"
          >
            {#if !isLoaded}
              <div class="absolute inset-0">
                <Skeleton class="w-full h-full rounded-xl" />
              </div>
            {/if}
            <img
              src={item.imageUrl}
              alt={item.title ?? 'Робота з портфоліо'}
              width={w}
              height={h}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style="opacity: {isLoaded ? 1 : 0}"
              loading={idx < 3 ? 'eager' : 'lazy'}
              fetchpriority={idx === 0 ? 'high' : 'auto'}
              decoding="async"
              onload={() => onLoad(item.id)}
              onerror={() => onLoad(item.id)}
            />

            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
              style="background: linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6))"
              aria-hidden="true"
            >
              <div
                class="size-10 rounded-full flex items-center justify-center"
                style="background-color: rgba(255,255,255,0.15); backdrop-filter: blur(8px)"
              >
                <Expand class="size-4 text-white" />
              </div>
            </div>

            {#if item.title}
              <div
                class="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style="background: linear-gradient(180deg, transparent, rgba(0,0,0,0.75))"
              >
                <span class="text-white text-xs font-medium">{item.title}</span>
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>
{/if}
