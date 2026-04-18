<script lang="ts">
  import { Search, X } from 'lucide-svelte'

  let {
    value = $bindable(''),
    matchCount = 0,
    currentIndex = -1,
    onnext,
    onprev,
    onclose,
  }: {
    value: string
    matchCount: number
    currentIndex: number
    onnext: () => void
    onprev: () => void
    onclose: () => void
  } = $props()

  let inputEl = $state<HTMLInputElement | undefined>(undefined)

  export function focus() {
    inputEl?.focus()
  }
</script>

<div
  class="flex items-center gap-2 px-4 py-2 border-b shrink-0"
  style="border-color: var(--border); background-color: var(--bg-header)"
>
  <Search class="w-3.5 h-3.5 shrink-0" style="color: var(--muted-foreground)" />
  <input
    bind:this={inputEl}
    bind:value
    type="text"
    placeholder="Пошук у чаті..."
    class="flex-1 text-sm bg-transparent outline-none"
    style="color: var(--foreground)"
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        e.shiftKey ? onprev() : onnext()
      }
      if (e.key === 'Escape') onclose()
    }}
  />
  {#if matchCount > 0}
    <span class="text-xs shrink-0" style="color: var(--muted-foreground)"
      >{currentIndex + 1}/{matchCount}</span
    >
    <button
      type="button"
      onclick={onprev}
      class="w-6 h-6 flex items-center justify-center rounded cursor-pointer hover:opacity-70"
      style="color: var(--muted-foreground)">↑</button
    >
    <button
      type="button"
      onclick={onnext}
      class="w-6 h-6 flex items-center justify-center rounded cursor-pointer hover:opacity-70"
      style="color: var(--muted-foreground)">↓</button
    >
  {:else if value.trim()}
    <span class="text-xs shrink-0" style="color: var(--muted-foreground)"
      >Не знайдено</span
    >
  {/if}
  <button
    type="button"
    onclick={onclose}
    class="w-6 h-6 flex items-center justify-center rounded cursor-pointer"
    style="color: var(--muted-foreground)"
  >
    <X class="w-3.5 h-3.5" />
  </button>
</div>
