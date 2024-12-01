<script>
  export let data;
</script>

<style>
  .education-title {
    display: inline-block;
    font-weight: bold;
    font-size: 1.5em;
    text-decoration-line: underline;
    margin-top: 0.7em;
  }

  .education-container {
    display: flex;
    justify-content: space-around;
    margin-top: 1em; 
    margin-left: 4em;
    margin-right: 4em;
    margin-bottom: 2em;
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
    background-image: url("../isla-logo-min.png");
  }

  .education-uol-logo {
    background-image: url("../uol-logo-min.png");
  }

  .education-general-info {
    align-self: center;
  }

  .education-name {
    margin-top: 0.1em;
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

<span class="education-title">Education</span>
<div class="education-container">
    {#each data as education}
      <div class="education-general">
        <div class="education-general-logo {education.logo}" />
        <div class="education-general-info">
          <h3 class="education-name">{education.institute}</h3>
          <div>{education.course}</div>
          <div>{education.timeSpan}</div>
        </div> 
      </div> 
    {/each}
</div>
<hr />
