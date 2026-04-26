<!-- src/lib/components/header/index.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import CatalogButton from './catalog-button.svelte'
  import CatalogMenu from './catalog-menu.svelte'
  import SearchBar from './search-bar.svelte'
  import UserMenu from './user-menu.svelte'
  import MobileNav from './mobile-nav.svelte'
  import Logo from './logo.svelte'

  let visible = $state(true)
  let catalogOpen = $state(false)
  let searchOpen = $state(false)
  let lastScrollY = 0
  let scrollTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    document.body.style.overflow = catalogOpen ? 'hidden' : ''
  })

  /**
   * Client-side навігація через goto().
   * НЕ використовуйте window.location.href — це викликає full page reload
   * і вбиває реактивність SvelteKit.
   */
  function navigate(url: string) {
    catalogOpen = false
    searchOpen = false
    goto(url)
  }

  onMount(() => {
    lastScrollY = window.scrollY

    function handleScroll() {
      if (scrollTimer) return
      scrollTimer = setTimeout(() => {
        scrollTimer = null
        const currentY = window.scrollY
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

{#if catalogOpen || searchOpen}
  <button
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-40 cursor-default w-full border-none p-0"
    style="background-color: rgba(0,0,0,0.5)"
    onclick={() => {
      catalogOpen = false
      searchOpen = false
    }}
    aria-label="Закрити"
  ></button>
{/if}

<div
  class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 will-change-transform"
  class:-translate-y-full={!visible}
>
  <div class="relative">
    <header
      style="background-color: #000;
             border-bottom: 1px solid rgba(255,255,255,0.08);"
    >
      <div
        class="max-w-7xl mx-auto h-[72px] px-4 sm:px-6 flex items-center gap-3 sm:gap-5"
      >
        <div class="hidden md:flex items-center gap-4 shrink-0">
          <Logo />
          <div data-catalog>
            <CatalogButton bind:open={catalogOpen} />
          </div>
        </div>

        <div class="md:hidden shrink-0">
          <Logo />
        </div>

        <div class="flex-1 min-w-0">
          <SearchBar onnavigate={navigate} bind:isOpen={searchOpen} />
        </div>

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

<MobileNav
  onnavigate={navigate}
  oncatalog={() => {
    catalogOpen = !catalogOpen
  }}
  hasNotifications={true}
/>

<div class="h-[33px]"></div>
