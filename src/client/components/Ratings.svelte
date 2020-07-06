<script>
  export let ratings;
  
  const total = Array(5);
</script>

<style>
</style>

<span>
  {#each total as _, i}
    {#if i <= ratings}
      <i class="fas fa-star"></i>
    {/if}

    {#if i > ratings}
      <i class="far fa-star"></i>
    {/if}
  {/each}
</span>
