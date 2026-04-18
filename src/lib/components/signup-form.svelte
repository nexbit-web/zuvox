<script lang="ts">
  import { cn } from '$lib/utils.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Card from '$lib/components/ui/card/index.js'
  import * as Field from '$lib/components/ui/field/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
    $props()
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
  <Card.Root>
    <Card.Header class="text-center">
      <Card.Title class="text-xl">Створіть свій акаунт</Card.Title>
      <Card.Description
        >Введіть свою електронну адресу нижче, щоб створити обліковий запис</Card.Description
      >
    </Card.Header>
    <Card.Content>
      <form>
        <Field.Group>
          <Field.Field>
            <Field.Label for="name">Повне ім'я</Field.Label>
            <Input id="name" type="text" placeholder="Джон Доу" required />
          </Field.Field>
          <Field.Field>
            <Field.Label for="email">Email</Field.Label>
            <Input
              id="email"
              type="email"
              placeholder="johndoe@gmail.com"
              required
            />
          </Field.Field>
          <Field.Field>
            <Field.Field class="grid grid-cols-2 gap-4">
              <Field.Field>
                <Field.Label for="password">Пароль</Field.Label>
                <Input id="password" type="Пароль" required />
              </Field.Field>
              <Field.Field>
                <Field.Label for="confirm-password"
                  >Повторіть пароль</Field.Label
                >
                <Input id="confirm-password" type="password" required />
              </Field.Field>
            </Field.Field>
            <Field.Description
              >Має бути щонайменше 8 символів.</Field.Description
            >
          </Field.Field>
          <Field.Field>
            <Button type="submit">Створити акаунт</Button>
            <Field.Description class="text-center">
              Вже маєте обліковий запис? <a href="/user/login">Увійти</a>
            </Field.Description>
          </Field.Field>
        </Field.Group>
      </form>
    </Card.Content>
  </Card.Root>
  <Field.Description class="px-6 text-center">
    Натискаючи кнопку «Продовжити», ви погоджуєтеся з нашими <a href="#/">Умови обслуговування</a>
    і <a href="#/">Політика конфіденційності</a>.
  </Field.Description>
</div>
