<script>
	import { onMount } from "svelte";

	export let sketch;
	
  onMount(function() {
	  new p5(sketch, 'bg-canvas');
	});
</script>

<style>
  #bg-canvas {
    height: 100%;
  }
</style>

<div id='bg-canvas'></div>
