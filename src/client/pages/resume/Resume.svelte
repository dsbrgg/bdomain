<script>
  import { getContext, onMount, onDestroy } from 'svelte';
  import Transition from 'components/Transition.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';
  import Experience from 'pages/resume/components/Experience.svelte';
  import Education from 'pages/resume/components/Education.svelte';
  import Skills from 'pages/resume/components/Skills.svelte';

  export let location;
  export let saveFile = false;

  let data;
  let loading;

  const store = getContext('initialState');

  const mount = async () => {
    const { 
      client,
      mainInfo, 
      experience,
      education, 
      skills 
    } = data;

    // yuck :(
    if (
      !Object.keys(mainInfo).length
      || !experience.length 
      || !education.length 
      || !skills.length
    ) { 
      const headers = { 'X-State': '/resume' };
      const response = await fetch(`${client.api}/resume`, { headers });
      const state = await response.json();

      $store = { ...store, ...state }; 
    }
  };

  const handleClick = async () => {
    if (loading) { return; }

    const { client } = data;
  
    loading = true;

    const response = await fetch(`${client.api}/pdf/download`);
    const pdf = await response.blob();
    const [ _, filename ] = response.headers.get('Content-Disposition').match(/filename=(.*)/);

    loading = false;

    download(pdf, filename);
  };

  const unsubscribe = store.subscribe(({ 
    client,
    mainInfo, 
    experience,
    education,
    skills
  }) => { 
    data = {
      client,
      mainInfo,
      experience,
      education,
      skills
    }; 
  });
  
  onMount(mount);
  onDestroy(unsubscribe);
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
        {#if loading}
          <i class="fas fa-spinner rotate"></i>
        {/if}
        {#if !loading}
          Download me!
        {/if}
      </button> 
    {/if}
  </div> 
</Transition>
