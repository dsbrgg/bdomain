<script>
  import Ratings from 'components/Ratings.svelte';

  export let skills;
</script>

<style>
  .skills-title {
    display: inline-block;
    font-weight: bold;
    font-style: italic;
    font-size: 1.5em;
    margin-top: 0.7em;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
    border-bottom: #000000 solid 1px;
    color: darkgoldenrod;
  }

  .skills-container {
    display: flex;
    margin-top: 1em; 
    margin-left: 4em;
    margin-right: 4em;
    margin-bottom: 4em;
    font-family: 'Fira Code', monospace;
    font-size: 1.2em;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    justify-content: center;
    height: 17em;
    width: 100%;
  }

  .skills-item {
    margin-top: 0.8em;
    margin-bottom: 0.5em; 
    font-size: 1.2em;
  }

  .skills-ratings {
    margin-bottom: 1.5em;
  }

  @media (max-width: 500px), (max-height: 800px) {
    .skills-container {
      display: flex;
      flex-direction: column;
      margin-left: 4em;
      margin-right: 4em;
      margin-bottom: 4em;
    }

    .skills-list {
      width: 100%;
    }
  }
</style>

<span class="skills-title">Skills</span>
<div class="skills-container">
  <div class="skills-list">
    {#each skills as { name, rating }}
      <div class="skills-item">{name}</div> 
      <div class="skills-ratings">
        <Ratings ratings={rating} />
      </div>
    {/each}
  </div>
</div>
<hr />
