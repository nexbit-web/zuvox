<!-- src/lib/components/profile/freelancer/parts/ProfileSkills.svelte -->
<script lang="ts">
  import { Sparkles } from 'lucide-svelte'
  import type { ProfileSkill } from '$lib/components/profile/types'

  interface Props {
    skills: ProfileSkill[]
  }
  let { skills }: Props = $props()
</script>

{#if skills.length > 0}
  <section class="py-5" aria-labelledby="skills-heading">
    <h2
      id="skills-heading"
      class="text-[11px] font-medium tracking-widest uppercase mb-3 flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <Sparkles class="size-3.5" aria-hidden="true" /> Навички
    </h2>
    <ul class="flex flex-wrap gap-1.5 list-none p-0 m-0">
      {#each skills as skill (skill.slug)}
        <li
          class="text-xs px-3 py-1.5 rounded-full border"
          style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
                 color: var(--foreground)"
        >
          {skill.name}
        </li>
      {/each}
    </ul>
  </section>
{/if}
