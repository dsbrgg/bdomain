<script>
  import { getContext, onMount } from 'svelte';
  import fetchState from 'api/index.js';
  import Transition from 'components/Transition.svelte';
  import Loading from 'components/Loading.svelte';

  export let location;

  let data = {
    init: false,
    greetings: undefined,
    text: undefined
  };

  const store = getContext('initialState');

  const mount = async () => {
    const { client, home } = $store;

    if (!home) { 
      const state = '';
      const response = await fetchState({
        client,
        state 
      });

      $store = { ...$store, ...response }; 
    }

    data = { ...$store.home, init: true };
  };
  
  onMount(mount);
</script>

<style>
  .home-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .home-title {
    margin-bottom: 3em;
  }

  .home-text {
    margin-right: 12em;
    margin-left: 12em;
  }
</style>

<Transition>
  <div class="home-container">
    <Loading condition={data.init}>
      <h1 class="home-title">{data.greetings}</h1>

      <div class="home-text">
        <p>{data.text}</p>
      </div>
    </Loading>
  </div>
</Transition>
