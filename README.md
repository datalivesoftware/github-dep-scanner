
# github_dep_scanner

```bash
## Install Deno (if not installed)
brew install deno

# List everything
deno run --allow-net=api.github.com github_dep_scanner.ts list --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# List the django version used in every prodeuct
deno run --allow-net=api.github.com github_dep_scanner.ts list --type=PIP --package=django --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# Export all Python dependencies to a CSV
deno run --allow-write --allow-net=api.github.com github_dep_scanner.ts export --type=PIP --outfile=pipdeps.csv --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN

# Export all NPM dependencies to a CSV
deno run --allow-write --allow-net=api.github.com github_dep_scanner.ts export --type=NPM --outfile=npmdeps.csv --org=datalivesoftware --token=MY_PERSONAL_GITHUB_ACCESS_TOKEN
```
