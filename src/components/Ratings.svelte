<script>
  export let ratings;
</script>

<style>
</style>

<span>
  {#each Array(ratings) as _}
    <i class="fas fa-star"></i>
  {/each}
</span>
