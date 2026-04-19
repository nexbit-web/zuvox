<!-- src/lib/components/home/how-it-works.svelte -->
<script lang="ts">
  import { Search, Shield, Zap } from 'lucide-svelte'

  const steps = [
    {
      icon: Search,
      step: '01',
      title: 'Створіть замовлення ',
      desc: 'Детально опишіть, що і коли потрібно зробити',
    },
    {
      icon: Shield,
      step: '02',
      title: 'Фахівець отримає завдання',
      desc: 'І зв‘яжеться з вами для обговорення деталей',
    },
    {
      icon: Zap,
      step: '03',
      title: 'Закрийте замовлення',
      desc: 'Залиште відгук та оцінку за виконану роботу',
    },
  ]
</script>

<section class="py-20" style="background-color: var(--bg-header)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <!-- Заголовок -->
    <div class="text-center mb-14">
      <p
        class="text-xs font-semibold uppercase tracking-widest mb-2"
        style="color: var(--primary)"
      >
        Просто і зрозуміло
      </p>
      <h2 class="text-3xl font-bold" style="color: var(--foreground)">
        Як це працює
      </h2>
    </div>

    <!-- Кроки -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      <!-- Лінія між кроками на десктопі -->
      <div
        class="hidden md:block absolute top-10 left-1/3 right-1/3 h-px"
        style="background: linear-gradient(to right, color-mix(in oklch, var(--primary) 30%, transparent), color-mix(in oklch, var(--primary) 30%, transparent))"
      ></div>

      {#each steps as step, i}
        <div
          class="relative flex flex-col items-center text-center p-8 rounded-2xl border"
          style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
        >
          <!-- Номер кроку -->
          <div
            class="absolute top-4 right-4 text-[11px] font-bold tracking-wider"
            style="color: var(--primary); opacity: 0.5"
          >
            {step.step}
          </div>

          <!-- Іконка -->
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
          >
            <step.icon class="w-6 h-6" style="color: var(--primary)" />
          </div>

          <!-- Текст -->
          <h3
            class="text-base font-semibold mb-2"
            style="color: var(--foreground)"
          >
            {step.title}
          </h3>
          <p
            class="text-sm leading-relaxed"
            style="color: var(--muted-foreground)"
          >
            {step.desc}
          </p>

          <!-- З'єднувальна стрілка між кроками на мобілі -->
          {#if i < steps.length - 1}
            <div
              class="md:hidden mt-6 text-xl"
              style="color: var(--primary); opacity: 0.3"
            >
              ↓
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>
