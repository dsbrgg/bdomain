<script>
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { Router } from 'svelte-routing';

  import Content from 'containers/content/Content.svelte';
  import Background from 'containers/background/Background.svelte';

  export let url;
  export let client;
  export let saveFile;
  export let mainInfo = {};
  export let experience = [];
  export let education = [];
  export let skills = [];

  const store = writable({ 
    client,
    saveFile,
    mainInfo, 
    experience,
    education,
    skills
  });
  
  setContext('initialState', store);
</script>

<Router url="{url}">
  <Background />
  <Content  saveFile={saveFile} /> 
</Router>
