<script>
  import { getContext, onMount, onDestroy } from 'svelte';
  import fetchState from 'api/index.js';
  import Transition from 'components/Transition.svelte';
  import Loading from 'components/Loading.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';
  import Experience from 'pages/resume/components/Experience.svelte';
  import Education from 'pages/resume/components/Education.svelte';
  import Skills from 'pages/resume/components/Skills.svelte';

  export let location;
  export let saveFile = false;

  let error;
  let needState;
  let downloadingPdf;
  let data = { 
    init: false,
    mainInfo: {}, 
    experience: [], 
    education: [], 
    skills: [] 
  };

  const store = getContext('initialState');
  
  const mount = async () => {
    const { client, resume } = $store;

    if (!resume) { 
      const state = 'resume';
      const response = await fetchState({
        client,
        state 
      });

      $store = { ...$store, ...response }; 
    }

    data = { ...$store.resume, init: true };
  };

  const handleClick = async () => {
    if (downloadingPdf) { return; }

    const { client } = $store;
  
    error = false;
    downloadingPdf = true;

    try {
      const response = await fetch(`${client.api}/pdf/download`);
      const pdf = await response.blob();
      const [ _, filename ] = response.headers.get('Content-Disposition').match(/filename=(.*)/);

      download(pdf, filename);
    } catch (e) {
      // need to implement some sort of popup mechanism
      error = true;  
      console.log(e)
    }

    downloadingPdf = false;
  };
  
  onMount(mount);
</script>

<style>
  .resume-container {
    width: 100%;
    height: 100%;
  }

  .resume-download {
    width: 10em;
    height: 3em;
    margin-top: 2em;
    margin-bottom: 1em;
    border-radius: 0.5em;
    background-color: azure;
    border: 1px solid black;
    transition: box-shadow 0.5s;
  }

  .resume-download:hover {
    box-shadow: 4px 4px #000000;
  }

  .resume-download:focus {
    outline: 0;
  }

  .resume-loading {
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

  @media (max-width: 500px), (max-height: 800px) {
    .resume-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
  }
</style>

<Transition> 
  <div class="resume-container">
    <Loading condition={data.init} large={true}>
      <MainInfo {...data.mainInfo} />
      {#each data.experience as experience}
        <Experience {...experience} />
      {/each}
      {#each data.education as education}
        <Education {...education} />
      {/each}
      <Skills skills={data.skills} />
      
      {#if !saveFile}
        <button class="resume-download" on:click={handleClick}>
          <Loading condition={!downloadingPdf} >
            Download me!
          </Loading>
        </button> 
      {/if}
    </Loading>
  </div> 
</Transition>
