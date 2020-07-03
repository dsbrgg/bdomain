<script>
  import { getContext, onMount, onDestroy } from 'svelte';
  import Transition from 'components/Transition.svelte';
  import MainInfo from 'pages/resume/components/MainInfo.svelte';
  import Experience from 'pages/resume/components/Experience.svelte';
  import Education from 'pages/resume/components/Education.svelte';
  import Skills from 'pages/resume/components/Skills.svelte';

  export let location;

  let data;

  const store = getContext('initialState');
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

  
  onDestroy(unsubscribe);

  onMount(async () => {
    const { 
      client,
      mainInfo, 
      experience,
      education, 
      skills 
    } = data;

    if (
      !mainInfo.length 
      || !experience.length 
      || !education.length 
      || !skills.length
    ) {
      const headers = { 'X-State': '/resume' };
      const response = await fetch(`${client.api}/resume`, { headers });
      const state = await response.json();

      store.update(st => ({ ...st, ...state })); 
    }
  });
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
  <button>Download me!</button>
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
