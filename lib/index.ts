import { DependencyFragment, RepositoryFragment } from './generated/graphql.ts';
import { fetchAllData } from './github.ts';
import { writeCSV } from "https://deno.land/x/csv@v0.7.2/mod.ts";

const parseDependencies = (dependencies: ReadonlyArray<DependencyFragment>) => {
  const byName = {} as {[key:string]: string}
  for (var d of dependencies) {
      byName[d.packageName.toLocaleLowerCase()] = d.requirements
  }
  return byName
}

interface ParsedDependencies {
  name: string;
  dependencies: {
      [key: string]: string;
  };
  packageManager: string;
  filename: string;
}

const parseRepo = (repo: RepositoryFragment): ParsedDependencies[] => 
  repo.dependencyGraphManifests?.nodes?.map(m => {
    if (m && m?.dependencies?.nodes) {
      const first = m.dependencies.nodes[0];
      return {
        name: `${repo.nameWithOwner}/${m?.filename}`,
        dependencies: parseDependencies(m.dependencies?.nodes as DependencyFragment[]),
        packageManager: first?.packageManager || 'NONE',
        filename: m?.filename || 'NONE',
      }
    }
    return {
      name: repo.nameWithOwner,
      dependencies: {},
      packageManager: 'NONE',
      filename: m?.filename || 'NONE',
    }
  }) || [];


const parseData = (data: RepositoryFragment[]): ParsedDependencies[] => {
  return data
    .map(pr => parseRepo(pr))
    .flat()
    .sort((a,b) => a.name.localeCompare(b.name))
}

export const fetchAndProcessData = async (token: string, org: string, pkgType: string | null, filename: string | null) => {
  let d = parseData(await fetchAllData(token, org))
  if (pkgType){
    d = d.filter(dp => dp.packageManager === pkgType)
  }
  if (filename) {
    d = d.filter(dp => dp.filename.endsWith(filename));
  }
  return d
}



export const exportToCSV = async (data: ParsedDependencies[], outfile: string) => {
  
  console.log(`Exporting data to ${outfile} ...`)
  const rows = [] as string[][];

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

  const f = await Deno.open(outfile, { write: true, create: true, truncate: true });

  await writeCSV(f, rows);
  
  f.close()
}
