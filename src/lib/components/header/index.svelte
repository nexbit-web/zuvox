<!-- index.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import CatalogButton from './catalog-button.svelte'
  import SearchBar from './search-bar.svelte'
  import CatalogMenu from './catalog-menu.svelte'
  import UserMenu from './user-menu.svelte'
  import MobileNav from './mobile-nav.svelte'

  let scrolled = $state(false)
  let visible = $state(true)
  let catalogOpen = $state(false)
  let searchOpen = $state(false)
  let lastScrollY = 0
  let scrollTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    document.body.style.overflow = catalogOpen ? 'hidden' : ''
  })

  function navigate(url: string) {
    catalogOpen = false
    searchOpen = false
    window.location.href = url
  }

  onMount(() => {
    lastScrollY = window.scrollY

    function handleScroll() {
      if (scrollTimer) return
      scrollTimer = setTimeout(() => {
        scrollTimer = null
        const currentY = window.scrollY
        scrolled = currentY > 10
        if (currentY < 10) {
          visible = true
        } else if (currentY > lastScrollY + 8) {
          visible = false
          catalogOpen = false
        } else if (currentY < lastScrollY - 8) {
          visible = true
        }
        lastScrollY = currentY
      }, 50)
    }

    function handleClickOutside(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t.closest('[data-catalog]')) catalogOpen = false
      if (!t.closest('[data-search]')) searchOpen = false
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        catalogOpen = false
        searchOpen = false
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
      if (scrollTimer) clearTimeout(scrollTimer)
    }
  })
</script>

