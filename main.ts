import Denomander from "https://deno.land/x/denomander@0.9.1/mod.ts";
import { writeCSV } from "https://deno.land/x/csv@v0.7.2/mod.ts";
import { fetchAndProcessData, exportToCSV } from './lib/index.ts';

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



// And fetch all the data
console.log('Fetching dependency data from github. (this usually takes about 7 seconds)')
const data = await fetchAndProcessData(options.token, options.org, options.type || null);


// Listing dependencies
if (program.list) {
  if (options.package) {
    console.log(`Projects that depend on ${options.package}:`)
    for (var repo of data) {
      console.log(`${repo.dependencies[(options.package || '').toLocaleLowerCase()] || 'NONE'} ${repo.name}`)
    }
  }
  else {
    console.log(data)
  }
}


// Exporting dependencies
if (program.export && options.outfile) {
  
  if (options.package) {
    console.error('NOT IMPLEMENTED')
  }
  else {
    await exportToCSV(data, options.outfile);
  }
}