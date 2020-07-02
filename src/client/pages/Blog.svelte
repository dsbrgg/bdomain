<script>
  import { getContext, onDestroy } from 'svelte';
  import Transition from 'components/Transition.svelte';

  export let location;
  
  let summary;

  const test = getContext('initialState');
  const unsubscribe = test.subscribe(({ test }) => {
    summary = test;
  });

  onDestroy(() => {
    console.log('unsubscribed blog');
    unsubscribe();
  });
</script>

<Transition>
  <h1>My Blog</h1>
  {summary}
</Transition>
