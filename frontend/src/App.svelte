<script>
  import { Router } from "svelte-routing";
  import Content from 'containers/content/Content.svelte';
  import Background from 'containers/background/Background.svelte';
</script>

<Router>
  <Background />
  <Content /> 
</Router>
