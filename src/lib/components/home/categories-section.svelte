<!-- src/lib/components/home/categories-section.svelte -->
<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { onMount } from 'svelte'

  const mainCategories = [
    { name: 'Перевезення\nі доставка', img: '/test.png' },
    { name: 'Ремонт\nі оздоблення', img: '/test.png' },
    { name: 'Ремонт\nтехніки', img: '/test.png' },
    { name: 'Уборка', img: '/test.png' },
    { name: 'Обладнання,\nвиробництво', img: '/test.png' },
    { name: 'Краса', img: '/test.png' },
    { name: 'Будівництво', img: '/test.png' },
    { name: 'Ділові\nпослуги', img: '/test.png' },
    { name: 'Навчання,\nкурси', img: '/test.png' },
    { name: 'Встановлення\nтехніки', img: '/test.png' },
  ]

  let loaded = $state(false)
  onMount(() => {
    setTimeout(() => (loaded = true), 600)
  })

  const cardBase = `background-color: var(--bg-header); border-color: color-mix(in oklch, var(--foreground) 8%, transparent); height: 110px;`
  const cardHover = `background-color: var(--bg-header); border-color: color-mix(in oklch, var(--primary) 30%, transparent); height: 110px;`
</script>

<section class="py-16" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold" style="color: var(--foreground)">
        Послуги
      </h2>
    </div>

    {#if !loaded}
      <!-- Skeleton десктоп -->
      <div class="hidden lg:grid grid-cols-5 gap-3 mb-3">
        {#each Array(5) as _}
          <Skeleton class="rounded-2xl" style="height: 110px" />
        {/each}
      </div>
      <div class="hidden lg:grid grid-cols-6 gap-3">
        {#each Array(6) as _}
          <Skeleton class="rounded-2xl" style="height: 110px" />
        {/each}
      </div>

      <!-- Skeleton мобіль -->
      <div class="grid grid-cols-2 gap-3 lg:hidden">
        {#each Array(10) as _}
          <Skeleton class="rounded-2xl" style="height: 110px" />
        {/each}
      </div>
    {:else}
      <!-- МОБІЛЬ: один grid 2 колонки -->
      <div class="grid grid-cols-2 gap-3 lg:hidden">
        {#each mainCategories as cat}
          <a
            href="/gigs?category={encodeURIComponent(
              cat.name.replace('\n', ' '),
            )}"
            class="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200"
            style={cardBase}
            onmouseenter={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardHover)}
            onmouseleave={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardBase)}
          >
            <p
              class="text-[12px] font-semibold px-3 pt-3 leading-snug whitespace-pre-line"
              style="color: var(--foreground)"
            >
              {cat.name}
            </p>
            <img
              src={cat.img}
              alt={cat.name}
              loading="lazy"
              class="absolute bottom-0 right-0 w-20 h-20 object-contain transition-transform duration-300 group-hover:scale-105"
              style="transform-origin: bottom right"
            />
          </a>
        {/each}

        <!-- Всі категорії -->
        <a
          href="/services"
          class="flex flex-col justify-end rounded-2xl border cursor-pointer transition-all duration-200 p-3"
          style={cardBase}
          onmouseenter={(e) =>
            ((e.currentTarget as HTMLElement).style.cssText = cardHover)}
          onmouseleave={(e) =>
            ((e.currentTarget as HTMLElement).style.cssText = cardBase)}
        >
          <p
            class="text-[13px] font-semibold leading-tight"
            style="color: var(--foreground)"
          >
            Всі<br />категорії →
          </p>
        </a>
      </div>

      <!-- ДЕСКТОП: рядок 1 — 5 карток -->
      <div class="hidden lg:grid grid-cols-5 gap-3 mb-3">
        {#each mainCategories.slice(0, 5) as cat}
          <a
            href="/gigs?category={encodeURIComponent(
              cat.name.replace('\n', ' '),
            )}"
            class="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
            style={cardBase}
            onmouseenter={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardHover)}
            onmouseleave={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardBase)}
          >
            <p
              class="text-[13px] font-semibold px-4 pt-4 leading-snug whitespace-pre-line"
              style="color: var(--foreground)"
            >
              {cat.name}
            </p>
            <img
              src={cat.img}
              alt={cat.name}
              loading="lazy"
              class="absolute bottom-0 right-0 w-24 h-24 object-contain transition-transform duration-300 group-hover:scale-105"
              style="transform-origin: bottom right"
            />
          </a>
        {/each}
      </div>

      <!-- ДЕСКТОП: рядок 2 — 5 карток + всі категорії -->
      <div class="hidden lg:grid grid-cols-6 gap-3">
        {#each mainCategories.slice(5) as cat}
          <a
            href="/gigs?category={encodeURIComponent(
              cat.name.replace('\n', ' '),
            )}"
            class="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md"
            style={cardBase}
            onmouseenter={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardHover)}
            onmouseleave={(e) =>
              ((e.currentTarget as HTMLElement).style.cssText = cardBase)}
          >
            <p
              class="text-[13px] font-semibold px-4 pt-4 leading-snug whitespace-pre-line"
              style="color: var(--foreground)"
            >
              {cat.name}
            </p>
            <img
              src={cat.img}
              alt={cat.name}
              loading="lazy"
              class="absolute bottom-0 right-0 w-24 h-24 object-contain transition-transform duration-300 group-hover:scale-105"
              style="transform-origin: bottom right"
            />
          </a>
        {/each}

        <!-- Всі категорії -->
        <a
          href="/services"
          class="group flex flex-col justify-end rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md p-4"
          style={cardBase}
          onmouseenter={(e) =>
            ((e.currentTarget as HTMLElement).style.cssText = cardHover)}
          onmouseleave={(e) =>
            ((e.currentTarget as HTMLElement).style.cssText = cardBase)}
        >
          <p
            class="text-[13px] font-semibold leading-tight"
            style="color: var(--foreground)"
          >
            Всі<br />категорії →
          </p>
        </a>
      </div>
    {/if}
  </div>
</section>
