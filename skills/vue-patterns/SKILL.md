---
name: vue-patterns
description: Use when building or reviewing Vue 3 components, Composition API composables, reactivity, state ownership, or accessible templates.
---

# Vue Patterns

## When to Use

Use for Vue 3 SFCs, `<script setup>`, composables, Pinia or other stores, and component tests. First inspect the installed `vue` version and project conventions; Vue 3.5 reactive props destructuring is not a safe assumption for older projects.

## How It Works

- Keep state ownership explicit: local `ref`/`reactive` for local state, props and emits for parent-child flow, and Pinia (or the project’s chosen store) for shared domain state. This skill does not require Pinia.
- Prefer `ref` when a value may be replaced; `reactive` is useful for an object whose identity stays stable. `shallowRef` tracks replacement, not nested mutation; replace `.value` or call `triggerRef` when that is intentional.
- Props are parent-owned. A child must not silently replace a prop. Nested mutation of an object prop is technically possible because it is shared by reference, but use it only when that ownership is deliberate; otherwise emit an event or use `v-model`.
- Pass a prop to a composable as `toRef`, `toValue`, or a getter. In Vue 3.5, destructured props stay reactive, but watchers/composables still need `() => value`; in Vue 3.4 and earlier use `props.foo` or `toRef`.
- Composables return reactive values, scope effects per instance, and clean timers, listeners, subscriptions, and stale requests with watcher cleanup or `onUnmounted`.
- Render untrusted text with interpolation, not `v-html`. Use semantic elements, labels, keyboard interaction, visible focus, and an accessible name for controls.
- Test observable behavior and emitted events. Avoid tests that only assert implementation details.

## Examples

```ts
const props = defineProps<{ routeId: string }>()
const routeId = toRef(props, 'routeId')

watch(routeId, async (id, _old, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  await loadItem(id, { signal: controller.signal })
}, { immediate: true })
```

For a `shallowRef` holding a large immutable snapshot, update with `snapshot.value = nextSnapshot`; do not expect `snapshot.value.items.push(...)` to notify consumers. A meaningful mutation of owned `reactive` state is fine when its owner and invariant are clear.

## References

- https://vuejs.org/guide/essentials/reactivity-fundamentals.html
- https://vuejs.org/guide/components/props.html
