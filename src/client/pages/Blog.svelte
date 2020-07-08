<script>
  import { getContext, onMount } from 'svelte';
  import fetchState from 'api/index.js';
  import Transition from 'components/Transition.svelte';
  import Loading from 'components/Loading.svelte';

  export let location;
  
  let data = {
    init: false,
    posts: undefined
  };

  const store = getContext('initialState');

  const mount = async () => {
    const { client, blog } = $store;

    if (!blog) { 
      const state = 'blog';
      const response = await fetchState({
        client,
        state 
      });

      $store = { ...$store, ...response }; 
    }

    data = { ...$store.blog, init: true };
  };
  
  onMount(mount);
</script>

<Transition>
  {data.posts}
</Transition>
