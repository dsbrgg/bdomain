<script>
  import { getContext } from 'svelte';
  import Transition from 'components/Transition.svelte';

  const { test } = getContext('store');
</script>

<Transition>
  <h1>My Blog</h1>
  {test}
</Transition>
