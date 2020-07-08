export default async ({ client, state }) => {
  const headers = { 'X-State': `/${state}` };
  const response = await fetch(`${client.api}/${state}`, { headers });

  return response.json();
};
