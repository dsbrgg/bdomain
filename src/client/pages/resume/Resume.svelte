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
    const { client } = data;
    const response = await fetch(`${client.api}/pdf/download`);
    const pdf = await response.blob();
    const [ _, filename ] = response.headers.get('Content-Disposition').match(/filename=(.*)/);

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
  {#if !saveFile}
    <button on:click={handleClick}>Download me!</button>
  {/if}

  <div class="resume-container">
    <MainInfo {...data.mainInfo} />
    {#each data.experience as experience}
      <Experience {...experience} />
    {/each}
    {#each data.education as education}
      <Education {...education} />
    {/each}
    <Skills skills={data.skills} />
  </div>
</Transition>
