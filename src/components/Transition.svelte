<script>
  import { fade } from 'svelte/transition';
</script>

<style>
  div {
   height: 100%; 
  }
</style>

<div in:fade="{{ duration: 1000 }}">
  <slot />
</div>
