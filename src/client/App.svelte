<script>
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { Router } from 'svelte-routing';

  import Content from 'containers/content/Content.svelte';
  import Background from 'containers/background/Background.svelte';

  export let url;
  export let client;
  export let saveFile;
  export let blog;
  export let resume;
  export let home;

  const store = writable({ 
    client,
    saveFile,
    blog,
    resume,
    home
  });
  
  setContext('initialState', store);
</script>

<Router url="{url}">
  <Background />
  <Content  saveFile={saveFile} /> 
</Router>
