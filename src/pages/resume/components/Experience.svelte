<script>
  export let first = false;
  export let last = false;
</script>

<style>
  .experience-title {
    display: inline-block;
    font-weight: bold;
    font-style: italic;
    font-size: 1.5em;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
    border-bottom: #000000 solid 1px;
    color: darkgoldenrod;
  }

  .experience-container {
    display: flex;
    margin-top: 2em;
    margin-left: 4em;
    margin-right: 4em;
    margin-bottom: 4em;
  }

  .experience-general {
    display: flex;
    box-shadow: 1px 2px 10px 1px;
    flex-direction: column;
    padding: 1em;
    width: 20em;
  }

  .experience-description {
    align-self: center;
    margin-left: 4em;
  }

  .experience-description-main {
    margin-bottom: 1em;
  }

  .experience-description-tech {
    margin-top: 1em;
  }

  .experience-description-tech-label {
    font-weight: 100;
  }

  @media (max-width: 500px), (max-height: 800px) {
    .experience-container {
      display: flex;
      flex-direction: column;
      margin-left: 4em;
      margin-right: 4em;
      margin-bottom: 4em;
    }

    .experience-general {
      width: 7em;
    }

    .experience-description {
      margin-left: 0em;
      margin-top: 2em;
    }

    .experience-description-main {
      padding-bottom: 1em;
      border-bottom: #000000 solid 0px;
    }
  }
</style>

{#if first}
  <span class="experience-title">Experience</span>
{/if}
<div class="experience-container"> 
  <div class="experience-general">
    <h3>Seegno</h3>
    <span>Backend Engineer</span>
    <span>Oct|2019 - Present</span>
  </div> 
 
  <div class="experience-description">
    <div class="experience-description-main">
      Huge description to make sure you understand I'm great and you should really hire me.
      Just trying a simple text to see how much this can handle right here.
    </div>
    <hr />
    <div class="experience-description-tech">
      <b>Technologies used:</b> 
      <span class="experience-description-tech-label">
        tech1, tech2, tech3, tech4
      </span>
    </div>
  </div>   
</div>
{#if last}
  <hr />
{/if}
