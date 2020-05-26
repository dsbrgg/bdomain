<script>
	import { onMount } from "svelte";
  import p5 from 'p5';

	export let sketch;

	onMount(function() {
	  new p5(sketch, 'bg-canvas');
	});
</script>

<style>
</style>

<div id='bg-canvas'></div>
