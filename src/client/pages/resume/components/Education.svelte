<script>
  export let logo;
  export let institute;
  export let course;
  export let timeSpan;
  export let description;
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
    flex-direction: column;
    justify-content: center;
    border-radius: 0.5em;
    box-shadow: 1px 2px 10px 1px;
    padding: 1em;
    width: 20%;
    height: 10em;
  }

  .education-general-logo {
    width: 100%;
    height: 100%;
    margin-bottom: 1em;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: contain;
  }

  .education-isla-logo {
    background-image: url("https://res.cloudinary.com/crazynoiainc/image/upload/v1594067045/isla-logo-min_wm5uzq.png");
  }

  .education-uol-logo {
    background-image: url("https://res.cloudinary.com/crazynoiainc/image/upload/v1611581594/uol-logo-min_i5bo4w.png");
  }

  .education-general-info {
    align-self: center;
  }

  .education-name {
    margin-top: 0.1em;
  }

  .education-description {
    align-self: center;
    margin-left: 4em;
    width: 80%;
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
    <div class="education-general-logo {logo}" />
    <div class="education-general-info">
      <h3 class="education-name">{institute}</h3>
      <div>{course}</div>
      <div>{timeSpan}</div>
    </div> 
  </div> 
 
  <div class="education-description">
    <div class="education-description-main">{description}</div>
  </div> 
</div>
{#if last}
  <hr />
{/if}
