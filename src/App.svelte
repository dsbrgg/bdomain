<script>
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { Router } from 'svelte-routing';

  import Content from 'containers/content/Content.svelte';
  import Background from 'containers/background/Background.svelte';

  export let url;
  export let test;

  const store = writable({ test });
  
  setContext('store', store);
</script>

<Router url="{url}">
  <Background />
  <Content /> 
</Router>
