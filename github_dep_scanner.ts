import { parse } from "https://deno.land/std/flags/mod.ts";
import { writeCSV } from "https://deno.land/x/csv@v0.3.1/mod.ts";

const defaultArgs = {
  type: undefined as 'PIP' | 'NPM' | undefined,
  package: undefined as string | undefined,
  outfile: 'dependencies.csv' as string,
  org: 'datalivesoftware',
  token: ''
}

const usage = `Usage: deno github_dep_scanner list|export [--type=PIP|NPM] [--package=NAME] [--outfile=FILENAME] --org=ORGNAME --token=GITHUB_ACCESS_TOKEN`

const parseArgs = () => {
  const p = parse(Deno.args, { default: defaultArgs });
  const a = {
    action: (p._.length > 0 ? p._[0] : 'list') || 'list' as 'list' | 'export',
    type: p.type as 'PIP' | 'NPM' | undefined,
    package: p.package as string | undefined,
    outfile: p.outfile as string,
    org: p.org as string,
    token: p.token as string,
  }
  if (!(a.action === 'list' || a.action === 'export')) {
    console.error(`"${a.action}" is not a valid action.  Must be "list" or "export".`)
    console.error(usage)
    Deno.exit(1)
  }
  if (a.type && !(a.type === 'PIP' || a.type === 'NPM')) {
    console.error(`"${a.type}" is not a valid type. Must be "PIP" or "NPM".`)
    console.error(usage)
    Deno.exit(1)
  }
  return a
}
const args = parseArgs()


// A GraphQL query that will fetch dependency graphs for all projects
const query = `
query ($login: String!) {
  organization(login: $login) {
    name,
    repositories(first:100) {
      totalCount
      pageInfo{hasNextPage}
      edges {
        node {
          nameWithOwner
          dependencyGraphManifests (last: 20) {
            totalCount
            nodes {
              filename
              dependenciesCount
              dependencies {
                nodes {
                  packageName
                  packageManager
                  requirements
                }
              }
            }
          }
        }
      }
    }
  }
}
`
type PackageManger = 'NPM' | 'PIP' | 'NONE'

interface Dependency {
  packageName: string,
  packageManager: PackageManger,
  requirements: string,
}

interface DependencyGraphManifest {
  filename: string
  dependenciesCount: number;
  dependencies: {
    nodes: Dependency[]
  }
}

interface Repository {
  nameWithOwner: string,
  dependencyGraphManifests: {
    totalCount: number
    nodes: DependencyGraphManifest[],
  }
}

interface ApiResult {
  data: {
    organization: {
      name: string,
      repositories: {
        totalCount: number,
        pageInfo: { hasNextPage: boolean },
        edges: {node: Repository}[]
      }
    }
  }
}


interface ParsedDependencies {
  name: string;
  dependencies: {
      [key: string]: string;
  };
  packageManager: PackageManger;
}


const fetchData = async () => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST', 
    headers: [
      ['Content-Type', 'application/json'],
      ['Accept', 'application/vnd.github.hawkgirl-preview+json'],
      ['Authorization', `Bearer ${args.token}`],
    ],
    body: JSON.stringify({query, variables: {login: args.org}}),
  })
  return await r.json() as ApiResult;
}

const parseDependencies = (dependencies: Dependency[]) => {
  const byName = {} as {[key:string]: string}
  for (var d of dependencies) {
      byName[d.packageName.toLocaleLowerCase()] = d.requirements
  }
  return byName
}

const parseRepo = (repo: Repository): ParsedDependencies[] => {
  return repo.dependencyGraphManifests.nodes.map(m => ({
    name: `${repo.nameWithOwner}/${m.filename}`,
    dependencies: parseDependencies(m.dependencies.nodes),
    packageManager: m.dependencies.nodes.length > 0 ? m.dependencies.nodes[0].packageManager : 'NONE'
  }))
}

const parseData = (data: ApiResult): ParsedDependencies[] => {
  return data.data.organization.repositories.edges
    .map(pr => parseRepo(pr.node))
    .flat()
    .sort((a,b) => a.name.localeCompare(b.name))
}



const fetchAndProcessData = async () => {
  let d = parseData(await fetchData())
  if (args.type){
    d = d.filter(dp => dp.packageManager == args.type)
  }
  return d
}


console.log('Fetching dependency data from github. (this usually takes about 7 seconds)')
const data = await fetchAndProcessData();



if (args.action === 'list') {
  if (args.package) {
    console.log(`Projects that depend on ${args.package}:`)
    for (var repo of data) {
      console.log(`${repo.name} ${repo.dependencies[args.package.toLocaleLowerCase()] || 'NONE'}`)
    }
  }
  else {
    console.log(data)
  }
}


if (args.action === 'export') {
  console.log(`Exporting data to ${args.outfile} ...`)
  const rows = [] as string[][];
  if (args.package) {
    console.error('NOT IMPLEMENTED')
  }
  else {
    const pkgKeys = [...new Set(data.map(dp => Object.keys(dp.dependencies)).flat())].sort();
    let row = ['Repository', ...pkgKeys];
    rows.push(row)
    for (var repo of data) {
      row = [repo.name, ...(new Array(pkgKeys.length)).fill('')];
      for (var dep in repo.dependencies) {
        row[pkgKeys.indexOf(dep) + 1] = repo.dependencies[dep]
      }
      rows.push(row)
    }
  }

  const f = await Deno.open(args.outfile, { write: true, create: true, truncate: true });

  await writeCSV(f, rows);
  
  f.close()
}
