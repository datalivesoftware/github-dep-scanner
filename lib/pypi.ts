
// Global cache to store version data by package
const packageCache: Record<string, string[]> = {};

// Function to fetch all versions of a package from PyPI
async function fetchPackageVersions(packageName: string): Promise<string[]> {
  const url = `https://pypi.org/pypi/${packageName}/json`;
  const response = await fetch(url);
  const data = await response.json();
  return Object.keys(data.releases);
}

// Function to get all versions of a package, utilizing cache if available
async function getAllVersions(packageName: string): Promise<string[]> {
  if (!packageCache[packageName]) {
    const versions = await fetchPackageVersions(packageName);
    // Sort versions in descending order and cache them
    packageCache[packageName] = versions.sort((a, b) =>compareVersions (b,a));
  }
  return packageCache[packageName];
}

// Function to extract major version from a full version string
function getMajorFromVersion(version: string): number {
    return parseInt(version.split('.')[0], 10);
  }

// Helper function to check if a version is a stable release (no alpha, beta, rc)
function isStableVersion(version: string): boolean {
    return !version.includes('a') && !version.includes('b') && !version.includes('rc');
  }
  

// Function to compare two semantic version strings
function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
  
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

// Function to get the latest version for each major version
async function getLatestMajorVersions(packageName: string): Promise<Record<number, string>> {
  const versions = await getAllVersions(packageName);

  const latestMajorVersions: Record<number, string> = {};

  versions.forEach(version => {
    const majorVersion = getMajorFromVersion(version);
    if (isStableVersion(version) && !latestMajorVersions[majorVersion]) {
      latestMajorVersions[majorVersion] = version;
    }
  });

  return latestMajorVersions;
}

// Function to get the latest version for a specific major version
export async function getLatestMajorVersion(packageName: string, majorVersion: number): Promise<string | undefined> {
  const majorVersions = await getLatestMajorVersions(packageName);
  return majorVersions[majorVersion];
}

// Function to get the latest version of the same major as the provided version
export async function getLatestSemanticVersion(packageName: string, currentVersion: string): Promise<string | undefined> {
  const majorVersion = getMajorFromVersion(currentVersion);
  return getLatestMajorVersion(packageName, majorVersion);
}
