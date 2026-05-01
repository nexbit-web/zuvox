<!-- src/lib/components/orders/order-events-timeline.svelte -->
<script lang="ts">
  import { EVENT_LABELS, formatDate } from '$lib/orders/labels'

  interface Props {
    events: Array<{
      id: string
      type: string
      actorId: string | null
      payload: any
      createdAt: string
    }>
  }

  let { events }: Props = $props()
</script>

<div class="space-y-3">
  {#each events as event, i (event.id)}
    {@const meta = EVENT_LABELS[event.type] ?? { icon: '•', text: event.type }}
    <div class="flex gap-3">
      <div class="relative flex flex-col items-center">
        <div
          class="size-8 shrink-0 rounded-full flex items-center justify-center text-sm"
          style="background-color: var(--muted)"
        >
          {meta.icon}
        </div>
        {#if i < events.length - 1}
          <div
            class="absolute top-8 bottom-[-12px] w-px"
            style="background-color: var(--border)"
          ></div>
        {/if}
      </div>
      <div class="flex-1 min-w-0 pb-3">
        <p class="text-sm font-medium" style="color: var(--foreground)">
          {meta.text}
        </p>
        <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">
          {formatDate(event.createdAt)}
        </p>
        {#if event.payload?.reason}
          <p class="text-xs mt-1 italic" style="color: var(--muted-foreground)">
            «{event.payload.reason}»
          </p>
        {/if}
      </div>
    </div>
  {/each}
</div>
