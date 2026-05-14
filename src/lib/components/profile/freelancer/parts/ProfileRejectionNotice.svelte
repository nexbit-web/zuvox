<!-- src/lib/components/profile/freelancer/parts/ProfileRejectionNotice.svelte -->
<script lang="ts">
  import { ShieldAlert } from 'lucide-svelte'

  interface Props {
    reason: string
  }
  let { reason }: Props = $props()
</script>

<aside
  class="p-4 rounded-xl mb-5"
  style="background-color: color-mix(in oklch, var(--destructive) 8%, transparent);
         border: 1px solid color-mix(in oklch, var(--destructive) 20%, transparent)"
  role="alert"
>
  <p
    class="text-sm font-medium flex items-center gap-1.5 mb-1"
    style="color: var(--destructive)"
  >
    <ShieldAlert class="size-4" aria-hidden="true" />
    Профіль відхилено модератором
  </p>
  <p
    class="text-sm leading-relaxed"
    style="color: var(--muted-foreground); overflow-wrap: anywhere"
  >
    {reason}
  </p>
</aside>
