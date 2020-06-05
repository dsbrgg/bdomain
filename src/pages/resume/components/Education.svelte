<script>
  export let first = false;
  export let last = false;
</script>

<style>
  .education-title {
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

  .education-container {
    display: flex;
    margin-top: 2em; 
    margin-left: 4em;
    margin-right: 4em;
    margin-bottom: 4em;
  }

  .education-general {
    display: flex;
    box-shadow: 1px 2px 10px 1px;
    flex-direction: column;
    padding: 1em;
    width: 20em;
  }

  .education-name {
    margin-top: 0.1em;
  }

  .education-description {
    align-self: center;
    margin-left: 4em;
  }

  .education-description-main {
    margin-bottom: 1em;
  }

  .education-description-tech {
    margin-top: 1em;
  }

  .education-description-tech-label {
    font-weight: 100;
  }

  @media (max-width: 500px), (max-height: 800px) {
    .education-container {
      display: flex;
      flex-direction: column;
      margin-left: 4em;
      margin-right: 4em;
      margin-bottom: 4em;
    }

    .education-general {
      width: 7em;
      margin: auto;
    }

    .education-description {
      margin-left: 0em;
      margin-top: 2em;
    }

    .education-description-main {
      padding-bottom: 1em;
      border-bottom: #000000 solid 0px;
    }
  }
</style>

{#if first}
  <span class="education-title">Education</span>
{/if}
<div class="education-container">
  <div class="education-general">
    <h3 class="education-name">ISLA</h3>
    <span>Web Development</span>
    <span>Sep|2017 - Incomplete</span>
  </div> 
 
  <div class="education-description">
    <div class="education-description-main">
      Huge description to make sure you understand I'm great and you should really hire me.
      Just trying a simple text to see how much this can handle right here.
    </div>
    <hr />
    <div class="education-description-tech">
      <b>Technologies used:</b> 
      <span class="education-description-tech-label">
        tech1, tech2, tech3, tech4
      </span>
    </div>
  </div> 
</div>
{#if last}
  <hr />
{/if}
