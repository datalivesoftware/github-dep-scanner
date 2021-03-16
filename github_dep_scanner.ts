import Denomander from "https://deno.land/x/denomander@0.6.2/mod.ts";
import { writeCSV } from "https://deno.land/x/csv@v0.5.1/mod.ts";


// Set up the program and options 
const program = new Denomander({
    app_name: "github_dep_scanner",
    app_description: "Scans your dependabot github dependencies across all your repositories",
    app_version: "1.1.0"
  }) 

program
  .command("list", "List dependencies to the console")
    .requiredOption("-u, --org", "The github organization to look at the repositories of")
    .requiredOption("-u, --token", "Your personal Github command line access token")
    .option("-t, --type", "Filter dependencies to only a specified type.  Eg. NPM (yarn, npm) or PIP (poetry, pipenv, pip, etc)")
    .option("-p, --package", "Specify a single package to filter to.  Eg. django")
  .command("export", "Export dependencies to a CSV file")
    .requiredOption("-u, --org", "The github organization to look at the repositories of")
    .requiredOption("-u, --token", "Your personal Github command line access token")
    .option("-t, --type", "Filter dependencies to only a specified type.  Eg. NPM (yarn, npm) or PIP (poetry, pipenv, pip, etc)")
    .option("-p, --package", "Specify a single package to filter to.  Eg. django")
    .requiredOption("-o, --outfile", "For export, the file to save the CSV to")
  .parse(Deno.args)


// Set default options and specify types of options
const options = {
  org: (program.org || 'datalivesoftware') as string,
  token: program.token as string,
  type: program.type as string | undefined,
  package: program.package as string | undefined,
  outfile: program.outfile as string| undefined,
}


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

// Specify types of API result to assist in future code
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


// Methods for fetching and processing the github api data

const fetchData = async () => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST', 
    headers: [
      ['Content-Type', 'application/json'],
      ['Accept', 'application/vnd.github.hawkgirl-preview+json'],
      ['Authorization', `Bearer ${program.token}`],
    ],
    body: JSON.stringify({query, variables: {login: program.org}}),
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
  if (program.type){
    d = d.filter(dp => dp.packageManager === program.type)
  }
  return d
}


// And fetch all the data
console.log('Fetching dependency data from github. (this usually takes about 7 seconds)')
const data = await fetchAndProcessData();


// Listing dependencies
if (program.list) {
  if (options.package) {
    console.log(`Projects that depend on ${options.package}:`)
    for (var repo of data) {
      console.log(`${repo.name} ${repo.dependencies[(options.package || '').toLocaleLowerCase()] || 'NONE'}`)
    }
  }
  else {
    console.log(data)
  }
}


// Exporting dependencies
if (program.export && options.outfile) {
  
  console.log(`Exporting data to ${options.outfile} ...`)
  const rows = [] as string[][];
  if (options.package) {
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

  const f = await Deno.open(options.outfile, { write: true, create: true, truncate: true });

  await writeCSV(f, rows);
  
  f.close()
}
