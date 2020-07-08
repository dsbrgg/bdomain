<script>
  export let large;
  export let condition;
  export let component;
  export let loadParams = {};

  $: console.log('condition change', condition)
</script>

<style>
  .container {
    display: flex;
    justify-content:center;
    width: 100%;
    height: 100%;
  }

  .center {
    align-self: center;
  }

  .large {
    font-size: xxx-large;
  }

  .rotate {
    animation-name: spin;
    animation-duration: 5000ms;
    animation-iteration-count: infinite;
    animation-timing-function: linear; 
  }

  @keyframes spin {
    from {
      transform:rotate(0deg);
    }
    to {
      transform:rotate(360deg);
    }
  }
</style>

{#if !condition && condition !== undefined}
  <div class="container">
    <i 
      class="fas fa-spinner rotate center"
      class:large="{large}"
    ></i>
  </div>
{:else}
  {#if component}
    <svelte:component this="{component}" {...loadParams} />
  {:else}
    <slot></slot>
  {/if}
{/if}
