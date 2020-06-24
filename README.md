
# github_dep_scanner

## Installation

Depends on Deno, which is a single file TypeScript interpreter.  To install on MacOS:

```bash
brew install deno
```

## Running

### List dependencies
```
Description:
List dependencies to the console

Command Usage:
list {Options}

Required Options:
-u, --org 	 The github organization to look at the repositories of
-u, --token 	 Your personal Github command line access token

Options:
-h --help 	 Help Screen
-t, --type 	 Filter dependencies to only a specified type.  Eg. NPM (yarn, npm) or PIP (poetry, pipenv, pip, etc)
-p, --package 	 Specify a single package to filter to.  Eg. django
```

### Export dependencies
```
Description:
Export dependencies to a CSV file

Command Usage:
export {Options}

Required Options:
-u, --org 	 The github organization to look at the repositories of
-u, --token 	 Your personal Github command line access token
-o, --outfile 	 For export, the file to save the CSV to

Options:
-h --help 	 Help Screen
-t, --type 	 Filter dependencies to only a specified type.  Eg. NPM (yarn, npm) or PIP (poetry, pipenv, pip, etc)
-p, --package 	 Specify a single package to filter to.  Eg. django
```

## Example commands

```bash
# List everything
deno run --allow-net=api.github.com https://raw.githubusercontent.com/humphrey/github-dep-scanner/master/github_dep_scanner.ts list --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# List the django version used in every prodeuct
deno run --allow-net=api.github.com https://raw.githubusercontent.com/humphrey/github-dep-scanner/master/github_dep_scanner.ts list --type=PIP --package=django --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# Export all Python dependencies to a CSV
deno run --allow-write --allow-net=api.github.com https://raw.githubusercontent.com/humphrey/github-dep-scanner/master/github_dep_scanner.ts export --type=PIP --outfile=pipdeps.csv --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# Export all NPM dependencies to a CSV
deno run --allow-write --allow-net=api.github.com https://raw.githubusercontent.com/humphrey/github-dep-scanner/master/github_dep_scanner.ts export --type=NPM --outfile=npmdeps.csv --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN
```