<!-- Overlay -->
{#if catalogOpen || searchOpen}
  <button
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 bg-black/50 z-40 cursor-default w-full border-none p-0"
    onclick={() => {
      catalogOpen = false
      searchOpen = false
    }}
    aria-label="Закрити"
  ></button>
{/if}

<div
  class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 will-change-transform
    {visible ? 'translate-y-0' : '-translate-y-full'}"
>
  <div class="relative">
    <header
      class="transition-colors duration-300
    {scrolled ? 'backdrop-blur-md shadow-sm' : ''}"
      style="background-color: var(--bg-header)"
    >
      <div
        class="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex md:grid md:grid-cols-[auto_1fr_auto] items-center gap-4"
      >
        <!-- Ліва частина — ховається на мобілі -->
        <div class="hidden md:flex items-center gap-3 shrink-0">
          <div data-catalog>
            <CatalogButton bind:open={catalogOpen} />
          </div>
          <!-- Місце для лого — вставиш сам -->
          <a href="/" class="font-bold text-2xl tracking-tight shrink-0">
            <svg
              width="120"
              height="22"
              viewBox="0 0 279 55"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.45843e-05 53.0455V43.5341L24.2728 13.9773V13.6364H0.852318V0.681833H44.1478V11.1137L21.6478 39.75V40.0909H44.966V53.0455H4.45843e-05ZM89.5228 30.4432V0.681833H106.159V53.0455H90.2728V43.2955H89.7273C88.5682 46.5 86.591 49.0455 83.7955 50.9318C81.0228 52.7955 77.6705 53.7273 73.7387 53.7273C70.1705 53.7273 67.0341 52.9091 64.3296 51.2727C61.625 49.6364 59.5228 47.3523 58.0228 44.4205C56.5228 41.4659 55.7614 38.0114 55.7387 34.0568V0.681833H72.4091V30.7841C72.4319 33.625 73.1819 35.8637 74.6591 37.5C76.1364 39.1364 78.1478 39.9546 80.6932 39.9546C82.3523 39.9546 83.841 39.5909 85.1591 38.8637C86.5 38.1137 87.5569 37.0341 88.3296 35.625C89.125 34.1932 89.5228 32.4659 89.5228 30.4432ZM167.565 0.681833L149.599 53.0455H130.509L112.577 0.681833H130.134L139.781 36.75H140.327L150.009 0.681833H167.565ZM196.713 54.0341C191.213 54.0341 186.486 52.9091 182.531 50.6591C178.599 48.3864 175.565 45.2273 173.429 41.1818C171.315 37.1137 170.259 32.3977 170.259 27.0341C170.259 21.6477 171.315 16.9318 173.429 12.8864C175.565 8.8182 178.599 5.65911 182.531 3.4091C186.486 1.13638 191.213 1.71661e-05 196.713 1.71661e-05C202.213 1.71661e-05 206.929 1.13638 210.861 3.4091C214.815 5.65911 217.849 8.8182 219.963 12.8864C222.099 16.9318 223.168 21.6477 223.168 27.0341C223.168 32.3977 222.099 37.1137 219.963 41.1818C217.849 45.2273 214.815 48.3864 210.861 50.6591C206.929 52.9091 202.213 54.0341 196.713 54.0341ZM196.815 41.4546C198.815 41.4546 200.509 40.8409 201.895 39.6137C203.281 38.3864 204.338 36.6818 205.065 34.5C205.815 32.3182 206.19 29.7955 206.19 26.9318C206.19 24.0227 205.815 21.4773 205.065 19.2955C204.338 17.1137 203.281 15.4091 201.895 14.1818C200.509 12.9546 198.815 12.3409 196.815 12.3409C194.747 12.3409 192.997 12.9546 191.565 14.1818C190.156 15.4091 189.077 17.1137 188.327 19.2955C187.599 21.4773 187.236 24.0227 187.236 26.9318C187.236 29.7955 187.599 32.3182 188.327 34.5C189.077 36.6818 190.156 38.3864 191.565 39.6137C192.997 40.8409 194.747 41.4546 196.815 41.4546ZM244.014 0.681833L252.639 17.9318L261.571 0.681833H278.378L263.753 26.8637L278.923 53.0455H262.253L252.639 35.6591L243.264 53.0455H226.355L241.56 26.8637L227.105 0.681833H244.014Z"
                fill="var(--primary)"
              />
            </svg>
          </a>
        </div>

        <!-- Пошук — на всю ширину на мобілі -->
        <SearchBar onnavigate={navigate} bind:isOpen={searchOpen} />

        <!-- UserMenu — ховається на мобілі -->
        <div class="hidden md:flex items-center shrink-0">
          <UserMenu onnavigate={navigate} />
        </div>
      </div>
    </header>

    {#if catalogOpen}
      <div data-catalog class="absolute top-full left-0 z-50">
        <CatalogMenu onnavigate={navigate} />
      </div>
    {/if}
  </div>
</div>

<!-- Нижній мобільний навбар -->
<MobileNav
  onnavigate={navigate}
  oncatalog={() => {
    catalogOpen = !catalogOpen
  }}
  hasNotifications={true}
/>

<div class="hidden md:block h-8"></div>

<!-- Відступ під хедер на десктопі -->

<!-- <svg
  width="120"
  height="22"
  viewBox="0 0 279 55"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M4.45843e-05 53.0455V43.5341L24.2728 13.9773V13.6364H0.852318V0.681833H44.1478V11.1137L21.6478 39.75V40.0909H44.966V53.0455H4.45843e-05ZM89.5228 30.4432V0.681833H106.159V53.0455H90.2728V43.2955H89.7273C88.5682 46.5 86.591 49.0455 83.7955 50.9318C81.0228 52.7955 77.6705 53.7273 73.7387 53.7273C70.1705 53.7273 67.0341 52.9091 64.3296 51.2727C61.625 49.6364 59.5228 47.3523 58.0228 44.4205C56.5228 41.4659 55.7614 38.0114 55.7387 34.0568V0.681833H72.4091V30.7841C72.4319 33.625 73.1819 35.8637 74.6591 37.5C76.1364 39.1364 78.1478 39.9546 80.6932 39.9546C82.3523 39.9546 83.841 39.5909 85.1591 38.8637C86.5 38.1137 87.5569 37.0341 88.3296 35.625C89.125 34.1932 89.5228 32.4659 89.5228 30.4432ZM167.565 0.681833L149.599 53.0455H130.509L112.577 0.681833H130.134L139.781 36.75H140.327L150.009 0.681833H167.565ZM196.713 54.0341C191.213 54.0341 186.486 52.9091 182.531 50.6591C178.599 48.3864 175.565 45.2273 173.429 41.1818C171.315 37.1137 170.259 32.3977 170.259 27.0341C170.259 21.6477 171.315 16.9318 173.429 12.8864C175.565 8.8182 178.599 5.65911 182.531 3.4091C186.486 1.13638 191.213 1.71661e-05 196.713 1.71661e-05C202.213 1.71661e-05 206.929 1.13638 210.861 3.4091C214.815 5.65911 217.849 8.8182 219.963 12.8864C222.099 16.9318 223.168 21.6477 223.168 27.0341C223.168 32.3977 222.099 37.1137 219.963 41.1818C217.849 45.2273 214.815 48.3864 210.861 50.6591C206.929 52.9091 202.213 54.0341 196.713 54.0341ZM196.815 41.4546C198.815 41.4546 200.509 40.8409 201.895 39.6137C203.281 38.3864 204.338 36.6818 205.065 34.5C205.815 32.3182 206.19 29.7955 206.19 26.9318C206.19 24.0227 205.815 21.4773 205.065 19.2955C204.338 17.1137 203.281 15.4091 201.895 14.1818C200.509 12.9546 198.815 12.3409 196.815 12.3409C194.747 12.3409 192.997 12.9546 191.565 14.1818C190.156 15.4091 189.077 17.1137 188.327 19.2955C187.599 21.4773 187.236 24.0227 187.236 26.9318C187.236 29.7955 187.599 32.3182 188.327 34.5C189.077 36.6818 190.156 38.3864 191.565 39.6137C192.997 40.8409 194.747 41.4546 196.815 41.4546ZM244.014 0.681833L252.639 17.9318L261.571 0.681833H278.378L263.753 26.8637L278.923 53.0455H262.253L252.639 35.6591L243.264 53.0455H226.355L241.56 26.8637L227.105 0.681833H244.014Z"
    fill="var(--primary)"
  />
</svg> -->
