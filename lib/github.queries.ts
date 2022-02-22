
const manifestFragment = /* GraphQL */ `
fragment Manifest on DependencyGraphManifest {
  id
  filename
  dependenciesCount
  dependencies {
    nodes {
      ...Dependency
    }
  }
}
fragment Dependency on DependencyGraphDependency {
  packageName
  packageManager
  requirements
}
`;

const repoFragment = /* GraphQL */ `
fragment Repository on Repository {
  name
  nameWithOwner
  dependencyGraphManifests (withDependencies: true, first: 2) {
    totalCount
    pageInfo { hasNextPage }
    nodes { ... Manifest }
  }
}
`;

export const allReposQuery = /* GraphQL */ `

query AllRepos ($login: String!, $first: Int!, $after: String) {
  organization(login: $login) {
    name,
    repositories(first: $first, after: $after) {
      totalCount
      pageInfo{hasNextPage}
      edges {
        cursor
        node {
          ...Repository
        }
      }
    }
  }
}
${repoFragment}
${manifestFragment}
`;


export const pagedManifestsQuery = /* GraphQL */ `
query PagedManifests ($login: String!, $repoName: String! $after: String, $first: Int!) {
  organization(login: $login) {
    name,
		repository(name: $repoName) {
      name
			nameWithOwner
			dependencyGraphManifests (first: $first, after: $after) {
        totalCount
        pageInfo { hasNextPage }
        nodes { ...Manifest }
			}
		}
  }
}
${manifestFragment}
`;

