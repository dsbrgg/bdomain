<script>
  export let first = false;
  export let last = false;

  export let company;
  export let job;
  export let timeSpan;
  export let description;
  export let tech;
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
    flex-direction: column;
    justify-content: center;
    border-radius: 0.5em;
    box-shadow: 1px 2px 10px 1px;
    padding: 1em;
    width: 20%;
    height: 10em; 
  }

  .experience-general::after {
    background-image: url("../seegno-logo-min.jpeg");
    background-size: 7em;
    background-repeat: no-repeat;
    background-position: center center;
    opacity: 0.4;
  }

  .experience-general-info {
    align-self: center;
  }

  .experience-name {
    margin-top: 0.1em;
  }

  .experience-description {
    align-self: center;
    margin-left: 4em;
    width: 80%;
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
      margin: auto;
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
    <div class="experience-general-info">
      <h3 class="experience-name">{company}</h3>
      <div>{job}</div>
      <div>{timeSpan}</div>
    </div>
  </div> 
 
  <div class="experience-description">
    <div class="experience-description-main">{description}</div>
    <hr />
    <div class="experience-description-tech">
      <b>Technologies used:</b> 
      <span class="experience-description-tech-label">{tech}</span>
    </div>
  </div>   
</div>
{#if last}
  <hr />
{/if}
