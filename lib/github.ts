import { AllReposQuery, AllReposQueryVariables, PagedManifestsQuery, PagedManifestsQueryVariables, ManifestFragment, RepositoryFragment } from './generated/graphql.ts';
import { allReposQuery, pagedManifestsQuery } from './github.queries.ts';



export const fetchAllData = async (apiKey: string, organization: string): Promise<RepositoryFragment[]> => {
  console.log(`Fetching all data for ${organization}`)
  const repos: RepositoryFragment[] = []
  let hasNextPage = true;
  let after: string | null = null;
  while (hasNextPage){

    const data = (await executeAllReposQuery(apiKey, {first: 10, login: organization, after,})) as AllReposQuery | null;

    const reposPage = data?.organization?.repositories

    if (!reposPage) 
      continue;
    

    const edges = reposPage.edges || [];

    if (!reposPage.edges) {
      break; 
    }
    hasNextPage = reposPage.pageInfo.hasNextPage;
    if (edges.length === 0) {
      break;
    }

    after = edges[edges.length -1]?.cursor || null;

    for (const r of (reposPage.edges || [])) {
      console.log(`Processing: ${r?.node?.nameWithOwner}`)
      if (r?.node?.dependencyGraphManifests?.pageInfo.hasNextPage) {
        repos.push({
          ...r.node, 
          dependencyGraphManifests: {
            ...r.node.dependencyGraphManifests,
            nodes: await fetchAllManifestsRepo(
              apiKey, 
              organization, 
              r.node.name, 
              r.node.dependencyGraphManifests.totalCount
            )
          },
        })
      }
      else if (r?.node) {
        repos.push(r.node)
      }
    }

  }
  return repos;
}

const fetchAllManifestsRepo = async (apiKey: string, login: string, repoName: string, nManifests: number): Promise<ManifestFragment[]> => {
  let count = 0;
  const manifests: {[name: string]: ManifestFragment} = {};
  while (count < nManifests) {
    console.log(`  ${repoName}: Fetching extra data.`)
    const d = await executePagedManifestsQuery(apiKey, {first: 5, after: null, login, repoName});
    const nodes =  d?.organization?.repository?.dependencyGraphManifests?.nodes;
    if (nodes) {
      for (const node of nodes) {
        if (node) {
          manifests[node.id] = node
          count += 1
        }
      }
    }
    else {
      break;
    }

  }
  return Object.values(manifests);
}



interface Variables {
  [name: string]: number | string | null
}

const executeQuery = async (query: string, apiKey: string, variables: Variables) => {
  
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST', 
    headers: [
      ['Content-Type', 'application/json'],
      ['Accept', 'application/vnd.github.hawkgirl-preview+json'],
      ['Authorization', `Bearer ${apiKey}`],
    ],
    body: JSON.stringify({ query, variables }),
  });
  return await r.json();
}



export const executeAllReposQuery = async (apiKey: string, variables: AllReposQueryVariables): Promise<AllReposQuery> => {
  return (await executeQuery(allReposQuery, apiKey, variables)).data
}



export const executePagedManifestsQuery = async (apiKey: string, variables: PagedManifestsQueryVariables): Promise<PagedManifestsQuery> => {
  return (await executeQuery(pagedManifestsQuery, apiKey, variables)).data
}
