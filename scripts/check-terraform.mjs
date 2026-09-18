/**
 * Replays the CI `lint-terraform` job locally, at the same Terraform version, through the
 * pinned image of `scripts/terraform.mjs`:
 *
 *   - `terraform fmt -check -diff -recursive` on the whole `infra/terraform/` tree;
 *   - for every root module of `infra/terraform/environments/`, `init -backend=false
 *     -lockfile=readonly` then `validate`.
 *
 * Neither step reaches GCP: the backend is skipped, the working directory is the gate's own
 * (see `isolatedDataDir` in terraform.mjs), and validation only needs the provider schemas,
 * served from the plugin cache after the first run. The lock file is read-only here on
 * purpose: a provider bumped in `versions.tf` without its checksums in `.terraform.lock.hcl`
 * would let two machines validate against two different provider builds; the gate refuses it
 * and says which file to regenerate (`pnpm run terraform -- providers lock`).
 *
 * The roots are discovered, never listed: a second environment added later and forgotten in a
 * list would escape the gate without anything saying so.
 */
import { dockerAvailable, fail, listRoots, terraform, TERRAFORM_DIR } from './terraform.mjs';

if (!dockerAvailable()) {
  fail(
    'Docker is required for this gate: Terraform runs from its pinned image. Start Docker Desktop and run again.'
  );
}

const roots = listRoots();
if (roots.length === 0) {
  fail(`No root module found under ${TERRAFORM_DIR}/environments/.`);
}

console.log(`terraform fmt on ${TERRAFORM_DIR}/`);
if (terraform(['fmt', '-check', '-diff', '-recursive']).status !== 0) {
  fail('terraform fmt reported files to format: run `pnpm run terraform -- fmt -recursive`.');
}

for (const rootName of roots) {
  console.log(`terraform validate on environments/${rootName}`);
  const options = { rootName, isolatedDataDir: true };
  const init = terraform(
    ['init', '-backend=false', '-input=false', '-lockfile=readonly', '-no-color'],
    options
  );
  if (init.status !== 0) {
    fail(
      `terraform init failed on environments/${rootName} (output above). An out-of-date lock file is fixed by \`pnpm run terraform -- --root ${rootName} providers lock\`, then commit .terraform.lock.hcl.`
    );
  }
  if (terraform(['validate', '-no-color'], options).status !== 0) {
    fail(`terraform validate reported errors on environments/${rootName}.`);
  }
}

console.log(`\x1b[32m✓\x1b[0m Terraform: formatted, and ${roots.length} root module(s) valid.`);
