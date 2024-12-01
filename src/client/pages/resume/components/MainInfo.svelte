<script>
  export let name;
  export let location;
  export let email;
  export let description;
</script>

<style>
  .main-info-container {
    margin: 2em; 
  }

  .main-info-data {
    margin-bottom: 1em;
  }

  .main-info-data a {
    color: inherit;
  }

  #main-info-name {
    font-family: 'Shadows Into Light', cursive;
    font-size: 3em;
    font-style: italic;
  }

  .main-info-description {
    margin-top: 1em;
    margin-bottom: 1em;
    margin-left: 4em;
    margin-right: 4em;
  }

  @media (max-width: 500px), (max-height: 800px) {
    .main-info-description {
      margin-top: 1em;
      margin-bottom: 1em;
      margin-left: 0em;
      margin-right: 0em;
    }
  }
</style>

<div class="main-info-container">
  <div class="main-info-data">
    <h2 id="main-info-name">{name}</h2>
    <span>{location}</span>
    <span>//</span>
    <a href="https://github.com/dsbrgg">https://github.com/dsbrgg</a>
    <span>//</span>
    <span>{email}</span>
  </div>

  <hr />

  <div class="main-info-description">
    <span>{description}</span>
  </div>

  <hr />
</div>
