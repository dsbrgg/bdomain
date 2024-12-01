<script>
    export let first = false;
    export let last = false;

    export let data;
</script>

<style>
.technology-title {
    display: inline-block;
    font-weight: bold;
    font-size: 1.5em;
    text-decoration-line: underline;
}

.technology-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 1em 0em 2em 5.2em;
    width: 90%;
}

.technology-description-title {
    display: inline-block;
    font-size: 1.5em;
    text-decoration-line: underline;
    margin-bottom: 1em;
}

.technology-description-list {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    list-style-type: none;
    border: 0.1em dashed black;
    margin: 1em;
    padding: 1em;
}

.technology-description-list-item {
    text-align: center;
    margin-bottom: 0.5em;
}
</style>

<span class="technology-title">Technologies</span>
<div class="technology-container"> 
    {#each data as technology}
    <ul class="technology-description-list">
        <span class="technology-description-title">{technology.description}</span>
        {#each technology.options as option}
            <li class="technology-description-list-item">{option}<li/>
        {/each}
    </ul>
    {/each}
</div>
<hr />
